"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import { AIRBNB_HOST_FEE_RATE, PHH_COMMISSION_RATE } from "@/lib/commission-rates";
import { formatMoney, formatPercent } from "@/lib/format";
import {
  DAY_TYPES,
  EVENTS,
  MULTIPLIER_CEILING,
  MULTIPLIER_FLOOR,
  SEASONS,
  occupancyTier,
  projectAnnualRevenue,
  quoteScenario,
  type DayType,
  type EventLevel,
  type ModelOption,
  type MonthProjection,
  type Season,
} from "@/lib/revenue-simulator";

/**
 * Simulador de Revenue Management de una propiedad **mock** del portal de
 * anfitrión. Todo el cálculo vive en lib/revenue-simulator.ts (el mismo
 * motor con el que la página arma las métricas de la cabecera); aquí solo hay
 * estado de los controles y presentación.
 *
 * No escribe nada, no llama a ninguna Server Action ni a la API: las
 * propiedades mock no existen en Django (ver CLAUDE.md, "Arquitectura
 * multi-tenant"). Por eso tampoco se ofrece para Casa Brava, que tiene su
 * panel de gestión real.
 */

const PILL_BASE =
  "inline-flex shrink-0 items-baseline gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-300 ease-in-out active:scale-95";
const PILL_ACTIVE = "border-neutral-900 bg-neutral-900 text-white";
const PILL_IDLE = "border-neutral-300 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900";

function formatMultiplier(value: number): string {
  return `×${value.toFixed(2)}`;
}

function formatSignedPercent(ratio: number): string {
  const sign = ratio > 0 ? "+" : ratio < 0 ? "−" : "±";
  return `${sign}${formatPercent(Math.abs(ratio))}`;
}

// Cierra con Escape — mismo patrón que los modales del owner-panel.
function useCloseOnEscape(onClose: () => void) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}

function OptionPills<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly ModelOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</legend>
      <div className="-mx-1 flex flex-wrap gap-2 px-1">
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={isActive}
              className={`${PILL_BASE} ${isActive ? PILL_ACTIVE : PILL_IDLE}`}
            >
              {option.label}
              <span className={`text-xs tabular-nums ${isActive ? "text-neutral-300" : "text-neutral-400"}`}>
                {formatMultiplier(option.multiplier)}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function MultiplierChip({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-neutral-200 bg-white px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{label}</span>
      <span className="text-base font-semibold tabular-nums text-neutral-900">{formatMultiplier(value)}</span>
      {note && <span className="truncate text-[11px] text-neutral-500">{note}</span>}
    </div>
  );
}

/**
 * Ocupación proyectada por mes (columnas, una sola serie): los meses de la
 * temporada elegida en el escenario van en el acento y el resto en gris
 * (forma "énfasis"), así el escenario puntual se ubica dentro del año. El
 * detalle de cada columna sale en la lectura de arriba al pasar el cursor o
 * al enfocarla con teclado, y la tabla mensual lo deja accesible sin hover.
 */
