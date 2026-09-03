import type { createClient as createServerClient } from "@/lib/supabase/server";

// Extraído de app/admin/reservations/actions.ts (antes privado ahí) para que
// app/actions/checkout.ts reutilice exactamente la misma regla de fechas/
// solape sin duplicarla — mismo criterio ya aplicado a la extracción de
// requireAdmin (ver lib/supabase/require-admin.ts).

export const OVERLAP_ERROR = "Ya existe una reservación confirmada que se traslapa con esas fechas.";

// Comparación como string "yyyy-MM-dd" (los <input type="date"> siempre
// producen ese formato) — a propósito no se construye un Date() aquí, para
// evitar el mismo bug de zona horaria que new Date("yyyy-MM-dd") introduce en
// otras partes de la app (ver CLAUDE.md, sección Calendar.tsx). Un string ISO
// de ancho fijo compara lexicográficamente igual que cronológicamente.
export function validateDates(checkIn: string, checkOut: string): string | null {
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
// igual en createReservation/updateReservation (admin) y checkoutStay
// (checkout de huésped).
export async function hasOverlappingConfirmedReservation(
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
