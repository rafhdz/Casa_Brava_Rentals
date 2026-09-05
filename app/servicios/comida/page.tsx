import { getSessionUser, serverFetchAll } from "@/lib/api/server";
import { getActiveReservation } from "@/lib/reservations";
import { RESERVATION_REQUIRED_ERROR } from "@/lib/checkout-errors";
import { toNumber } from "@/lib/format";
import FoodBookingForm from "@/components/FoodBookingForm";
import ServiceAccessNotice from "@/components/ServiceAccessNotice";
import BackButton from "@/components/BackButton";
import type { FoodAvailability, FoodMenu } from "@/lib/api/types";

export default async function ComidaServicePage() {
  // A diferencia del spa, aquí no hay bloques ocupables: la cocina se oferta
  // por día completo y varios huéspedes pueden pedir distintos tiempos de
  // comida el mismo día. El backend ya oculta los días pasados.
  const [menus, availability, user, activeReservation] = await Promise.all([
    serverFetchAll<FoodMenu>("/api/servicios/menus/"),
    serverFetchAll<FoodAvailability>("/api/servicios/comida/disponibilidad/"),
    getSessionUser(),
    getActiveReservation(),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Comida</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Elige el día, el tiempo de comida y el menú para tu estadía.
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
        <FoodBookingForm
          // `price_per_person` viaja como string decimal desde DRF; se convierte
          // aquí para que el formulario siga operando con números.
          menus={menus.map((menu) => ({
            id: menu.id,
            meal_type: menu.meal_type,
            name: menu.name,
            price_per_person: toNumber(menu.price_per_person),
          }))}
          availableDates={availability.map((day) => day.available_date)}
          stayCheckIn={activeReservation.check_in}
          stayCheckOut={activeReservation.check_out}
        />
      )}
    </div>
  );
}
