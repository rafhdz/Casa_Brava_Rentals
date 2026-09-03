"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
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

    const { error } = await auth.supabase.from("reservations").update(updates).eq("id", reservationId);
    if (error) return { error: error.message };

    revalidatePath("/admin/reservations");
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

    revalidatePath("/admin/reservations");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Ocurrió un error inesperado." };
  }
}
