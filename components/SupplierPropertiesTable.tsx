"use client";

import Link from "next/link";
import { toast } from "sonner";
import { CalendarDays, LayoutDashboard, Lock, PencilLine } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { ownerPanelRoutes } from "@/lib/owner-panel";
import { TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";
import type { Property } from "@/lib/types/marketplace";

// Tabla de solo lectura: no hay rol "anfitrión" en el backend todavía (usuarios.role
// solo conoce admin/holder/guest), así que no existe ningún endpoint contra el que
// escribir tarifas o calendarios por propiedad. Los botones no llaman a nada — avisan
// que la función llega con la integración real, en vez de fingir un CRUD que
// persistiría contra localStorage y se tiraría por completo en cuanto el backend
// soporte multi-tenant (ver CLAUDE.md, "Arquitectura multi-tenant").
//
// La excepción es "Panel de gestión": Tenant 0 (Casa Brava) SÍ tiene un panel
// real y construido (`/p/casa-brava/owner-panel`), y hasta ahora la única
// manera de llegar era escribiendo la URL a mano. Es navegación, no escritura,
// así que no cruza la frontera mock/real: las propiedades mock no obtienen un
// enlace a un panel inexistente, sino el mismo aviso de "próximamente" que el
// resto de sus acciones. Cuando exista el panel genérico por propiedad, esta
// bifurcación se reemplaza por `ownerPanelRoutes(property.slug)` para todas.
export default function SupplierPropertiesTable({ properties }: { properties: Property[] }) {
  function handleComingSoon(action: string) {
    toast(`${action}: disponible próximamente.`);
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3">Propiedad</th>
            <th className="px-4 py-3">Acceso</th>
            <th className="px-4 py-3">Tarifa base</th>
            <th className="px-4 py-3">Capacidad</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {properties.map((property) => {
            const tienePanel = property.slug === TENANT_ZERO_SLUG;

            return (
              <tr key={property.id}>
                <td className="px-4 py-3 font-medium text-neutral-900">{property.name}</td>
                <td className="px-4 py-3 text-neutral-600">
                  {property.accessType === "OPEN" ? "Abierta" : "Por invitación"}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {formatMoney(property.basePricePerNight)} MXN / noche
                </td>
                <td className="px-4 py-3 text-neutral-600">{property.maxGuests} huéspedes</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    {tienePanel ? (
                      <Link
                        href={ownerPanelRoutes(property.slug).root}
                        title={`Abrir el panel de gestión de ${property.name}`}
                        className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-300 ease-in-out hover:bg-neutral-700 active:scale-95"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                        Panel de gestión
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          handleComingSoon(`Panel de gestión de ${property.name}`)
                        }
                        title="Próximamente disponible"
                        className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-400 transition-colors hover:border-neutral-400 hover:text-neutral-600"
                      >
                        <Lock className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                        Panel de gestión
                        <span className="sr-only"> — próximamente disponible</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleComingSoon("Modificar tarifas")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900"
                    >
                      <PencilLine className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                      Tarifas
                    </button>
                    <button
                      type="button"
                      onClick={() => handleComingSoon("Consultar calendario")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900"
                    >
                      <CalendarDays className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                      Calendario
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
