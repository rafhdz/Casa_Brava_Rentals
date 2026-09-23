"use client";

import { useMemo, useState } from "react";
import { parseISO } from "date-fns";
import { NO_PROPERTIES_LABEL, PLATFORM_SCOPE_LABEL } from "@/lib/user-properties";
import type { ProfileStatus, RoleType, Usuario } from "@/lib/api/types";
import type { UserPropertyLink, UserPropertyScope } from "@/lib/types/marketplace";

/**
 * Usuario del panel universal de PHH (`/admin`): el `Usuario` real de la API
 * (lib/api/types.ts) más el vínculo con el directorio de propiedades, que la
 * API **no** devuelve y la página deriva en el servidor con
 * `attachPropertyScopes()` (ver lib/user-properties.ts para de dónde sale cada
 * mitad y qué tan real es).
 *
 * La relación se modela aquí y en lib/types/marketplace.ts, nunca dentro de
 * lib/api/types.ts: ese archivo es la transcripción de lo que responde Django,
 * y `propertyScope` no es un campo de ninguna respuesta suya. Mezclarlos haría
 * imposible distinguir, al leer el tipo, qué llegó del backend y qué armó el
 * frontend.
 */
export type GlobalUser = Usuario & { propertyScope: UserPropertyScope };

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

const ROLE_FILTERS: Array<{ value: RoleType | "todos"; label: string }> = [
  { value: "todos", label: "Todos los roles" },
  { value: "admin", label: "Admin" },
  { value: "holder", label: "Propietario" },
  { value: "guest", label: "Huésped" },
];

const STATUS_FILTERS: Array<{ value: ProfileStatus | "todos"; label: string }> = [
  { value: "todos", label: "Todos los estados" },
  { value: "activo", label: "Activo" },
  { value: "invitado", label: "Invitado" },
];

/**
 * Segmentación por **tipo de vínculo** con el directorio, que no es lo mismo
 * que el rol: "con estadía activa" cruza huéspedes y propietarios, y "sin
 * propiedades" aísla a las cuentas que se registraron pero nunca reservaron.
 */
type LinkFilter = "todos" | "platform" | "owner" | "estadia-activa" | "sin-propiedades";

const LINK_FILTERS: Array<{ value: LinkFilter; label: string }> = [
  { value: "todos", label: "Todos los vínculos" },
  { value: "platform", label: "Plataforma PHH (global)" },
  { value: "owner", label: "Propietarios de una propiedad" },
  { value: "estadia-activa", label: "Con estadía activa" },
  { value: "sin-propiedades", label: "Sin propiedades asociadas" },
];

const TODAS_LAS_PROPIEDADES = "todas";

function RoleBadge({ role }: { role: RoleType }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_BADGE_CLASSES[role]}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

