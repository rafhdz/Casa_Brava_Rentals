import { serverFetch, serverFetchAll } from "@/lib/api/server";
import { toNumber } from "@/lib/format";
import BackButton from "@/components/BackButton";
import ReservarForm from "@/components/ReservarForm";
import type { BookedRange, FareType, PropertySettings } from "@/lib/api/types";

export default async function ReservarPage() {
  const [fareTypes, settings, bookedRanges] = await Promise.all([
    serverFetchAll<FareType>("/api/propiedades/tarifas/"),
    // `configuracion` es una colección de una sola fila (la casa es una sola);
    // el backend no expone un endpoint singular, así que se toma la primera.
    serverFetchAll<PropertySettings>("/api/propiedades/configuracion/"),
    // Ayuda de UX: pinta en gris las fechas de cualquier reservación activa
    // (pendiente o confirmada) para que nadie pierda tiempo eligiendo un
    // rango que el servidor va a rechazar. NO es la protección contra el
    // doble-booking — esa vive en el alta de la reservación, que verifica el
    // solapamiento bajo bloqueo de fila.
    serverFetch<BookedRange[]>("/api/reservaciones/reservaciones/ocupadas/"),
  ]);

  const propertySettings = settings[0];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-10 sm:px-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Reservar tu estadía</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Selecciona tus fechas y el tipo de tarifa que mejor se ajuste a tu plan.
        </p>
      </div>
      <ReservarForm
        // Los montos y porcentajes llegan como string decimal desde DRF (ver
        // el tipo `Decimal` en lib/api/types.ts) y se convierten aquí, para que
        // los componentes de presentación sigan recibiendo números.
        fareTypes={fareTypes.map((fare) => ({
          id: fare.id,
          name: fare.name,
          surcharge_percentage: toNumber(fare.surcharge_percentage),
        }))}
        propertySettings={{
          nightly_rate: toNumber(propertySettings?.nightly_rate),
          security_deposit: toNumber(propertySettings?.security_deposit),
        }}
        bookedRanges={bookedRanges}
      />
    </div>
  );
}
