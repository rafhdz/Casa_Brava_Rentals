"use server";

import { revalidatePath } from "next/cache";
import { serverFetch, toActionError, ApiError } from "@/lib/api/server";
import { RESERVATION_REQUIRED_ERROR } from "@/lib/checkout-errors";
import { getActiveReservation } from "@/lib/reservations";
import { ownerPanelRoutes } from "@/lib/owner-panel";
import { TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";
import type { CartItem } from "@/lib/cart-types";
import type { Reservation } from "@/lib/api/types";

type ActionResult = { success: true } | { error: string };

// Lo que el huésped acaba de crear tiene que verse en el panel de gestión de
// la propiedad. Se arma con `ownerPanelRoutes` para que este archivo no
// repita la ruta del panel a mano (ver lib/owner-panel.ts); sigue siendo la de
// Casa Brava porque este checkout es, por diseño, exclusivo de Tenant 0 —las
// propiedades mock nunca llaman aquí (ver CLAUDE.md, "Arquitectura
// multi-tenant").
const OWNER_PANEL_RESERVATIONS_PATH = ownerPanelRoutes(TENANT_ZERO_SLUG).reservations;

export type CheckoutStayInput = {
  check_in: string;
  check_out: string;
  fare_type_id: string;
};

/**
 * Crea el registro maestro de la estadía para el huésped autenticado — lo usa
 * ReservarForm ("Proceder al pago"). El carrito de servicios NO se toca aquí:
 * se adjunta por separado desde /carrito (regla "estadía primero, servicios
 * después").
 *
 * Nota sobre lo que ya NO vive en el frontend: la validación de fechas, la
 * detección de solapamiento y el cálculo de `total_amount` corren en el
 * backend, dentro de una transacción con la configuración de la propiedad
 * bloqueada. Reimplementarlas aquí no solo sería duplicado, sería inseguro —
 * dos peticiones concurrentes pueden pasar una verificación hecha en el
 * cliente y aun así solaparse. Esta acción solo traduce la respuesta.
 *
 * `payment_status` tampoco se manda: si la sesión activa tiene rol `holder`,
 * el backend crea la estadía con `payment_status = "na"` en vez de
 * `"pendiente"` (un propietario no paga la renta de su propia propiedad), así
 * que este mismo flujo de checkout —sin ningún cambio aquí— ya admite
 * correctamente a un `holder` sin exigirle un cobro simulado pendiente. Ver
 * `reservaciones.services.crear_reservacion` en el backend y CLAUDE.md.
 */
export async function checkoutStay(input: CheckoutStayInput): Promise<ActionResult> {
  try {
    await serverFetch<Reservation>("/api/reservaciones/reservaciones/", {
      method: "POST",
      body: {
        check_in: input.check_in,
        check_out: input.check_out,
        fare_type: input.fare_type_id,
        // `guest` se ignora si lo manda un huésped: el backend siempre crea la
        // reservación a nombre de la sesión activa. `total_amount` también se
        // omite a propósito — lo deriva el servidor.
      },
    });

    revalidatePath(OWNER_PANEL_RESERVATIONS_PATH);
    return { success: true };
  } catch (error) {
    return { error: toActionError(error, "No se pudo crear la reservación.") };
  }
}

// Servicios creados durante ESTE checkout, para poder deshacerlos si un paso
// posterior falla.
type CreatedService = { kind: "spa" | "comida" | "vinos"; id: string };

const ENDPOINT_POR_SERVICIO: Record<CreatedService["kind"], string> = {
  spa: "/api/reservaciones/spa/",
  comida: "/api/reservaciones/comida/",
  vinos: "/api/reservaciones/vinos/",
};

/**
 * Deshace los servicios ya creados cuando el checkout falla a medias.
 *
 * El backend hace lo correcto en cada caso: borrar una sesión de spa libera
 * además su bloque de disponibilidad (las dos cosas en una transacción), y un
 * pedido de vinos se lleva sus líneas por cascada. Un huésped solo puede
 * borrar servicios mientras su estadía siga activa, que es exactamente el
 * momento en el que corre esta compensación.
 */
async function compensar(creados: CreatedService[]): Promise<void> {
  // En orden inverso, para deshacer primero lo último creado.
  for (const servicio of [...creados].reverse()) {
    try {
      await serverFetch(`${ENDPOINT_POR_SERVICIO[servicio.kind]}${servicio.id}/`, {
        method: "DELETE",
      });
    } catch {
      // Si la compensación falla no hay nada mejor que hacer desde aquí: el
      // error que se le muestra al huésped es el del fallo original, que es el
      // que explica por qué su carrito no se completó.
    }
  }
}

/**
 * Adjunta el carrito de servicios (SPA/Comida/Vinos) a la reservación activa
 * más reciente del huésped — lo usa CartView ("Pagar servicios").
 *
 * Requiere una estadía previa: si no la hay devuelve `RESERVATION_REQUIRED_ERROR`
 * en vez de inventar una reservación "placeholder".
 */
export async function checkoutCartServices(items: CartItem[]): Promise<ActionResult> {
  if (items.length === 0) return { error: "El carrito está vacío." };

  const creados: CreatedService[] = [];

  try {
    // Adjuntar servicios a una estadía cancelada o finalizada no tiene
    // sentido, por eso `getActiveReservation` solo mira pendiente/confirmada.
    const activa = await getActiveReservation();

    if (!activa) return { error: RESERVATION_REQUIRED_ERROR };

    for (const item of items) {
      if (item.serviceType === "spa") {
        // El backend toma el bloque de disponibilidad y crea la reserva en una
        // sola transacción con la fila bloqueada (`select_for_update`). Si otro
        // huésped ganó la carrera responde 409 con un mensaje ya redactado.
        // `price_per_hour` no se manda: lo fija el servidor.
        const booking = await serverFetch<{ id: string }>(ENDPOINT_POR_SERVICIO.spa, {
          method: "POST",
          body: {
            reservation: activa.id,
            masseuse: item.details.masseuseId,
            date: item.details.day,
            time: item.details.time,
          },
        });
        creados.push({ kind: "spa", id: booking.id });
      } else if (item.serviceType === "comida") {
        // El total se deriva en el servidor (menú × comensales); el backend
        // valida además que el día siga habilitado, por si el carrito quedó
        // guardado en localStorage desde antes de que un admin lo retirara.
        const booking = await serverFetch<{ id: string }>(ENDPOINT_POR_SERVICIO.comida, {
          method: "POST",
          body: {
            reservation: activa.id,
            date: item.details.day,
            meal_type: item.details.mealType,
            menu: item.details.menuOptionId,
            guests_count: item.details.guests,
          },
        });
        creados.push({ kind: "comida", id: booking.id });
      } else {
        // Filtro explícito de cantidades > 0: no se asume que el carrito venga
        // "limpio" solo porque el formulario lo garantiza en el cliente.
        const lineas = [
          ...item.details.bottles
            .filter((bottle) => bottle.quantity > 0)
            .map((bottle) => ({ wine: bottle.bottleId, quantity: bottle.quantity })),
          ...(item.details.packageQuantity > 0 && item.details.packageId
            ? [{ wine_package: item.details.packageId, quantity: item.details.packageQuantity }]
            : []),
        ];

        // Un pedido sin líneas no se manda: el backend lo rechazaría, y de
        // todos modos no habría nada que cobrar.
        if (lineas.length === 0) continue;

        // Cabecera y líneas van en una sola petición — el backend no acepta
        // crearlas por separado, justo para que no quede un pedido huérfano si
        // la segunda llamada falla.
        const pedido = await serverFetch<{ id: string }>(ENDPOINT_POR_SERVICIO.vinos, {
          method: "POST",
          body: { reservation: activa.id, items: lineas },
        });
        creados.push({ kind: "vinos", id: pedido.id });
      }
    }

    revalidatePath(OWNER_PANEL_RESERVATIONS_PATH);
    return { success: true };
  } catch (error) {
    await compensar(creados);

    // Un 409 (bloque de spa ya tomado, día de cocina retirado) trae un mensaje
    // pensado para el huésped, así que se muestra tal cual.
    const fallback =
      error instanceof ApiError && error.isConflict
        ? error.message
        : "No se pudieron reservar los servicios. Vuelve a intentarlo.";
    return { error: toActionError(error, fallback) };
  }
}