function StatusBadge({ status }: { status: ProfileStatus }) {
  const isActivo = status === "activo";
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActivo ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/**
 * Celda "Propiedades / Reservas".
 *
 * El administrador de PHH no lleva badge de reservación: no participa en
 * estadías ni pertenece a una propiedad, así que pintarle un estado operativo
 * —aunque fuera "sin reservaciones"— insinuaría un ciclo de vida que no tiene.
 * Lleva un distintivo neutro, deliberadamente distinto de los colores de
 * estadía, con el mismo criterio que el badge `na` de pagos en
 * ReservationsTable.tsx: se lee como "no aplica", no como una variante de otro
 * estado.
 */
function PropertyScopeCell({ scope }: { scope: UserPropertyScope }) {
  if (scope.scope === "platform") {
    return (
      <span className="inline-flex rounded-full border border-neutral-300 bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700">
        {PLATFORM_SCOPE_LABEL}
      </span>
    );
  }

  if (scope.links.length === 0) {
    return <span className="text-xs text-neutral-400">{NO_PROPERTIES_LABEL}</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {scope.links.map((link) => (
        <PropertyChip key={link.propertySlug} link={link} />
      ))}
    </div>
  );
}

function PropertyChip({ link }: { link: UserPropertyLink }) {
  const detalle =
    link.kind === "owner"
      ? "Propietario"
      : link.hasActiveStay
        ? "Estadía activa"
        : "Estadía pasada";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        link.hasActiveStay
          ? "bg-green-100 text-green-700"
          : "bg-neutral-100 text-neutral-700"
      }`}
    >
      {link.propertyName}
      <span className="font-normal opacity-70">· {detalle}</span>
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

function FilterPills<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div aria-label={ariaLabel} className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            className={`inline-flex shrink-0 items-center rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300 ease-in-out active:scale-95 ${
              isActive
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Los dos filtros con más opciones van en `<select>`: como pastillas no cabrían. */
function FilterSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-xs">
      <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 transition-all duration-300 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-neutral-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function cumpleFiltroDeVinculo(scope: UserPropertyScope, filter: LinkFilter): boolean {
  switch (filter) {
    case "todos":
      return true;
    case "platform":
      return scope.scope === "platform";
    case "owner":
      return scope.scope === "properties" && scope.links.some((link) => link.kind === "owner");
    case "estadia-activa":
      return scope.scope === "properties" && scope.links.some((link) => link.hasActiveStay);
    case "sin-propiedades":
      return scope.scope === "properties" && scope.links.length === 0;
  }
}

export default function GlobalUsersPanel({ users }: { users: GlobalUser[] }) {
  const [roleFilter, setRoleFilter] = useState<RoleType | "todos">("todos");
  const [statusFilter, setStatusFilter] = useState<ProfileStatus | "todos">("todos");
  const [linkFilter, setLinkFilter] = useState<LinkFilter>("todos");
  const [propertyFilter, setPropertyFilter] = useState<string>(TODAS_LAS_PROPIEDADES);

  // Las opciones salen de los vínculos ya calculados, no de una lista aparte
  // de propiedades: así el select nunca ofrece una propiedad que dejaría la
  // tabla vacía, y una propiedad nueva —mock o servida por Django— aparece
  // sola en cuanto alguien queda vinculado a ella.
  const propertyOptions = useMemo(() => {
    const porSlug = new Map<string, string>();
    for (const user of users) {
      if (user.propertyScope.scope !== "properties") continue;
      for (const link of user.propertyScope.links) {
        porSlug.set(link.propertySlug, link.propertyName);
      }
    }

    return [
      { value: TODAS_LAS_PROPIEDADES, label: "Todas las propiedades" },
      ...[...porSlug.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    ];
  }, [users]);

  // Todo el filtrado corre aquí, en el navegador, sobre la lista que la página
  // ya trajo: cambiar de pastilla o de select no dispara ninguna petición.
  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const scope = user.propertyScope;
        const coincideLaPropiedad =
          propertyFilter === TODAS_LAS_PROPIEDADES ||
          (scope.scope === "properties" &&
            scope.links.some((link) => link.propertySlug === propertyFilter));

        return (
          (roleFilter === "todos" || user.role === roleFilter) &&
          (statusFilter === "todos" || user.status === statusFilter) &&
          cumpleFiltroDeVinculo(scope, linkFilter) &&
          coincideLaPropiedad
        );
      }),
    [users, roleFilter, statusFilter, linkFilter, propertyFilter]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterPills
          ariaLabel="Filtrar por rol"
          options={ROLE_FILTERS}
          value={roleFilter}
          onChange={setRoleFilter}
        />
        <FilterPills
          ariaLabel="Filtrar por estado"
          options={STATUS_FILTERS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <FilterSelect
          label="Vínculo"
          options={LINK_FILTERS}
          value={linkFilter}
          onChange={setLinkFilter}
        />
        <FilterSelect
          label="Propiedad asociada"
          options={propertyOptions}
          value={propertyFilter}
          onChange={setPropertyFilter}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Correo</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Propiedades / Reservas</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Fecha de registro</th>
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
                  <td className="px-4 py-3 font-medium text-neutral-900">{user.nombre_completo}</td>
                  <td className="px-4 py-3 text-neutral-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3">
                    <PropertyScopeCell scope={user.propertyScope} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {formatRegistrationDate(user.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
