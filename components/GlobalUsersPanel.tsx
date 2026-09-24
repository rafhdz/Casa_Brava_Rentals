"use client";

import { useMemo, useState, type ReactNode } from "react";
import { parseISO } from "date-fns";
import { BadgePercent, BedDouble, Repeat, Wallet, X } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import { PHH_COMMISSION_RATE } from "@/lib/commission-rates";
import { formatInteger, formatMoney, formatPercent } from "@/lib/format";
import {
  GUEST_LINK_LABELS,
  NEW_REGISTRATION_WINDOW_DAYS,
  type GlobalUser,
  type GuestLink,
  type PlatformMetrics,
  type PropertyOption,
} from "@/lib/platform-metrics";
import type { ProfileStatus, RoleType } from "@/lib/api/types";

/**
 * Panel universal de PHH (`/admin`): grid de KPIs de plataforma y la tabla de
 * usuarios con cuatro filtros instantáneos (Rol, Estado, Vínculo, Propiedad).
 *
 * Todo llega ya calculado desde el Server Component (app/admin/page.tsx):
 * las métricas en `metrics` y el vínculo/propiedades de cada usuario dentro
 * de `users`. Los filtros corren sobre esa lista en memoria — ni un
 * round-trip al backend por cambiar un filtro, y el filtrado y los conteos de
 * cada opción se resuelven en una sola pasada memoizada cada uno.
 *
 * Solo lectura a propósito: el CRUD de usuarios vive en el owner-panel de
 * Casa Brava; duplicarlo aquí sería una segunda fuente de verdad para la
 * misma escritura (ver CLAUDE.md, "Panel de Control PHH").
 */

const ALL = "todos";
type All = typeof ALL;

type Filters = {
  role: RoleType | All;
  status: ProfileStatus | All;
  link: GuestLink | All;
  /** Id de una propiedad real de Django. */
  property: string;
};

const INITIAL_FILTERS: Filters = { role: ALL, status: ALL, link: ALL, property: ALL };

const ROLE_LABELS: Record<RoleType, string> = {
  admin: "Admin",
  holder: "Propietario",
  guest: "Huésped",
};

const ROLE_BADGE_CLASSES: Record<RoleType, string> = {
  admin: "bg-neutral-900 text-white",
  holder: "bg-blue-100 text-blue-700",
  guest: "bg-neutral-100 text-neutral-700",
};

const STATUS_LABELS: Record<ProfileStatus, string> = {
  activo: "Activo",
  invitado: "Invitado",
};

const STATUS_BADGE_CLASSES: Record<ProfileStatus, string> = {
  activo: "bg-green-100 text-green-700",
  invitado: "bg-amber-100 text-amber-700",
};

const LINK_BADGE_CLASSES: Record<GuestLink, string> = {
  recurrente: "bg-violet-100 text-violet-700",
  "con-reservacion": "bg-sky-100 text-sky-700",
  "sin-reservacion": "bg-neutral-100 text-neutral-500",
};

const SELECT_CLASS =
  "w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 transition-all duration-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900";

function Badge({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

// `created_at` es un IsoDateTime (con hora), no un IsoDate — parseISO lo
// interpreta en la zona horaria correcta sin el desfase de `new Date("yyyy-MM-dd")`
// (ver CLAUDE.md, sección de fechas).
function formatRegistrationDate(value: string): string {
  return parseISO(value).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type SelectOption<T extends string> = { value: T; label: string; count?: number };

function FilterSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</span>
      <select
        id={id}
        value={value}
        // El valor siempre sale de `options`, que está tipado como T.
        onChange={(e) => onChange(e.target.value as T)}
        className={SELECT_CLASS}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.count === undefined ? option.label : `${option.label} (${option.count})`}
          </option>
        ))}
      </select>
    </label>
  );
}

