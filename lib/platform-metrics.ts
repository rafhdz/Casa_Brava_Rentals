// Analíticas del Panel de Control PHH (`/admin`), calculadas en el servidor
// sobre datos REALES de Django: `/api/usuarios/`, `/api/reservaciones/
// reservaciones/` y `/api/propiedades/`. Funciones puras — la página
// (Server Component) hace los fetch y llama aquí; el cliente solo recibe el
// resultado ya agregado, nunca la colección completa de reservaciones.
//
// Reglas numéricas (ver CLAUDE.md, "Capa de acceso a la API"):
//   - Todo `Decimal` de DRF pasa por `toCents()` (que usa `toNumber()`)
//     antes de sumarse: nunca aritmética sobre el string.
//   - Las sumas se hacen en centavos enteros y se formatean al final con
//     `formatMoney()`, para que cientos de reservaciones no acumulen error
//     de coma flotante.
//   - Montos del backend (`gran_total`) tal cual: no se recalcula ningún
//     precio contra el catálogo vigente.

import { differenceInCalendarDays, parseISO, subDays } from "date-fns";
import { PHH_COMMISSION_RATE, commissionCents } from "@/lib/commission-rates";
import { toCents } from "@/lib/format";
import {
  ESTADOS_CONSOLIDADOS,
  type PropertyListing,
  type Reservation,
  type Usuario,
} from "@/lib/api/types";

/** Ventana de "nuevos registros" de la cohorte de huéspedes. */
export const NEW_REGISTRATION_WINDOW_DAYS = 30;

export type PlatformMetrics = {
  /** Σ `gran_total` de las estancias consolidadas no exentas. */
  gmvCents: number;
  /** Estancias que suman al GMV. */
  gmvReservations: number;
  /** Estancias consolidadas exentas (`payment_status = "na"`), fuera del GMV. */
  exemptReservations: number;
  averageTicketCents: number;
  /** Comisión de PHH proyectada sobre el GMV (ver lib/commission-rates.ts). */
  takeRateCents: number;
  occupancy: {
    year: number;
    bookedNights: number;
    availableNights: number;
    propertyCount: number;
    rate: number;
  };
  cohorts: {
    /** Más de una estancia concluida (`finalizada`). */
    recurrent: number;
    /** Al menos una estancia concluida. */
    withConcludedStay: number;
    recurrenceRate: number;
    /** Huéspedes (`guest`) dados de alta en la ventana de N días. */
    newRegistrations: number;
  };
};

/**
 * Vínculo de un usuario con la plataforma, derivado de sus reservaciones:
 * alimenta el filtro "Vínculo" de `GlobalUsersPanel`.
 */
export type GuestLink = "recurrente" | "con-reservacion" | "sin-reservacion";

export const GUEST_LINK_LABELS: Record<GuestLink, string> = {
  recurrente: "Recurrente",
  "con-reservacion": "Con reservación",
  "sin-reservacion": "Sin reservación",
};

/**
 * Usuario tal como lo recibe el panel universal (Client Component).
 *
 * Deliberadamente NO es el `Usuario` completo de la API: `phone`,
 * `date_of_birth` y `document_id` no se usan en esta tabla, y todo lo que se
 * pasa por props a un Client Component viaja serializado al navegador. Se
 * manda solo lo que se pinta o se filtra (minimización de datos), más lo
 * derivado de las reservaciones en el servidor.
 */
export type GlobalUser = Pick<
  Usuario,
  "id" | "nombre_completo" | "email" | "role" | "status" | "created_at"
> & {
  link: GuestLink;
  /** Propiedades (reales, de Django) en las que tiene alguna reservación. */
  propertyIds: string[];
  concludedStays: number;
};

export type PropertyOption = { id: string; name: string };

function groupByGuest(reservations: readonly Reservation[]): Map<string, Reservation[]> {
  const byGuest = new Map<string, Reservation[]>();
  for (const reservation of reservations) {
    const list = byGuest.get(reservation.guest.id);
    if (list) list.push(reservation);
    else byGuest.set(reservation.guest.id, [reservation]);
  }
  return byGuest;
}

function isConsolidated(reservation: Reservation): boolean {
  return ESTADOS_CONSOLIDADOS.includes(reservation.status);
}

function countConcluded(reservations: readonly Reservation[]): number {
  return reservations.filter((reservation) => reservation.status === "finalizada").length;
}

/**
 * Noches de `[check_in, check_out)` que caen dentro de `[yearStart, nextYearStart)`.
 * Se comparan los ISO como strings (ancho fijo: el orden lexicográfico es el
 * cronológico) y solo se parsean con `parseISO` —nunca `new Date("yyyy-MM-dd")`,
 * que desfasa un día según la zona horaria—.
 */
