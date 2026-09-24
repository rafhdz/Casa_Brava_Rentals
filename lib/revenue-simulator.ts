// Motor del simulador de Revenue Management del portal de anfitrión
// (`/supplier`). Funciones puras, sin React ni fetch: las usa la página
// (Server Component) para las métricas de la cabecera y el drawer del
// simulador (Client Component) para recalcular en vivo — mismo motor en los
// dos lados, así que la cabecera y el simulador nunca discrepan.
//
// ⚠️ Esto es una SIMULACIÓN del plan de negocio, no datos del backend. Los
// multiplicadores, el calendario de temporadas y los factores de demanda son
// supuestos declarados aquí a la vista (no hardcodeados en un componente),
// y se aplican sobre la tarifa base de cada propiedad. No toca Django ni
// reemplaza ninguna regla de cobro real: el precio de una estancia en Casa
// Brava lo sigue calculando el backend (ver CLAUDE.md, "Regla de oro").
//
// Todo el dinero se maneja en centavos enteros (ver `toCents` en
// lib/format.ts) para que las sumas de 12 meses × segmentos no arrastren el
// error de coma flotante.
//
//   Tarifa dinámica = Tarifa base × M_temporada × M_día × M_ocupación × M_evento
//
// acotada por un piso y un techo (guardrails de revenue management: ningún
// algoritmo de precios sano publica una tarifa a 0.3× ni a 3× la base).

import { AIRBNB_HOST_FEE_RATE, PHH_COMMISSION_RATE, commissionCents } from "@/lib/commission-rates";
import { toCents } from "@/lib/format";

export type Season = "baja" | "media" | "alta";
export type DayType = "entre-semana" | "fin-de-semana";
export type EventLevel = "ninguno" | "local" | "feria";

/**
 * Una opción de un eje del modelo. `multiplier` mueve el **precio**;
 * `demandFactor` mueve la **demanda** (ocupación esperada) del mismo segmento.
 * Son dos efectos distintos a propósito: la temporada alta sube el precio y
 * también llena la casa, y esa ocupación más alta es la que después activa
 * (o no) el multiplicador de ocupación — así interactúan los cuatro.
 */
export type ModelOption<T extends string> = {
  value: T;
  label: string;
  multiplier: number;
  demandFactor: number;
};

export const SEASONS: readonly ModelOption<Season>[] = [
  { value: "baja", label: "Baja", multiplier: 0.85, demandFactor: 0.7 },
  { value: "media", label: "Media", multiplier: 1, demandFactor: 1 },
  { value: "alta", label: "Alta", multiplier: 1.25, demandFactor: 1.35 },
];

// Los factores de demanda de los dos tipos de día promedian ~1 con el reparto
// 5/7 – 2/7 de la semana, así que la "ocupación base" sigue significando lo
// mismo en el escenario puntual y en la proyección anual.
export const DAY_TYPES: readonly ModelOption<DayType>[] = [
  { value: "entre-semana", label: "Entre semana", multiplier: 0.9, demandFactor: 0.85 },
  { value: "fin-de-semana", label: "Fin de semana", multiplier: 1.15, demandFactor: 1.35 },
];

export const EVENTS: readonly ModelOption<EventLevel>[] = [
  { value: "ninguno", label: "Sin evento", multiplier: 1, demandFactor: 1 },
  { value: "local", label: "Evento local", multiplier: 1.15, demandFactor: 1.15 },
  { value: "feria", label: "Feria de la Uva", multiplier: 1.4, demandFactor: 1.3 },
];

/** Escalones de M_ocupación, del más alto al más bajo (primer `min` que se cumple). */
export const OCCUPANCY_TIERS: readonly { min: number; multiplier: number; label: string }[] = [
  { min: 0.75, multiplier: 1.12, label: "Demanda alta" },
  { min: 0.4, multiplier: 1, label: "Demanda normal" },
  { min: 0, multiplier: 0.9, label: "Demanda baja" },
];

export const MULTIPLIER_FLOOR = 0.7;
export const MULTIPLIER_CEILING = 1.8;

/** Siempre quedan noches sin vender (mantenimiento, cancelaciones tardías). */
const MIN_OCCUPANCY = 0.05;
const MAX_OCCUPANCY = 0.95;

/** Proporción de noches de viernes y sábado en una semana. */
const WEEKEND_SHARE = 2 / 7;

