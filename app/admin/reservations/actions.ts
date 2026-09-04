"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import type { createClient as createServerClient } from "@/lib/supabase/server";
import {
  OVERLAP_ERROR,
  validateDates,
  hasOverlappingConfirmedReservation,
} from "@/lib/supabase/reservation-rules";
import type { Tables, Enums } from "@/lib/database.types";
import type { Profile } from "@/lib/AuthContext";

type ActionResult = { success: true } | { error: string };
type QueryResult<T> = { data: T } | { error: string };

// supabase-js no infiere en profundidad selects con alias/JOIN a partir de
// database.types.ts (solo trae Row/Insert/Update base por tabla, sin
// inferencia a nivel de query builder) — este tipo se autoría a mano y se
// castea sobre el resultado de getReservations() con una aserción
// justificada, siguiendo la regla de "any solo cuando se justifica".
// Detalle de cada servicio contratado — la forma exacta que necesita el
// desglose de costos del modal de edición (ver EditReservationModal en
// ReservationsTable.tsx), con el catálogo relacionado (masajista/menú/vino/
// paquete) ya incluido vía JOIN. Los precios (`price_per_hour`, `total_price`,
// `unit_price`) son columnas reales de la fila del booking/order/item —
// snapshot del precio al momento del checkout (ver app/actions/checkout.ts) —
// no se recalculan aquí a partir del precio actual del catálogo, que puede
// haber cambiado desde entonces.
export type SpaBookingWithMasseuse = Pick<Tables<"spa_bookings">, "id" | "date" | "time" | "price_per_hour"> & {
  masseuse: Pick<Tables<"spa_masseuses">, "name"> | null;
};

export type FoodBookingWithMenu = Pick<
  Tables<"food_bookings">,
  "id" | "date" | "meal_type" | "guests_count" | "total_price"
> & {
  menu: Pick<Tables<"food_menus">, "name" | "price_per_person"> | null;
};

export type WineOrderItemWithCatalog = Pick<Tables<"wine_order_items">, "id" | "quantity" | "unit_price"> & {
  wine: Pick<Tables<"wines">, "name" | "price"> | null;
  package: Pick<Tables<"wine_packages">, "name" | "price"> | null;
};

export type WineOrderWithItems = Pick<Tables<"wine_orders">, "id" | "total_price"> & {
  items: WineOrderItemWithCatalog[];
};

export type ReservationWithRelations = Tables<"reservations"> & {
  guest: Pick<Profile, "id" | "first_name" | "apellido_paterno" | "apellido_materno" | "email"> | null;
  fare_type: Pick<Tables<"fare_types">, "id" | "name" | "surcharge_percentage"> | null;
  spa_bookings: SpaBookingWithMasseuse[];
  food_bookings: FoodBookingWithMenu[];
  wine_orders: WineOrderWithItems[];
};

export type GuestOption = Pick<
  Profile,
  "id" | "first_name" | "apellido_paterno" | "apellido_materno" | "email"
>;
export type FareTypeOption = Pick<Tables<"fare_types">, "id" | "name" | "surcharge_percentage">;
export type PropertySettingsSummary = Pick<Tables<"property_settings">, "nightly_rate" | "security_deposit">;

export type CreateReservationInput = {
  guest_id: string;
  check_in: string;
  check_out: string;
  fare_type_id: string;
  total_amount: number;
  status: Enums<"reservation_status">;
  payment_status: Enums<"payment_status_type">;
};

export type UpdateReservationInput = Partial<CreateReservationInput>;

