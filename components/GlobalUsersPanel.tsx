"use client";

import { useMemo, useState } from "react";
import { parseISO } from "date-fns";
import type { ProfileStatus, RoleType, Usuario } from "@/lib/api/types";

/**
 * Usuario tal como lo expone `/api/usuarios/` para el panel universal de PHH
 * (`/admin`). Es el mismo `Usuario` real de la API (lib/api/types.ts) — no un
 * mock —, declarado aparte con este nombre solo para dejar constancia, en el
 * mismo espíritu documental que lib/types/marketplace.ts, de que HOY este
 * listado no distingue usuarios por propiedad: el backend sigue siendo de una
 * sola casa, así que "todos los usuarios del sistema" y "todos los usuarios
 * de Casa Brava" son, en la práctica, la misma colección servida por
 * `/api/usuarios/`. El día que el backend modele multi-tenant, este alias se
 * reemplaza por un tipo con datos propios (ej. `properties: string[]`), no
 * por un fetch adicional.
 */
export type GlobalUser = Usuario;

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

export default function GlobalUsersPanel({ users }: { users: GlobalUser[] }) {
  const [roleFilter, setRoleFilter] = useState<RoleType | "todos">("todos");
  const [statusFilter, setStatusFilter] = useState<ProfileStatus | "todos">("todos");

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          (roleFilter === "todos" || user.role === roleFilter) &&
          (statusFilter === "todos" || user.status === statusFilter)
      ),
    [users, roleFilter, statusFilter]
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

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Correo</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Fecha de registro</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-neutral-500">
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
