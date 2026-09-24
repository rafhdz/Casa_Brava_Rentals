"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, SlidersHorizontal } from "lucide-react";
import RevenueSimulatorDrawer from "@/components/RevenueSimulatorDrawer";
import { formatMoney, formatPercent } from "@/lib/format";

/**
 * "Mis propiedades" del portal de anfitrión. Cada fila es de uno de dos
 * tipos, y el tipo decide qué acción ofrece — nunca un botón que no hace
 * nada:
 *
 * - `tenant-zero` (Casa Brava): la única respaldada por Django. Muestra el
 *   estado REAL del canal (la página lo verificó contra la API al renderizar)
 *   y enlaza a su panel de gestión, donde vive el CRUD de verdad.
 * - `simulated` (propiedades mock): abre el simulador de Revenue Management,
 *   que calcula en el cliente y no escribe nada.
 *
 * Los datos llegan ya resueltos y convertidos a number desde la página
 * (Server Component); aquí no hay fetch ni cálculo de negocio.
 */

type BaseRow = {
  id: string;
  name: string;
  locationName: string;
  isInviteOnly: boolean;
  maxGuests: number;
};

export type SupplierPropertyRow =
  | (BaseRow & {
      kind: "tenant-zero";
      online: boolean;
      /** Milisegundos que tardó Django en responder; `null` si no respondió. */
      latencyMs: number | null;
      /** Tarifa base leída de Django; `null` sin conexión (no se inventa). */
      nightlyRate: number | null;
      managementHref: string;
    })
  | (BaseRow & {
      kind: "simulated";
      nightlyRate: number;
      baselineOccupancy: number;
      projectedOccupancy: number;
    });

type SimulatedRow = Extract<SupplierPropertyRow, { kind: "simulated" }>;

function ChannelBadge({ row }: { row: SupplierPropertyRow }) {
  if (row.kind === "simulated") {
    return (
      <span className="inline-flex whitespace-nowrap rounded-full border border-neutral-300 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
        Simulación
      </span>
    );
  }

  return row.online ? (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700"
      title={row.latencyMs === null ? undefined : `Django respondió en ${row.latencyMs} ms`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-green-600" aria-hidden />
      En línea · Conectado a Django
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
      <span className="h-1.5 w-1.5 rounded-full bg-red-600" aria-hidden />
      Sin conexión con Django
    </span>
  );
}

export default function SupplierPropertiesTable({ rows }: { rows: SupplierPropertyRow[] }) {
  const [simulated, setSimulated] = useState<SimulatedRow | null>(null);
  const closeSimulator = useCallback(() => setSimulated(null), []);

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-3">Propiedad</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3 text-right">Tarifa base</th>
              <th className="px-4 py-3 text-right">Capacidad</th>
              <th className="px-4 py-3 text-right">Ocupación proyectada</th>
              <th className="px-4 py-3 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-neutral-900">{row.name}</div>
                  <div className="text-xs text-neutral-500">
                    {row.locationName} · {row.isInviteOnly ? "Por invitación" : "Abierta"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <ChannelBadge row={row} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-neutral-600">
                  {row.nightlyRate === null ? "—" : `${formatMoney(row.nightlyRate)} / noche`}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-neutral-600">
                  {row.maxGuests} huéspedes
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-neutral-600">
                  {row.kind === "simulated" ? (
                    formatPercent(row.projectedOccupancy)
                  ) : (
                    <span className="text-xs text-neutral-400">Datos reales en el panel</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    {row.kind === "tenant-zero" ? (
                      <Link
                        href={row.managementHref}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-neutral-900 px-4 py-2 text-xs font-semibold text-white transition-all duration-300 ease-in-out hover:bg-neutral-700 active:scale-95"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                        Panel de gestión
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSimulated(row)}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-neutral-300 px-4 py-2 text-xs font-medium text-neutral-700 transition-all duration-300 ease-in-out hover:border-neutral-900 hover:text-neutral-900 active:scale-95"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                        Simular tarifas
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {simulated && (
        <RevenueSimulatorDrawer
          // Montaje nuevo por propiedad: el estado del simulador se siembra en
          // los inicializadores de useState (mismo motivo que `key={row.id}`
          // en CatalogTable).
          key={simulated.id}
          propertyName={simulated.name}
          baseRate={simulated.nightlyRate}
          initialOccupancy={simulated.baselineOccupancy}
          onClose={closeSimulator}
        />
      )}
    </>
  );
}
