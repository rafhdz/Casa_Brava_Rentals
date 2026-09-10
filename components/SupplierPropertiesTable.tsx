"use client";

import { toast } from "sonner";
import { CalendarDays, PencilLine } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { Property } from "@/lib/types/marketplace";

// Tabla de solo lectura: no hay rol "anfitrión" en el backend todavía (usuarios.role
// solo conoce admin/holder/guest), así que no existe ningún endpoint contra el que
// escribir tarifas o calendarios por propiedad. Los botones no llaman a nada — avisan
// que la función llega con la integración real, en vez de fingir un CRUD que
// persistiría contra localStorage y se tiraría por completo en cuanto el backend
// soporte multi-tenant (ver CLAUDE.md, "Arquitectura multi-tenant").
export default function SupplierPropertiesTable({ properties }: { properties: Property[] }) {
  function handleComingSoon(action: string) {
    toast(`${action}: disponible próximamente.`);
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
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
          {properties.map((property) => (
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
                <div className="flex justify-end gap-2">
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
