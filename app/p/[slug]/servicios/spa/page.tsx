import { notFound } from "next/navigation";
import { getSessionUser, serverFetchAll } from "@/lib/api/server";
import { getActiveReservation } from "@/lib/reservations";
import { RESERVATION_REQUIRED_ERROR } from "@/lib/checkout-errors";
import { getPropertyBySlug, TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";
import SpaBookingForm from "@/components/SpaBookingForm";
import ServiceAccessNotice from "@/components/ServiceAccessNotice";
import BackButton from "@/components/BackButton";
import type { SpaAvailability, SpaMasseuse } from "@/lib/api/types";

export default async function SpaServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);

  if (!property) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">SPA / Masajes</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Elige tu masajista, día y hora para tu sesión.
        </p>
      </div>

      {slug === TENANT_ZERO_SLUG ? (
        <CasaBravaSpaForm slug={slug} />
      ) : (
        <ServiceAccessNotice
          title="Servicios próximamente para esta propiedad"
          description="Esta propiedad todavía no ofrece SPA a través de Parras Home Hub."
          actionHref={`/p/${slug}`}
          actionLabel="Volver a la propiedad"
        />
      )}
    </div>
  );
}

/** Lógica real, movida tal cual desde el antiguo app/servicios/spa/page.tsx. */
async function CasaBravaSpaForm({ slug }: { slug: string }) {
  // `serverFetchAll` sigue el enlace `next` de la paginación hasta agotarla.
  // No es opcional aquí: la disponibilidad de spa supera con facilidad los 50
  // registros por página del backend, y quedarse con la primera dejaría fuera
  // los días más lejanos sin ningún error visible.
  //
  // El filtrado de bloques ocupados y días pasados ya lo hace el backend para
  // un huésped (ver SpaAvailabilityViewSet.get_queryset) — el frontend no
  // repite ese criterio. La garantía real contra el doble-booking sigue
  // estando en el alta del booking, bajo bloqueo de fila.
  const [masseuses, availability, user, activeReservation] = await Promise.all([
    serverFetchAll<SpaMasseuse>("/api/proveedores/masajistas/"),
    serverFetchAll<SpaAvailability>("/api/servicios/spa/disponibilidad/"),
    getSessionUser(),
    getActiveReservation(),
  ]);

  const activas = masseuses.filter((masseuse) => masseuse.status === "activo");

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
    <SpaBookingForm
      masseuses={activas.map(({ id, name }) => ({ id, name }))}
      availability={availability.map((slot) => ({
        masseuse_id: slot.masseuse,
        available_date: slot.available_date,
        available_time: slot.available_time,
      }))}
      stayCheckIn={activeReservation.check_in}
      stayCheckOut={activeReservation.check_out}
    />
  );
}