function nightsWithinYear(reservation: Reservation, yearStart: string, nextYearStart: string): number {
  const start = reservation.check_in > yearStart ? reservation.check_in : yearStart;
  const end = reservation.check_out < nextYearStart ? reservation.check_out : nextYearStart;
  return end > start ? differenceInCalendarDays(parseISO(end), parseISO(start)) : 0;
}

export function computePlatformMetrics({
  users,
  reservations,
  properties,
  referenceDate,
}: {
  users: readonly Usuario[];
  /** Ya vienen sin soft delete: el backend nunca las devuelve. */
  reservations: readonly Reservation[];
  properties: readonly PropertyListing[];
  referenceDate: Date;
}): PlatformMetrics {
  const consolidated = reservations.filter(isConsolidated);
  const billable = consolidated.filter((reservation) => reservation.payment_status !== "na");

  const gmvCents = billable.reduce((sum, reservation) => sum + toCents(reservation.gran_total), 0);

  // Ocupación del año calendario en curso. La capacidad cuenta las
  // propiedades activas más cualquier otra que tenga estancias este año
  // (p. ej. una desactivada a medio año), para que la tasa no pueda pasar
  // del 100 % por una propiedad que ya no aparece en el catálogo público.
  const year = referenceDate.getFullYear();
  const yearStart = `${year}-01-01`;
  const nextYearStart = `${year + 1}-01-01`;
  const daysInYear = differenceInCalendarDays(parseISO(nextYearStart), parseISO(yearStart));

  const propertyIds = new Set(properties.filter((property) => property.is_active).map((p) => p.id));
  let bookedNights = 0;
  for (const reservation of consolidated) {
    const nights = nightsWithinYear(reservation, yearStart, nextYearStart);
    if (nights > 0) {
      bookedNights += nights;
      propertyIds.add(reservation.property.id);
    }
  }
  const availableNights = daysInYear * propertyIds.size;

  // Cohortes: una sola pasada agrupando por huésped.
  let recurrent = 0;
  let withConcludedStay = 0;
  for (const guestReservations of groupByGuest(reservations).values()) {
    const concluded = countConcluded(guestReservations);
    if (concluded >= 1) withConcludedStay += 1;
    if (concluded > 1) recurrent += 1;
  }
  const windowStart = subDays(referenceDate, NEW_REGISTRATION_WINDOW_DAYS);
  const newRegistrations = users.filter(
    (user) => user.role === "guest" && parseISO(user.created_at) >= windowStart
  ).length;

  return {
    gmvCents,
    gmvReservations: billable.length,
    exemptReservations: consolidated.length - billable.length,
    averageTicketCents: billable.length > 0 ? Math.round(gmvCents / billable.length) : 0,
    takeRateCents: commissionCents(gmvCents, PHH_COMMISSION_RATE),
    occupancy: {
      year,
      bookedNights,
      availableNights,
      propertyCount: propertyIds.size,
      rate: availableNights > 0 ? bookedNights / availableNights : 0,
    },
    cohorts: {
      recurrent,
      withConcludedStay,
      recurrenceRate: withConcludedStay > 0 ? recurrent / withConcludedStay : 0,
      newRegistrations,
    },
  };
}

/** Filas del panel: el usuario mínimo + su vínculo y propiedades, en una pasada. */
export function buildGlobalUsers(
  users: readonly Usuario[],
  reservations: readonly Reservation[]
): GlobalUser[] {
  const byGuest = groupByGuest(reservations);

  return users.map((user) => {
    const own = byGuest.get(user.id) ?? [];
    const concludedStays = countConcluded(own);
    const hasLiveReservation = own.some((reservation) => reservation.status !== "cancelada");
    const link: GuestLink =
      concludedStays > 1 ? "recurrente" : hasLiveReservation ? "con-reservacion" : "sin-reservacion";

    return {
      id: user.id,
      nombre_completo: user.nombre_completo,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
      link,
      propertyIds: [...new Set(own.map((reservation) => reservation.property.id))],
      concludedStays,
    };
  });
}

/**
 * Opciones del filtro "Propiedad": las activas del catálogo de Django más las
 * que aparezcan en alguna reservación (aunque ya no estén activas), sin
 * duplicados y en orden alfabético.
 */
export function buildPropertyOptions(
  properties: readonly PropertyListing[],
  reservations: readonly Reservation[]
): PropertyOption[] {
  const byId = new Map<string, PropertyOption>();
  for (const property of properties) byId.set(property.id, { id: property.id, name: property.name });
  for (const { property } of reservations) {
    if (!byId.has(property.id)) byId.set(property.id, { id: property.id, name: property.name });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}
