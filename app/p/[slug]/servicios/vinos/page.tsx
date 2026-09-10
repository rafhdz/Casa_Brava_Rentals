import { notFound } from "next/navigation";
import { getSessionUser, serverFetchAll } from "@/lib/api/server";
import { getActiveReservation } from "@/lib/reservations";
import { RESERVATION_REQUIRED_ERROR } from "@/lib/checkout-errors";
import { toNumber } from "@/lib/format";
import { getPropertyBySlug, TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";
import WineBookingForm from "@/components/WineBookingForm";
import ServiceAccessNotice from "@/components/ServiceAccessNotice";
import BackButton from "@/components/BackButton";
import type { Wine, WinePackage } from "@/lib/api/types";

export default async function VinosServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);

  if (!property) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Paquete de Vinos</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Agrega botellas individuales o selecciona el paquete de 4 vinos.
        </p>
      </div>

      {slug === TENANT_ZERO_SLUG ? (
        <CasaBravaVinosForm slug={slug} />
      ) : (
        <ServiceAccessNotice
          title="Servicios próximamente para esta propiedad"
          description="Esta propiedad todavía no ofrece paquetes de vino a través de Parras Home Hub."
          actionHref={`/p/${slug}`}
          actionLabel="Volver a la propiedad"
        />
      )}
    </div>
  );
}

/** Lógica real, movida tal cual desde el antiguo app/servicios/vinos/page.tsx. */
async function CasaBravaVinosForm({ slug }: { slug: string }) {
  const [wines, winePackages, user, activeReservation] = await Promise.all([
    serverFetchAll<Wine>("/api/servicios/vinos/"),
    serverFetchAll<WinePackage>("/api/servicios/paquetes-vino/"),
    getSessionUser(),
    getActiveReservation(),
  ]);

  if (user?.role === "admin") {
    return (
      <ServiceAccessNotice
        title="Los administradores no pueden reservar servicios"
        description="Esta vista es solo para huéspedes. Da de alta el servicio para el huésped desde el panel de reservaciones."
      />
    );
  }

  if (!activeReservation) {
    return (
      <ServiceAccessNotice
        title="Necesitas una estadía activa"
        description={RESERVATION_REQUIRED_ERROR}
        actionHref={`/p/${slug}/reservar`}
        actionLabel="Reservar estadía"
      />
    );
  }

  return (
    <WineBookingForm
      // Solo se ofertan botellas con inventario; los precios llegan como
      // string decimal desde DRF y se convierten aquí.
      wines={wines
        .filter((wine) => wine.stock > 0)
        .map((wine) => ({
          id: wine.id,
          name: wine.name,
          type: wine.type,
          price: toNumber(wine.price),
        }))}
      winePackage={
        winePackages[0]
          ? {
              id: winePackages[0].id,
              name: winePackages[0].name,
              price: toNumber(winePackages[0].price),
            }
          : null
      }
    />
  );
}