function OccupancyChart({ months, season }: { months: MonthProjection[]; season: Season }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const active = activeIndex === null ? null : months[activeIndex];

  return (
    <div className="flex flex-col gap-3">
      <p aria-live="polite" className="min-h-10 text-sm text-neutral-600">
        {active ? (
          <>
            <span className="font-semibold text-neutral-900">{formatPercent(active.occupancy)}</span>{" "}
            de ocupación en {active.month.label.toLowerCase()} · ADR{" "}
            <span className="font-semibold text-neutral-900">{formatMoney(active.adrCents / 100)}</span>
            <br />
            <span className="text-xs text-neutral-500">
              Temporada {active.month.season}
              {active.month.eventNights > 0 && ` · ${active.month.eventNights} noches de Feria de la Uva`}
            </span>
          </>
        ) : (
          <span className="text-xs text-neutral-500">
            Pasa el cursor o navega con Tab sobre una columna para ver el detalle del mes.
          </span>
        )}
      </p>

      <div className="relative h-40">
        {/* Líneas guía de 50 % y 100 %: hairline sólida, recesiva. */}
        {[1, 0.5].map((level) => (
          <div
            key={level}
            className="pointer-events-none absolute inset-x-0 border-t border-neutral-100"
            style={{ bottom: `${level * 100}%` }}
          >
            <span className="absolute -top-2 right-0 bg-white pl-1 text-[10px] tabular-nums text-neutral-400">
              {formatPercent(level, 0)}
            </span>
          </div>
        ))}

        <ul className="relative flex h-full items-end gap-0.5 border-b border-neutral-200 pr-8">
          {months.map((row, index) => {
            const isEmphasized = row.month.season === season;
            const isActive = index === activeIndex;
            return (
              <li
                key={row.month.label}
                tabIndex={0}
                aria-label={`${row.month.label}: ${formatPercent(row.occupancy)} de ocupación, ADR ${formatMoney(
                  row.adrCents / 100
                )}`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                className="flex h-full flex-1 cursor-default items-end justify-center rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
              >
                <span
                  aria-hidden
                  className={`block w-full max-w-6 rounded-t transition-all duration-300 ${
                    isEmphasized ? "bg-neutral-900" : "bg-neutral-300"
                  } ${isActive ? "opacity-70" : ""}`}
                  style={{ height: `${row.occupancy * 100}%` }}
                />
              </li>
            );
          })}
        </ul>
      </div>

      <div aria-hidden className="flex gap-0.5 pr-8">
        {months.map((row) => (
          <span key={row.month.label} className="flex-1 text-center text-[10px] text-neutral-500">
            {row.month.shortLabel}
          </span>
        ))}
      </div>
    </div>
  );
}

function CommissionComparison({
  phhFeeCents,
  airbnbFeeCents,
  savingsCents,
}: {
  phhFeeCents: number;
  airbnbFeeCents: number;
  savingsCents: number;
}) {
  const phhWidth = airbnbFeeCents > 0 ? (phhFeeCents / airbnbFeeCents) * 100 : 0;
  const rows = [
    {
      label: `Airbnb (${formatPercent(AIRBNB_HOST_FEE_RATE, 0)})`,
      cents: airbnbFeeCents,
      width: 100,
      barClass: "bg-neutral-300",
    },
    {
      label: `Parras Home Hub (${formatPercent(PHH_COMMISSION_RATE, 0)})`,
      cents: phhFeeCents,
      width: phhWidth,
      barClass: "bg-neutral-900",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Ahorro anual acumulado frente a Airbnb
        </p>
        <p className="mt-1 text-4xl font-semibold text-neutral-900">{formatMoney(savingsCents / 100)}</p>
      </div>
      <dl className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <dt className="text-neutral-600">Comisión {row.label}</dt>
              <dd className="font-medium tabular-nums text-neutral-900">{formatMoney(row.cents / 100)}</dd>
            </div>
            <div aria-hidden className="h-2 w-full rounded-full bg-neutral-100">
              <div className={`h-2 rounded-full ${row.barClass}`} style={{ width: `${row.width}%` }} />
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

const SEASON_LABELS: Record<Season, string> = { baja: "Baja", media: "Media", alta: "Alta" };

export default function RevenueSimulatorDrawer({
  propertyName,
  baseRate,
  initialOccupancy,
  onClose,
}: {
  propertyName: string;
  /** Tarifa base por noche, en pesos (ya convertida a number). */
  baseRate: number;
  /** Ocupación base sugerida (0–1), la misma de la tabla del portal. */
  initialOccupancy: number;
  onClose: () => void;
}) {
  const [season, setSeason] = useState<Season>("alta");
  const [dayType, setDayType] = useState<DayType>("fin-de-semana");
  const [event, setEvent] = useState<EventLevel>("ninguno");
  const [occupancyPercent, setOccupancyPercent] = useState(() => Math.round(initialOccupancy * 100));

  useCloseOnEscape(onClose);

  const baseOccupancy = occupancyPercent / 100;
  const quote = quoteScenario(baseRate, { season, dayType, event, baseOccupancy });
  // La proyección anual recorre 12 meses × segmentos: solo depende de la
  // tarifa y la ocupación base, no de los tres selectores del escenario.
  const projection = useMemo(
    () => projectAnnualRevenue(baseRate, baseOccupancy),
    [baseRate, baseOccupancy]
  );
  const { totals } = projection;
  const rateDelta = quote.baseRateCents > 0 ? quote.rateCents / quote.baseRateCents - 1 : 0;
  const tier = occupancyTier(quote.expectedOccupancy);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm [animation:fade-in_200ms_ease-out]"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="revenue-simulator-title"
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl [animation:drawer-in_200ms_ease-out]"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-neutral-200 bg-white px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Simulador de Revenue Management
            </p>
            <h2 id="revenue-simulator-title" className="truncate text-lg font-semibold text-neutral-900">
              {propertyName}
            </h2>
            <p className="text-sm text-neutral-500">Tarifa base {formatMoney(baseRate)} MXN / noche</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar simulador"
            className="rounded-full p-2 text-neutral-500 transition-all duration-300 ease-in-out hover:bg-neutral-100 hover:text-neutral-900 active:scale-95"
          >
            <X className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </button>
        </header>

        <div className="flex flex-col gap-8 px-5 py-6 sm:px-6">
          {/* --- Escenario: una noche concreta --------------------------------- */}
          <section aria-labelledby="scenario-title" className="flex flex-col gap-5">
            <div>
              <h3 id="scenario-title" className="text-base font-semibold text-neutral-900">
                Escenario de una noche
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                Tarifa dinámica = base × M<sub>temporada</sub> × M<sub>día</sub> × M<sub>ocupación</sub> ×
                M<sub>evento</sub>, acotada entre {formatMultiplier(MULTIPLIER_FLOOR)} y{" "}
                {formatMultiplier(MULTIPLIER_CEILING)}.
              </p>
            </div>

            <OptionPills label="Temporada" options={SEASONS} value={season} onChange={setSeason} />
            <OptionPills label="Día" options={DAY_TYPES} value={dayType} onChange={setDayType} />
            <OptionPills label="Evento" options={EVENTS} value={event} onChange={setEvent} />

            <label className="flex flex-col gap-2">
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Ocupación base (temporada media)
                </span>
                <span className="text-sm font-semibold tabular-nums text-neutral-900">{occupancyPercent}%</span>
              </span>
              <input
                type="range"
                min={20}
                max={90}
                step={5}
                value={occupancyPercent}
                onChange={(e) => setOccupancyPercent(Number(e.target.value))}
                className="w-full accent-neutral-900"
              />
            </label>

            <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="grid grid-cols-2 gap-2">
                <MultiplierChip label="Temporada" value={quote.multipliers.temporada} />
                <MultiplierChip label="Día" value={quote.multipliers.dia} />
                <MultiplierChip
                  label="Ocupación"
                  value={quote.multipliers.ocupacion}
                  note={`${tier.label} · ${formatPercent(quote.expectedOccupancy, 0)}`}
                />
                <MultiplierChip label="Evento" value={quote.multipliers.evento} />
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-neutral-500">
                    Multiplicador aplicado {formatMultiplier(quote.appliedMultiplier)}
                    {quote.cappedBy &&
                      ` · ${quote.cappedBy} aplicado (sin tope ${formatMultiplier(quote.rawMultiplier)})`}
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-neutral-900">
                    {formatMoney(quote.rateCents / 100)}
                    <span className="text-sm font-medium text-neutral-500"> / noche</span>
                  </p>
                </div>
                <p className="text-sm font-medium text-neutral-600">
                  {formatSignedPercent(rateDelta)} vs. tarifa base
                </p>
              </div>
            </div>
          </section>

          {/* --- Proyección anual ---------------------------------------------- */}
          <section aria-labelledby="projection-title" className="flex flex-col gap-5">
            <div>
              <h3 id="projection-title" className="text-base font-semibold text-neutral-900">
                Proyección anual
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                Los mismos multiplicadores aplicados mes a mes sobre el calendario tipo de Parras.
                En negro, los meses de temporada {SEASON_LABELS[season].toLowerCase()}.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Ocupación promedio" value={formatPercent(totals.occupancy)} />
              <KpiCard label="ADR" value={formatMoney(totals.adrCents / 100)} detail="Tarifa media por noche vendida" />
              <KpiCard label="RevPAR" value={formatMoney(totals.revparCents / 100)} detail="Ingreso por noche disponible" />
              <KpiCard label="Ingreso bruto" value={formatMoney(totals.revenueCents / 100)} detail="Hospedaje, 12 meses" />
            </div>

            <OccupancyChart months={projection.months} season={season} />

            <CommissionComparison
              phhFeeCents={totals.phhFeeCents}
              airbnbFeeCents={totals.airbnbFeeCents}
              savingsCents={totals.savingsCents}
            />

            <details className="group rounded-xl border border-neutral-200">
              <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-neutral-700 hover:text-neutral-900">
                Ver tabla mensual
              </summary>
              <div className="overflow-x-auto border-t border-neutral-200">
                <table className="w-full min-w-[460px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 uppercase tracking-wide text-neutral-500">
                      <th className="px-3 py-2 font-medium">Mes</th>
                      <th className="px-3 py-2 text-right font-medium">Ocupación</th>
                      <th className="px-3 py-2 text-right font-medium">ADR</th>
                      <th className="px-3 py-2 text-right font-medium">Ingreso</th>
                      <th className="px-3 py-2 text-right font-medium">Ahorro acum.</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {projection.months.map((row) => (
                      <tr key={row.month.label} className="border-b border-neutral-100 last:border-0">
                        <td className="px-3 py-2">
                          <div className="font-medium text-neutral-900">{row.month.label}</div>
                          <div className="text-[11px] text-neutral-500">
                            {SEASON_LABELS[row.month.season]}
                            {row.month.eventNights > 0 && " + Feria"}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-600">{formatPercent(row.occupancy)}</td>
                        <td className="px-3 py-2 text-right text-neutral-600">{formatMoney(row.adrCents / 100)}</td>
                        <td className="px-3 py-2 text-right text-neutral-600">
                          {formatMoney(row.revenueCents / 100)}
                        </td>
                        <td className="px-3 py-2 text-right text-neutral-900">
                          {formatMoney(row.cumulativeSavingsCents / 100)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          <p className="rounded-xl bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-500">
            Simulación con los supuestos del plan de negocio (multiplicadores, calendario de temporadas y
            demanda por calificación). No reserva ni guarda nada: esta propiedad todavía no está conectada al
            backend.
          </p>
        </div>
      </aside>
    </div>
  );
}
