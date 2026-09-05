// Helpers de dominio sobre reservaciones que consumen tanto Server Actions
// (app/actions/checkout.ts) como Server Components (app/servicios/*/page.tsx).
// No vive en lib/api/ porque esa carpeta es la capa de acceso puro a la API
// (fetch/sesión/tipos), sin reglas de "cuál es la reservación relevante".

import { serverFetchAll } from "@/lib/api/server";
import type { Reservation } from "@/lib/api/types";
import { ESTADOS_ACTIVOS } from "@/lib/api/types";

/**
 * Reservación activa (pendiente o confirmada) más reciente del huésped en
 * sesión, o `null` si no tiene ninguna. El backend ya limita la lista a las
 * reservaciones propias del huésped y excluye las que tienen soft delete.
 *
 * Es la misma noción de "estadía activa" que usa `checkoutCartServices` para
 * decidir a qué reservación adjuntar un servicio — se comparte para que un
 * huésped nunca vea un formulario de servicio habilitado para fechas de una
 * estadía distinta a la que el checkout real va a usar.
 */
export async function getActiveReservation(): Promise<Reservation | null> {
  const reservaciones = await serverFetchAll<Reservation>("/api/reservaciones/reservaciones/");
  return (
    reservaciones
      .filter((reserva) => ESTADOS_ACTIVOS.includes(reserva.status))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
  );
}
