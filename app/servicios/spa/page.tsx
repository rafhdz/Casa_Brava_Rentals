import { getSessionUser, serverFetchAll } from "@/lib/api/server";
import { getActiveReservation } from "@/lib/reservations";
import { RESERVATION_REQUIRED_ERROR } from "@/lib/checkout-errors";
import SpaBookingForm from "@/components/SpaBookingForm";
import ServiceAccessNotice from "@/components/ServiceAccessNotice";
import BackButton from "@/components/BackButton";
import type { SpaAvailability, SpaMasseuse } from "@/lib/api/types";

export default async function SpaServicePage() {
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">SPA / Masajes</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Elige tu masajista, día y hora para tu sesión.
        </p>
      </div>
      {user?.role === "admin" ? (
        <ServiceAccessNotice
          title="Los administradores no pueden reservar servicios"
          description="Esta vista es solo para huéspedes. Da de alta el servicio para el huésped desde el panel de reservaciones."
        />
      ) : !activeReservation ? (
        <ServiceAccessNotice
          title="Necesitas una estadía activa"
          description={RESERVATION_REQUIRED_ERROR}
          actionHref="/reservar"
          actionLabel="Reservar estadía"
        />
      ) : (
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
      )}
    </div>
  );
}
