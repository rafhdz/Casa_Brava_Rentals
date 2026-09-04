import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import FoodBookingForm from "@/components/FoodBookingForm";
import BackButton from "@/components/BackButton";

export default async function ComidaServicePage() {
  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const [{ data: menus }, { data: availability }] = await Promise.all([
    supabase
      .from("food_menus")
      .select("id, meal_type, name, price_per_person")
      .order("meal_type", { ascending: true }),
    // Días habilitados reales (ver CLAUDE.md, "Disponibilidad real de
    // servicios adicionales"). A diferencia del spa no hay bloques ocupables:
    // el servicio de cocina se oferta por día completo y varios huéspedes
    // pueden pedir distintos tiempos de comida el mismo día.
    supabase
      .from("food_availability")
      .select("available_date")
      .gte("available_date", today)
      .order("available_date", { ascending: true }),
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
      <FoodBookingForm
        menus={menus ?? []}
        availableDates={(availability ?? []).map((row) => row.available_date)}
      />
    </div>
  );
}
