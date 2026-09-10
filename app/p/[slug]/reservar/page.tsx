import { notFound } from "next/navigation";
import { serverFetch, serverFetchAll } from "@/lib/api/server";
import { toNumber } from "@/lib/format";
import { getPropertyBySlug, TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";
import BackButton from "@/components/BackButton";
import ReservarForm from "@/components/ReservarForm";
import MockReservarForm from "@/components/MockReservarForm";
import type { BookedRange, FareType, PropertySettings } from "@/lib/api/types";

export default async function ReservarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);

  if (!property) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-10 sm:px-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Reservar tu estadía</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Selecciona tus fechas y el tipo de tarifa que mejor se ajuste a tu plan.
        </p>
      </div>

      {slug === TENANT_ZERO_SLUG ? (
        <CasaBravaReservarForm />
      ) : (
        <MockReservarForm property={property} />
      )}
    </div>
  );
}

/**
 * Lógica real (movida tal cual desde el antiguo app/reservar/page.tsx): sigue
 * siendo el único punto de esta ruta que habla con el backend. ReservarForm
 * en sí no necesitó cambios — solo redirige a /pago-exitoso, que sigue global.
 */
async function CasaBravaReservarForm() {
  const [fareTypes, settings, bookedRanges] = await Promise.all([
    serverFetchAll<FareType>("/api/propiedades/tarifas/"),
    serverFetchAll<PropertySettings>("/api/propiedades/configuracion/"),
    serverFetch<BookedRange[]>("/api/reservaciones/reservaciones/ocupadas/"),
  ]);

  const propertySettings = settings[0];

  return (
    <ReservarForm
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
  );
}