const DAY_SHARES: Record<DayType, number> = {
  "entre-semana": 1 - WEEKEND_SHARE,
  "fin-de-semana": WEEKEND_SHARE,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function optionFor<T extends string>(options: readonly ModelOption<T>[], value: T): ModelOption<T> {
  // Los tres ejes son uniones cerradas y cada tabla cubre todos sus valores;
  // si una tabla perdiera una fila, fallar ruidosamente es mejor que simular
  // con un multiplicador inventado.
  const option = options.find((candidate) => candidate.value === value);
  if (!option) throw new Error(`Opción desconocida del simulador: ${value}`);
  return option;
}

export function occupancyTier(occupancy: number) {
  return (
    OCCUPANCY_TIERS.find((tier) => occupancy >= tier.min) ??
    OCCUPANCY_TIERS[OCCUPANCY_TIERS.length - 1]
  );
}

/**
 * Ocupación esperada de un segmento: la ocupación base (la de una noche de
 * temporada media, sin evento) escalada por la demanda de cada eje.
 */
export function segmentOccupancy(
  baseOccupancy: number,
  season: Season,
  dayType: DayType,
  event: EventLevel
): number {
  const demand =
    optionFor(SEASONS, season).demandFactor *
    optionFor(DAY_TYPES, dayType).demandFactor *
    optionFor(EVENTS, event).demandFactor;
  return clamp(baseOccupancy * demand, MIN_OCCUPANCY, MAX_OCCUPANCY);
}

/**
 * Supuesto del plan de negocio: la calificación de la propiedad como proxy
 * de su demanda base. 4.0★ ≈ 35 %, cada décima arriba suma 3 puntos, en
 * pasos de 5 % (los mismos del control deslizante del simulador).
 */
export function baselineOccupancyFromRating(rating: number): number {
  const raw = 0.35 + (rating - 4) * 0.3;
  return clamp(Math.round(raw * 20) / 20, 0.3, 0.75);
}

export type Scenario = {
  season: Season;
  dayType: DayType;
  event: EventLevel;
  /** Ocupación de una noche de temporada media sin evento (0–1). */
  baseOccupancy: number;
};

export type ScenarioQuote = {
  multipliers: { temporada: number; dia: number; ocupacion: number; evento: number };
  /** Producto de los cuatro, antes de los guardrails. */
  rawMultiplier: number;
  appliedMultiplier: number;
  cappedBy: "piso" | "techo" | null;
  expectedOccupancy: number;
  baseRateCents: number;
  rateCents: number;
};

/** Tarifa de una noche concreta (el escenario que arma el evaluador). */
export function quoteScenario(baseRate: number, scenario: Scenario): ScenarioQuote {
  const expectedOccupancy = segmentOccupancy(
    scenario.baseOccupancy,
    scenario.season,
    scenario.dayType,
    scenario.event
  );
  const multipliers = {
    temporada: optionFor(SEASONS, scenario.season).multiplier,
    dia: optionFor(DAY_TYPES, scenario.dayType).multiplier,
    ocupacion: occupancyTier(expectedOccupancy).multiplier,
    evento: optionFor(EVENTS, scenario.event).multiplier,
  };
  const rawMultiplier =
    multipliers.temporada * multipliers.dia * multipliers.ocupacion * multipliers.evento;
  const appliedMultiplier = clamp(rawMultiplier, MULTIPLIER_FLOOR, MULTIPLIER_CEILING);
  const cappedBy =
    rawMultiplier < MULTIPLIER_FLOOR ? "piso" : rawMultiplier > MULTIPLIER_CEILING ? "techo" : null;
  const baseRateCents = toCents(baseRate);

  return {
    multipliers,
    rawMultiplier,
    appliedMultiplier,
    cappedBy,
    expectedOccupancy,
    baseRateCents,
    rateCents: Math.round(baseRateCents * appliedMultiplier),
  };
}

// ---------------------------------------------------------------------------
// Proyección anual
// ---------------------------------------------------------------------------

export type MonthProfile = {
  label: string;
  shortLabel: string;
  nights: number;
  season: Season;
  event: EventLevel;
  /** Noches del mes que caen dentro del evento (el resto se modela sin evento). */
  eventNights: number;
};

/**
 * Calendario tipo de Parras de la Fuente (supuesto del plan de negocio), año
 * de 365 noches. Temporada alta: Semana Santa (abril), vacaciones de verano
 * (julio–agosto) y fin de año; la Feria de la Uva y el Vino ocupa ~10 noches
 * de agosto.
 */
export const PARRAS_CALENDAR: readonly MonthProfile[] = [
  { label: "Enero", shortLabel: "Ene", nights: 31, season: "baja", event: "ninguno", eventNights: 0 },
  { label: "Febrero", shortLabel: "Feb", nights: 28, season: "baja", event: "ninguno", eventNights: 0 },
  { label: "Marzo", shortLabel: "Mar", nights: 31, season: "media", event: "ninguno", eventNights: 0 },
  { label: "Abril", shortLabel: "Abr", nights: 30, season: "alta", event: "ninguno", eventNights: 0 },
  { label: "Mayo", shortLabel: "May", nights: 31, season: "media", event: "ninguno", eventNights: 0 },
  { label: "Junio", shortLabel: "Jun", nights: 30, season: "media", event: "ninguno", eventNights: 0 },
  { label: "Julio", shortLabel: "Jul", nights: 31, season: "alta", event: "ninguno", eventNights: 0 },
  { label: "Agosto", shortLabel: "Ago", nights: 31, season: "alta", event: "feria", eventNights: 10 },
  { label: "Septiembre", shortLabel: "Sep", nights: 30, season: "media", event: "ninguno", eventNights: 0 },
  { label: "Octubre", shortLabel: "Oct", nights: 31, season: "media", event: "ninguno", eventNights: 0 },
  { label: "Noviembre", shortLabel: "Nov", nights: 30, season: "baja", event: "ninguno", eventNights: 0 },
  { label: "Diciembre", shortLabel: "Dic", nights: 31, season: "alta", event: "ninguno", eventNights: 0 },
];

export type MonthProjection = {
  month: MonthProfile;
  availableNights: number;
  occupiedNights: number;
  occupancy: number;
  /** Tarifa promedio por noche vendida (ADR). */
  adrCents: number;
  revenueCents: number;
  phhFeeCents: number;
  airbnbFeeCents: number;
  savingsCents: number;
  cumulativeSavingsCents: number;
};

export type ProjectionTotals = {
  availableNights: number;
  occupiedNights: number;
  occupancy: number;
  adrCents: number;
  /** Ingreso por noche disponible: ingreso ÷ noches disponibles. */
  revparCents: number;
  revenueCents: number;
  phhFeeCents: number;
  airbnbFeeCents: number;
  savingsCents: number;
};

export type AnnualProjection = {
  months: MonthProjection[];
  totals: ProjectionTotals;
};

function ratio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

/**
 * Proyección de un año con el calendario tipo: cada mes se parte en
 * segmentos (con/sin evento × entre semana/fin de semana), a cada segmento se
 * le aplica el mismo `quoteScenario` que ve el evaluador, y se suma
 * ocupación × tarifa. Las comisiones se calculan sobre el ingreso de
 * hospedaje del anfitrión.
 */
export function projectAnnualRevenue(baseRate: number, baseOccupancy: number): AnnualProjection {
  let cumulativeSavingsCents = 0;

  const months = PARRAS_CALENDAR.map((month): MonthProjection => {
    const parts: { event: EventLevel; nights: number }[] = [
      { event: month.event, nights: month.eventNights },
      { event: "ninguno", nights: month.nights - month.eventNights },
    ];

    let occupiedNights = 0;
    let revenueCents = 0;
    for (const part of parts) {
      if (part.nights <= 0) continue;
      for (const dayType of DAY_TYPES) {
        const quote = quoteScenario(baseRate, {
          season: month.season,
          dayType: dayType.value,
          event: part.event,
          baseOccupancy,
        });
        const soldNights = part.nights * DAY_SHARES[dayType.value] * quote.expectedOccupancy;
        occupiedNights += soldNights;
        revenueCents += Math.round(soldNights * quote.rateCents);
      }
    }

    const phhFeeCents = commissionCents(revenueCents, PHH_COMMISSION_RATE);
    const airbnbFeeCents = commissionCents(revenueCents, AIRBNB_HOST_FEE_RATE);
    const savingsCents = airbnbFeeCents - phhFeeCents;
    cumulativeSavingsCents += savingsCents;

    return {
      month,
      availableNights: month.nights,
      occupiedNights,
      occupancy: ratio(occupiedNights, month.nights),
      adrCents: Math.round(ratio(revenueCents, occupiedNights)),
      revenueCents,
      phhFeeCents,
      airbnbFeeCents,
      savingsCents,
      cumulativeSavingsCents,
    };
  });

  return { months, totals: sumProjections(months) };
}

function sumProjections(
  rows: readonly Pick<
    ProjectionTotals,
    "availableNights" | "occupiedNights" | "revenueCents" | "phhFeeCents" | "airbnbFeeCents" | "savingsCents"
  >[]
): ProjectionTotals {
  const totals = rows.reduce(
    (acc, row) => ({
      availableNights: acc.availableNights + row.availableNights,
      occupiedNights: acc.occupiedNights + row.occupiedNights,
      revenueCents: acc.revenueCents + row.revenueCents,
      phhFeeCents: acc.phhFeeCents + row.phhFeeCents,
      airbnbFeeCents: acc.airbnbFeeCents + row.airbnbFeeCents,
      savingsCents: acc.savingsCents + row.savingsCents,
    }),
    { availableNights: 0, occupiedNights: 0, revenueCents: 0, phhFeeCents: 0, airbnbFeeCents: 0, savingsCents: 0 }
  );

  return {
    ...totals,
    occupancy: ratio(totals.occupiedNights, totals.availableNights),
    adrCents: Math.round(ratio(totals.revenueCents, totals.occupiedNights)),
    revparCents: Math.round(ratio(totals.revenueCents, totals.availableNights)),
  };
}

/**
 * Agrega las proyecciones de varias propiedades: la ocupación y el RevPAR del
 * portafolio se ponderan por noches disponibles (Σ ingreso ÷ Σ noches), no se
 * promedian propiedad por propiedad — una casa de 3 huéspedes no pesa igual
 * que una de 14 en ingreso, pero sí en noches, que es lo que mide el RevPAR.
 */
export function summarizePortfolio(projections: readonly AnnualProjection[]): ProjectionTotals {
  return sumProjections(projections.map((projection) => projection.totals));
}