function PlatformKpis({ metrics }: { metrics: PlatformMetrics }) {
  const { occupancy, cohorts } = metrics;

  return (
    <section aria-labelledby="platform-kpis-title" className="flex flex-col gap-3">
      <div>
        <h2 id="platform-kpis-title" className="text-lg font-semibold text-neutral-900">
          Métricas de plataforma
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Reservaciones confirmadas y finalizadas; los montos son los que calcula el backend.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="GMV histórico"
          icon={Wallet}
          value={formatMoney(metrics.gmvCents / 100)}
          detail={
            <>
              {plural(metrics.gmvReservations, "estancia", "estancias")} · ticket promedio{" "}
              {formatMoney(metrics.averageTicketCents / 100)}
              {metrics.exemptReservations > 0 &&
                ` · ${plural(
                  metrics.exemptReservations,
                  "estancia exenta de propietario queda",
                  "estancias exentas de propietario quedan"
                )} fuera del GMV`}
            </>
          }
        />
        <KpiCard
          label={`Take-rate capturado (${formatPercent(PHH_COMMISSION_RATE, 0)})`}
          icon={BadgePercent}
          value={formatMoney(metrics.takeRateCents / 100)}
          detail="Proyección de la comisión PHH sobre el GMV; el backend aún no la liquida."
        />
        <KpiCard
          label={`Ocupación agregada ${occupancy.year}`}
          icon={BedDouble}
          value={formatPercent(occupancy.rate)}
          detail={`${formatInteger(occupancy.bookedNights)} de ${plural(
            occupancy.availableNights,
            "noche",
            "noches"
          )} · ${plural(occupancy.propertyCount, "propiedad", "propiedades")}`}
        />
        <KpiCard
          label="Cohortes de huéspedes"
          icon={Repeat}
          value={
            <>
              {formatInteger(cohorts.recurrent)}
              <span className="text-sm font-medium text-neutral-500">
                {cohorts.recurrent === 1 ? " recurrente" : " recurrentes"}
              </span>
              <span className="text-neutral-400"> · </span>
              {formatInteger(cohorts.newRegistrations)}
              <span className="text-sm font-medium text-neutral-500">
                {cohorts.newRegistrations === 1 ? " nuevo" : " nuevos"}
              </span>
            </>
          }
          detail={`Recurrentes: más de una estancia concluida (${formatPercent(
            cohorts.recurrenceRate
          )} de ${plural(cohorts.withConcludedStay, "huésped", "huéspedes")} con estancia). Nuevos: altas de huésped en ${NEW_REGISTRATION_WINDOW_DAYS} días.`}
        />
      </div>
    </section>
  );
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${formatInteger(count)} ${count === 1 ? singular : pluralForm}`;
}

function increment(counts: Map<string, number>, key: string) {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

export default function GlobalUsersPanel({
  users,
  properties,
  metrics,
}: {
  users: GlobalUser[];
  properties: PropertyOption[];
  metrics: PlatformMetrics;
}) {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);

  // Conteo por opción de cada filtro, sobre la lista completa: una sola
  // pasada que solo se repite si cambia `users` (no al mover un filtro).
  const counts = useMemo(() => {
    const role = new Map<string, number>();
    const status = new Map<string, number>();
    const link = new Map<string, number>();
    const property = new Map<string, number>();
    for (const user of users) {
      increment(role, user.role);
      increment(status, user.status);
      increment(link, user.link);
      for (const propertyId of user.propertyIds) increment(property, propertyId);
    }
    return { role, status, link, property };
  }, [users]);

  const propertyNames = useMemo(
    () => new Map(properties.map((property) => [property.id, property.name])),
    [properties]
  );

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          (filters.role === ALL || user.role === filters.role) &&
          (filters.status === ALL || user.status === filters.status) &&
          (filters.link === ALL || user.link === filters.link) &&
          (filters.property === ALL || user.propertyIds.includes(filters.property))
      ),
    [users, filters]
  );

  const hasActiveFilters = Object.values(filters).some((value) => value !== ALL);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }

  const roleOptions: SelectOption<RoleType | All>[] = [
    { value: ALL, label: "Todos los roles" },
    ...(Object.keys(ROLE_LABELS) as RoleType[]).map((role) => ({
      value: role,
      label: ROLE_LABELS[role],
      count: counts.role.get(role) ?? 0,
    })),
  ];
  const statusOptions: SelectOption<ProfileStatus | All>[] = [
    { value: ALL, label: "Todos los estados" },
    ...(Object.keys(STATUS_LABELS) as ProfileStatus[]).map((status) => ({
      value: status,
      label: STATUS_LABELS[status],
      count: counts.status.get(status) ?? 0,
    })),
  ];
  const linkOptions: SelectOption<GuestLink | All>[] = [
    { value: ALL, label: "Todos los vínculos" },
    ...(Object.keys(GUEST_LINK_LABELS) as GuestLink[]).map((link) => ({
      value: link,
      label: GUEST_LINK_LABELS[link],
      count: counts.link.get(link) ?? 0,
    })),
  ];
  const propertyOptions: SelectOption<string>[] = [
    { value: ALL, label: "Todas las propiedades" },
    ...properties.map((property) => ({
      value: property.id,
      label: property.name,
      count: counts.property.get(property.id) ?? 0,
    })),
  ];

  return (
    <div className="flex flex-col gap-10">
      <PlatformKpis metrics={metrics} />

      <section aria-labelledby="platform-users-title" className="flex flex-col gap-4">
        <h2 id="platform-users-title" className="text-lg font-semibold text-neutral-900">
          Usuarios
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            id="filter-role"
            label="Rol"
            value={filters.role}
            options={roleOptions}
            onChange={(value) => setFilter("role", value)}
          />
          <FilterSelect
            id="filter-status"
            label="Estado"
            value={filters.status}
            options={statusOptions}
            onChange={(value) => setFilter("status", value)}
          />
          <FilterSelect
            id="filter-link"
            label="Vínculo"
            value={filters.link}
            options={linkOptions}
            onChange={(value) => setFilter("link", value)}
          />
          <FilterSelect
            id="filter-property"
            label="Propiedad"
            value={filters.property}
            options={propertyOptions}
            onChange={(value) => setFilter("property", value)}
          />
        </div>

        <div className="flex min-h-8 items-center justify-between gap-3">
          <p aria-live="polite" className="text-sm text-neutral-500">
            Mostrando {formatInteger(filteredUsers.length)} de {formatInteger(users.length)} usuarios
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => setFilters(INITIAL_FILTERS)}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-neutral-600 transition-all duration-300 ease-in-out hover:text-neutral-900 active:scale-95"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Vínculo</th>
                <th className="px-4 py-3 font-medium">Propiedades</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium">Registro</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-neutral-500">
                    Ningún usuario coincide con estos filtros.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-900">{user.nombre_completo}</div>
                      <div className="text-xs text-neutral-500">{user.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={ROLE_BADGE_CLASSES[user.role]}>{ROLE_LABELS[user.role]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_BADGE_CLASSES[user.status]}>
                        {STATUS_LABELS[user.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={LINK_BADGE_CLASSES[user.link]}>{GUEST_LINK_LABELS[user.link]}</Badge>
                      {user.concludedStays > 0 && (
                        <div className="mt-1 text-xs text-neutral-500">
                          {user.concludedStays}{" "}
                          {user.concludedStays === 1 ? "estancia concluida" : "estancias concluidas"}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {user.propertyIds.length === 0
                        ? "—"
                        : user.propertyIds
                            .map((propertyId) => propertyNames.get(propertyId) ?? "Propiedad")
                            .join(", ")}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-600">
                      {formatRegistrationDate(user.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
