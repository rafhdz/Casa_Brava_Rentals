"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/require-admin";
import type { createClient as createServerClient } from "@/lib/supabase/server";
import type { Tables, Enums } from "@/lib/database.types";
import type { Profile } from "@/lib/AuthContext";

type ActionResult = { success: true } | { error: string };
type QueryResult<T> = { data: T } | { error: string };

// supabase-js no infiere en profundidad selects con alias/JOIN a partir de
// database.types.ts (solo trae Row/Insert/Update base por tabla, sin
// inferencia a nivel de query builder) — este tipo se autoría a mano y se
// castea sobre el resultado de getReservations() con una aserción
// justificada, siguiendo la regla de "any solo cuando se justifica".
export type ReservationWithRelations = Tables<"reservations"> & {
  guest: Pick<Profile, "id" | "first_name" | "apellido_paterno" | "apellido_materno" | "email"> | null;
  fare_type: Pick<Tables<"fare_types">, "id" | "name" | "surcharge_percentage"> | null;
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

const OVERLAP_ERROR = "Ya existe una reservación confirmada que se traslapa con esas fechas.";

// Comparación como string "yyyy-MM-dd" (los <input type="date"> siempre
// producen ese formato) — a propósito no se construye un Date() aquí, para
// evitar el mismo bug de zona horaria que new Date("yyyy-MM-dd") introduce en
// otras partes de la app (ver CLAUDE.md, sección Calendar.tsx). Un string ISO
// de ancho fijo compara lexicográficamente igual que cronológicamente.
function validateDates(checkIn: string, checkOut: string): string | null {
  if (!checkIn || !checkOut) {
    return "Debes indicar la fecha de check-in y de check-out.";
  }
  if (checkOut <= checkIn) {
    return "La fecha de check-out debe ser posterior a la de check-in.";
  }
  return null;
}

// Única regla de solape del sistema: [checkIn, checkOut) no puede cruzarse
// con OTRA reservación no eliminada en estado 'confirmada' — sin importar el
// estado que vaya a tener la reservación que se está guardando. Reutilizada
// igual en createReservation y updateReservation.
async function hasOverlappingConfirmedReservation(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string
): Promise<{ overlaps: boolean } | { error: string }> {
  let query = supabase
    .from("reservations")
    .select("id")
    .eq("status", "confirmada")
    .is("deleted_at", null)
    .lt("check_in", checkOut)
    .gt("check_out", checkIn);

  if (excludeReservationId) {
    query = query.neq("id", excludeReservationId);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };
  return { overlaps: (data?.length ?? 0) > 0 };
}

export async function getReservations(): Promise<QueryResult<ReservationWithRelations[]>> {
  try {
    const auth = await requireAdmin();
    if ("error" in auth) return { error: auth.error };

    const { data, error } = await auth.supabase
      .from("reservations")
      .select(
        "*, guest:profiles(id, first_name, apellido_paterno, apellido_materno, email), fare_type:fare_types(id, name, surcharge_percentage)"
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