// Devuelve los bloques de spa_availability tomados por esta reservación al
// inventario disponible, sin borrar sus spa_bookings (el historial de
// servicios contratados se conserva — es lo que muestra el desglose de costos
// del modal de edición). Se llama al cancelar y al hacer soft delete: en ambos
// casos la reservación deja de ocupar el calendario, así que sus horarios
// tienen que volver a estar a la venta.
//
// Si el update de la reservación ya se aplicó y esto falla, NO se silencia: se
// devuelve un error que dice explícitamente que la operación principal sí se
// guardó, para que el admin sepa que lo único pendiente es revisar la
// disponibilidad — un fallo silencioso aquí volvería a dejar inventario
// bloqueado sin que nadie se entere, que es justo lo que este cambio corrige.
async function releaseSpaSlots(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  reservationId: string
): Promise<{ error: string } | null> {
  const { error } = await supabase.rpc("release_spa_slots_for_reservation", {
    p_reservation_id: reservationId,
  });
  if (!error) return null;
  return {
    error: `El cambio se guardó, pero no se pudieron liberar los horarios de spa de esta reservación (${error.message}). Revísalos manualmente antes de volver a ofertarlos.`,
  };
}

const INACTIVE_STATUSES: Enums<"reservation_status">[] = ["cancelada", "finalizada"];
const ACTIVE_STATUSES: Enums<"reservation_status">[] = ["pendiente", "confirmada"];

// Vuelve a tomar los bloques de spa_availability de una reservación que un
// admin está reactivando (cancelada/finalizada -> pendiente/confirmada). A
// diferencia de releaseSpaSlots (que corre DESPUÉS del update principal), esto
// se llama ANTES: si algún horario ya fue tomado por otro huésped mientras la
// reservación estaba inactiva, la reactivación completa debe abortarse sin
// llegar a tocar la fila de `reservations` — no basta con reportar el error
// después de haber cambiado el status.
async function reacquireSpaSlots(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  reservationId: string
): Promise<{ error: string } | null> {
  const { error } = await supabase.rpc("reacquire_spa_slots_for_reservation", {
    p_reservation_id: reservationId,
  });
  if (!error) return null;
  if (error.message.includes("SPA_SLOT_TAKEN")) {
    return {
      error:
        "No se puede reactivar la reservación: uno o más horarios de SPA originales ya fueron ocupados por otro huésped.",
    };
  }
  return {
    error: `No se pudo reactivar la reservación: ${error.message}`,
  };
}

export async function getReservations(): Promise<QueryResult<ReservationWithRelations[]>> {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return { error: auth.error };

    const { data, error } = await auth.supabase
      .from("reservations")
      .select(
        `*,
        guest:profiles(id, first_name, apellido_paterno, apellido_materno, email),
        fare_type:fare_types(id, name, surcharge_percentage),
        spa_bookings(id, date, time, price_per_hour, masseuse:spa_masseuses(name)),
        food_bookings(id, date, meal_type, guests_count, total_price, menu:food_menus(name, price_per_person)),
        wine_orders(id, total_price, items:wine_order_items(id, quantity, unit_price, wine:wines(name, price), package:wine_packages(name, price)))`
      )
      .is("deleted_at", null)
      .order("check_in", { ascending: true });

    if (error) return { error: error.message };
    return { data: (data ?? []) as unknown as ReservationWithRelations[] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado." };
  }
}

export async function createReservation(input: CreateReservationInput): Promise<ActionResult> {
  try {
    const auth = await requireAdmin();
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

    const { error } = await auth.supabase.from("reservations").insert({
      guest_id: input.guest_id,
      check_in: input.check_in,
      check_out: input.check_out,
      fare_type_id: input.fare_type_id,
      total_amount: input.total_amount,
      status: input.status,
      payment_status: input.payment_status,
    });
    if (error) return { error: error.message };

    revalidatePath("/admin/reservations");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado." };
  }
}

