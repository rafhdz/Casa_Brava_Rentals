import { serverFetchAll } from "@/lib/api/server";
import { toNumber } from "@/lib/format";
import { getReservations } from "@/app/p/casa-brava/owner-panel/reservations/actions";
import ReservationsTable from "@/components/ReservationsTable";
import OwnerNav from "@/components/OwnerNav";
import type { FareType, PropertySettings, Usuario } from "@/lib/api/types";

export default async function OwnerPanelReservationsPage() {
  const [reservationsResult, guests, fareTypes, settings] = await Promise.all([
    getReservations(),
    serverFetchAll<Usuario>("/api/usuarios/").catch(() => null),
    serverFetchAll<FareType>("/api/propiedades/tarifas/").catch(() => null),
    serverFetchAll<PropertySettings>("/api/propiedades/configuracion/").catch(() => null),
  ]);

  const propertySettings = settings?.[0] ?? null;
  const hasError =
    "error" in reservationsResult || guests === null || fareTypes === null || propertySettings === null;

  return (
    <div className="mx-auto flex min-w-0 max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <OwnerNav />

      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Reservaciones</h1>
        <p className="mt-1 text-sm text-neutral-500">Casa Brava</p>
      </div>

      {hasError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudieron cargar los datos de reservaciones. Verifica que el backend esté corriendo
          e intenta recargar la página.
        </p>
      ) : (
        <ReservationsTable
          reservations={"data" in reservationsResult ? reservationsResult.data : []}
          guests={guests.map(({ id, nombre_completo, email }) => ({ id, nombre_completo, email }))}
          // Los decimales llegan como string desde DRF; se convierten aquí para
          // que el modal de creación calcule el total sugerido con números.
          fareTypes={fareTypes.map((fare) => ({
            id: fare.id,
            name: fare.name,
            surcharge_percentage: toNumber(fare.surcharge_percentage),
          }))}
          propertySettings={{
            nightly_rate: toNumber(propertySettings.nightly_rate),
            security_deposit: toNumber(propertySettings.security_deposit),
          }}
        />
      )}
    </div>
  );
}
