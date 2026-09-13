"use server";

import { revalidatePath } from "next/cache";
import { serverFetch, serverFetchAll, toActionError } from "@/lib/api/server";
import type { PaymentStatus, Reservation, ReservationStatus, Usuario } from "@/lib/api/types";

type ActionResult = { success: true } | { error: string };
type QueryResult<T> = { data: T } | { error: string };

// Opciones que alimentan el modal de "Crear reservación".
export type GuestOption = Pick<Usuario, "id" | "nombre_completo" | "email">;
export type FareTypeOption = { id: string; name: string; surcharge_percentage: number };
export type PropertySettingsSummary = { nightly_rate: number; security_deposit: number };

export type CreateReservationInput = {
  guest_id: string;
  check_in: string;
  check_out: string;
  fare_type_id: string;
  total_amount: number;
  status: ReservationStatus;
  payment_status: PaymentStatus;
};

export type UpdateReservationInput = {
  check_in?: string;
  check_out?: string;
  fare_type_id?: string;
  total_amount?: number;
  status?: ReservationStatus;
  payment_status?: PaymentStatus;
};

/**
 * Lista las reservaciones con su desglose de servicios ya anidado.
 *
 * Una sola petición trae todo lo que el panel necesita: el backend resuelve
 * los JOIN (huésped, tarifa, spa/comida/vinos con su catálogo) y expone
 * `subtotal_servicios` y `gran_total` ya calculados sobre los precios
 * guardados — el snapshot del momento de contratar, no el catálogo vigente.
 * Las reservaciones con soft delete nunca salen.
 */
export async function getReservations(): Promise<QueryResult<Reservation[]>> {
  try {
    return { data: await serverFetchAll<Reservation>("/api/reservaciones/reservaciones/") };
  } catch (error) {
    return { error: toActionError(error, "No se pudieron cargar las reservaciones.") };
  }
}

/**
 * Alta administrativa de una reservación.
 *
 * `total_amount` sí viaja desde el cliente en este caso —y solo en este—:
 * cuando quien crea es un admin, el backend respeta el monto manual para
 * permitir descuentos. En el checkout de autoservicio del huésped el total
 * siempre se deriva en el servidor.
 */
export async function createReservation(input: CreateReservationInput): Promise<ActionResult> {
  try {
    await serverFetch<Reservation>("/api/reservaciones/reservaciones/", {
      method: "POST",
      body: {
        guest: input.guest_id,
        check_in: input.check_in,
        check_out: input.check_out,
        fare_type: input.fare_type_id,
        total_amount: input.total_amount,
        status: input.status,
        payment_status: input.payment_status,
      },
    });

    revalidatePath("/p/casa-brava/owner-panel/reservations");
    return { success: true };
  } catch (error) {
    return { error: toActionError(error, "No se pudo crear la reservación.") };
  }
}

/**
 * Edita una reservación (estado operativo, cobro, fechas, monto).
 *
 * Todo el manejo de inventario que antes vivía en esta acción —liberar los
 * bloques de spa al cancelar, volver a tomarlos al reactivar y abortar si otro
 * huésped ya los ocupó, revisar el solapamiento al confirmar— ahora corre en
 * el backend, dentro de la misma transacción que aplica el cambio. Eso cierra
 * un hueco real de la versión anterior: aquí eran llamadas separadas, y un
 * fallo entre una y otra podía dejar el cambio aplicado con el inventario
 * inconsistente. Un choque de horarios llega como 409 con su mensaje listo.
 */
export async function updateReservation(
  reservationId: string,
  updates: UpdateReservationInput
): Promise<ActionResult> {
  try {
    const { fare_type_id, ...resto } = updates;

    await serverFetch<Reservation>(`/api/reservaciones/reservaciones/${reservationId}/`, {
      method: "PATCH",
      body: { ...resto, ...(fare_type_id ? { fare_type: fare_type_id } : {}) },
    });

    revalidatePath("/p/casa-brava/owner-panel/reservations");
    return { success: true };
  } catch (error) {
    return { error: toActionError(error, "No se pudo actualizar la reservación.") };
  }
}

/**
 * Elimina una reservación.
 *
 * El `DELETE` de la API es un **soft delete**: marca `deleted_at` y libera los
 * bloques de spa, sin borrar los bookings. Un borrado físico se llevaría en
 * cascada el historial de servicios contratados, que es justo lo que muestra
 * el desglose de costos del modal de edición.
 */
export async function deleteReservation(reservationId: string): Promise<ActionResult> {
  try {
    await serverFetch(`/api/reservaciones/reservaciones/${reservationId}/`, { method: "DELETE" });

    revalidatePath("/p/casa-brava/owner-panel/reservations");
    return { success: true };
  } catch (error) {
    return { error: toActionError(error, "No se pudo eliminar la reservación.") };
  }
}