export async function updateReservation(
  reservationId: string,
  updates: UpdateReservationInput
): Promise<ActionResult> {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return { error: auth.error };

    const touchesDates = updates.check_in !== undefined || updates.check_out !== undefined;
    const touchesStatus = updates.status !== undefined;

    // Se resuelve dentro del bloque de abajo (que es donde se lee el status
    // actual) y se consume después del update. Se usa el status EFECTIVO y no
    // `updates.status === "cancelada"` a propósito: así, editar una
    // reservación que ya estaba cancelada también libera sus horarios, lo que
    // recupera el inventario de las que se cancelaron antes de que existiera
    // esta liberación automática.
    let effectiveStatusIsCancelled = false;
    // Transición inversa: reactivar una reservación que estaba inactiva
    // (cancelada/finalizada) hacia un status activo (pendiente/confirmada).
    // Se resuelve aquí y se consume ANTES del update — ver reacquireSpaSlots.
    let isReactivation = false;

    if (touchesDates || touchesStatus) {
      const { data: current, error: fetchError } = await auth.supabase
        .from("reservations")
        .select("check_in, check_out, status")
        .eq("id", reservationId)
        .single();

      if (fetchError || !current) {
        return { error: "No se encontró la reservación a actualizar." };
      }

      const effectiveCheckIn = updates.check_in ?? current.check_in;
      const effectiveCheckOut = updates.check_out ?? current.check_out;
      const effectiveStatus = updates.status ?? current.status;
      effectiveStatusIsCancelled = effectiveStatus === "cancelada";
      isReactivation =
        touchesStatus &&
        INACTIVE_STATUSES.includes(current.status) &&
        ACTIVE_STATUSES.includes(effectiveStatus);

      const dateError = validateDates(effectiveCheckIn, effectiveCheckOut);
      if (dateError) return { error: dateError };

      // Se revisa el solape si las fechas están en juego (igual que create,
      // sin importar el status resultante) O si el status resultante va a
      // quedar en 'confirmada' — este segundo disparador cubre pasar una
      // reservación existente de pendiente a confirmada SIN tocar fechas,
      // que es el único camino que la UI de esta fase usa (el modal de
      // edición solo cambia status/payment_status). Ver CLAUDE.md, "CRUD de
      // reservaciones", para el detalle de por qué se agregó.
      const mustCheckOverlap = touchesDates || effectiveStatus === "confirmada";

      if (mustCheckOverlap) {
        const overlapCheck = await hasOverlappingConfirmedReservation(
          auth.supabase,
          effectiveCheckIn,
          effectiveCheckOut,
          reservationId
        );
        if ("error" in overlapCheck) return { error: overlapCheck.error };
        if (overlapCheck.overlaps) return { error: OVERLAP_ERROR };
      }
    }

    // Si se está reactivando, intenta volver a tomar los bloques de spa ANTES
    // de tocar `reservations`: si algún horario ya fue tomado por otro
    // huésped, la reactivación completa se aborta aquí, sin aplicar ningún
    // cambio de status.
    if (isReactivation) {
      const reacquireError = await reacquireSpaSlots(auth.supabase, reservationId);
      if (reacquireError) return reacquireError;
    }

    const { error } = await auth.supabase.from("reservations").update(updates).eq("id", reservationId);
    if (error) return { error: error.message };

    // Una reservación cancelada ya no ocupa el calendario: sus bloques de spa
    // vuelven al inventario disponible.
    const releaseError = effectiveStatusIsCancelled
      ? await releaseSpaSlots(auth.supabase, reservationId)
      : null;

    revalidatePath("/admin/reservations");
    if (releaseError) return releaseError;
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado." };
  }
}

export async function deleteReservation(reservationId: string): Promise<ActionResult> {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return { error: auth.error };

    // Soft delete — nunca DELETE físico. spa_bookings/food_bookings/
    // wine_orders tienen reservation_id references reservations(id) on
    // delete cascade: un DELETE real se llevaría entre manos el historial de
    // servicios adicionales de esta reservación.
    const { error } = await auth.supabase
      .from("reservations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", reservationId);
    if (error) return { error: error.message };

    // Igual que al cancelar: la reservación deja de ocupar el calendario, así
    // que sus bloques de spa vuelven al inventario. Los spa_bookings siguen
    // ahí — el soft delete conserva todo el historial.
    const releaseError = await releaseSpaSlots(auth.supabase, reservationId);

    revalidatePath("/admin/reservations");
    if (releaseError) return releaseError;
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado." };
  }
}
