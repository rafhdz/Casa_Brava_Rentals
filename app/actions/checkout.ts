"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/supabase/require-auth";
import { validateDates, hasOverlappingConfirmedReservation, OVERLAP_ERROR } from "@/lib/supabase/reservation-rules";
import { RESERVATION_REQUIRED_ERROR } from "@/lib/checkout-errors";
import type { CartItem } from "@/lib/cart-types";

type ActionResult = { success: true } | { error: string };

export type CheckoutStayInput = {
  check_in: string;
  check_out: string;
  fare_type_id: string;
};

// Código SQLSTATE de un `raise exception` de plpgsql sin errcode explícito.
// Las excepciones de book_spa_slot()/release_spa_booking() ya vienen
// redactadas en español y pensadas para el huésped, así que se muestran tal
// cual; cualquier otro error de Postgres (violación de constraint, fallo de
// cast, etc.) se reemplaza por un mensaje genérico para no filtrar texto
// interno de la base.
const PLPGSQL_RAISE_EXCEPTION = "P0001";

function spaErrorMessage(error: { code?: string; message: string } | null): string {
  if (error?.code === PLPGSQL_RAISE_EXCEPTION) return error.message;
  return "No se pudo reservar el servicio de spa. Vuelve a intentarlo.";
}

// Crea el registro maestro en `reservations` para el huésped autenticado —
// usado por ReservarForm ("Proceder al pago"). El carrito de servicios NO se
// toca aquí: se adjunta por separado vía checkoutCartServices desde /carrito
// (regla "estadía primero, servicios después", ver CLAUDE.md).
export async function checkoutStay(input: CheckoutStayInput): Promise<ActionResult> {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return { error: auth.error };

    const dateError = validateDates(input.check_in, input.check_out);
    if (dateError) return { error: dateError };

    const overlapCheck = await hasOverlappingConfirmedReservation(
      auth.supabase,
      input.check_in,
      input.check_out
    );
    if ("error" in overlapCheck) return { error: overlapCheck.error };
    if (overlapCheck.overlaps) return { error: OVERLAP_ERROR };

    const [{ data: fareType, error: fareTypeError }, { data: propertySettings, error: settingsError }] =
      await Promise.all([
        auth.supabase
          .from("fare_types")
          .select("surcharge_percentage")
          .eq("id", input.fare_type_id)
          .single(),
        auth.supabase.from("property_settings").select("nightly_rate, security_deposit").single(),
      ]);

    if (fareTypeError || !fareType) return { error: "El tipo de tarifa seleccionado no es válido." };
    if (settingsError || !propertySettings) return { error: "No se pudo calcular el monto de la reservación." };

    // Recalculado en el servidor a propósito (no se confía en un total_amount
    // del cliente): a diferencia de createReservation (admin, monto editable
    // por diseño), este es un checkout de autoservicio del huésped. Misma
    // fórmula que components/BookingSummary.tsx.
    const nights = Math.round(
      (new Date(`${input.check_out}T00:00:00`).getTime() - new Date(`${input.check_in}T00:00:00`).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const subtotal = nights * propertySettings.nightly_rate;
    const surcharge = subtotal * (fareType.surcharge_percentage / 100);
    const totalAmount = subtotal + surcharge + propertySettings.security_deposit;

    const { error } = await auth.supabase.from("reservations").insert({
      guest_id: auth.userId,
      check_in: input.check_in,
      check_out: input.check_out,
      fare_type_id: input.fare_type_id,
      total_amount: totalAmount,
      status: "pendiente",
      // Paso simulado de "creación de intención de pago" (ver CLAUDE.md) —
      // explícito aunque coincida con el default de la columna.
      payment_status: "pendiente",
    });
    if (error) return { error: error.message };

    revalidatePath("/admin/reservations");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado." };
  }
}

// Adjunta el carrito de servicios (SPA/Comida/Vinos) a la reservación activa
// más reciente del huésped autenticado — usado por CartView ("Pagar
// servicios"). Requiere que el huésped ya tenga una reservación (creada vía
// checkoutStay); si no la tiene, devuelve un error claro en vez de crear una
// reservación "placeholder".
export async function checkoutCartServices(items: CartItem[]): Promise<ActionResult> {
  try {
    const auth = await requireAuth();
    if ("error" in auth) return { error: auth.error };
    if (items.length === 0) return { error: "El carrito está vacío." };

    // Se destructura en variables propias (en vez de usar auth.supabase/
    // auth.userId directo) porque TypeScript no propaga el narrowing de
    // `auth` hacia dentro de la función anidada compensate() más abajo.
    const { supabase, userId } = auth;

    const { data: reservation, error: fetchError } = await supabase
      .from("reservations")
      .select("id")
      .eq("guest_id", userId)
      .in("status", ["pendiente", "confirmada"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) return { error: fetchError.message };
    if (!reservation) {
      return { error: RESERVATION_REQUIRED_ERROR };
    }

    const reservationId = reservation.id;

    // Los días de cocina no se ocupan (varios huéspedes pueden pedir distintos
    // tiempos de comida el mismo día), así que aquí no hay control de
    // colisiones como en el spa — solo se confirma que el día siga siendo uno
    // de los habilitados en food_availability, por si el carrito quedó guardado
    // en localStorage desde antes de que un admin retirara ese día.
    const requestedFoodDates = [
      ...new Set(items.filter((item) => item.serviceType === "comida").map((item) => item.details.day)),
    ];
    if (requestedFoodDates.length > 0) {
      const { data: openDates, error: availabilityError } = await supabase
        .from("food_availability")
        .select("available_date")
        .in("available_date", requestedFoodDates);

      if (availabilityError) return { error: availabilityError.message };

      const openDateSet = new Set((openDates ?? []).map((row) => row.available_date));
      const unavailable = requestedFoodDates.filter((date) => !openDateSet.has(date));
      if (unavailable.length > 0) {
        return {
          error: "El servicio de cocina ya no está disponible en alguno de los días seleccionados.",
        };
      }
    }

    const insertedSpaIds: string[] = [];
    const insertedFoodIds: string[] = [];
    const insertedWineOrderIds: string[] = [];

    async function compensate() {
      // release_spa_booking borra la reserva Y libera su bloque de
      // spa_availability en una sola transacción. Un `delete` directo sobre
      // spa_bookings no sirve aquí: el huésped no tiene política RLS de
      // DELETE sobre esa tabla (borraría 0 filas en silencio) y, aunque la
      // tuviera, dejaría el bloque marcado como ocupado para siempre.
      for (const bookingId of insertedSpaIds) {
        await supabase.rpc("release_spa_booking", { p_booking_id: bookingId });
      }
      if (insertedFoodIds.length) {
        await supabase.from("food_bookings").delete().in("id", insertedFoodIds);
      }
      if (insertedWineOrderIds.length) {
        // wine_order_items se borra en cascada (on delete cascade) al borrar su wine_order.
        await supabase.from("wine_orders").delete().in("id", insertedWineOrderIds);
      }
    }

    for (const item of items) {
      if (item.serviceType === "spa") {
        // Control de colisiones: book_spa_slot() toma el bloque de
        // spa_availability y crea la fila de spa_bookings dentro de una misma
        // transacción, con la fila de disponibilidad bloqueada (`for update`)
        // mientras verifica que siga libre y que ninguna reservación
        // 'pendiente'/'confirmada' la haya ocupado ya. Hacer esa verificación
        // aquí, con dos llamadas separadas de supabase-js, dejaría una ventana
        // en la que dos huéspedes concurrentes pasan el mismo chequeo antes de
        // que cualquiera de los dos inserte.
        const { data, error } = await supabase.rpc("book_spa_slot", {
          p_reservation_id: reservationId,
          p_masseuse_id: item.details.masseuseId,
          p_date: item.details.day,
          p_time: item.details.time,
          p_price: item.totalPrice,
        });

        if (error || !data) {
          await compensate();
          return { error: spaErrorMessage(error) };
        }
        insertedSpaIds.push(data);
      } else if (item.serviceType === "comida") {
        const { data, error } = await supabase
          .from("food_bookings")
          .insert({
            reservation_id: reservationId,
            date: item.details.day,
            meal_type: item.details.mealType,
            menu_id: item.details.menuOptionId,
            guests_count: item.details.guests,
            total_price: item.totalPrice,
          })
          .select("id")
          .single();

        if (error || !data) {
          await compensate();
          return { error: `No se pudo reservar el servicio de comida: ${error?.message ?? "error desconocido"}` };
        }
        insertedFoodIds.push(data.id);
      } else {
        // vinos — filtro explícito de cantidades > 0: no se asume que el
        // carrito ya venga "limpio" solo porque el formulario lo garantiza en
        // el cliente.
        const bottles = item.details.bottles.filter((bottle) => bottle.quantity > 0);
        const hasPackage = item.details.packageQuantity > 0 && item.details.packageId !== null;

        if (bottles.length === 0 && !hasPackage) continue;

        const { data: order, error: orderError } = await supabase
          .from("wine_orders")
          .insert({ reservation_id: reservationId, total_price: item.totalPrice })
          .select("id")
          .single();

        if (orderError || !order) {
          await compensate();
          return {
            error: `No se pudo reservar el pedido de vinos: ${orderError?.message ?? "error desconocido"}`,
          };
        }
        insertedWineOrderIds.push(order.id);

        const orderItemsPayload = [
          ...bottles.map((bottle) => ({
            wine_order_id: order.id,
            wine_id: bottle.bottleId,
            wine_package_id: null,
            quantity: bottle.quantity,
            unit_price: bottle.unitPrice,
          })),
          ...(hasPackage
            ? [
                {
                  wine_order_id: order.id,
                  wine_id: null,
                  wine_package_id: item.details.packageId,
                  quantity: item.details.packageQuantity,
                  unit_price: item.details.packageUnitPrice,
                },
              ]
            : []),
        ];

        const { error: itemsError } = await supabase.from("wine_order_items").insert(orderItemsPayload);
        if (itemsError) {
          await compensate();
          return { error: `No se pudo reservar el pedido de vinos: ${itemsError.message}` };
        }
      }
    }

    revalidatePath("/admin/reservations");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado." };
  }
}
