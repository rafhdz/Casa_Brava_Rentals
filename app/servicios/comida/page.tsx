import { createClient } from "@/lib/supabase/server";
import FoodBookingForm from "@/components/FoodBookingForm";
import BackButton from "@/components/BackButton";

export default async function ComidaServicePage() {
  const supabase = await createClient();
  const { data: menus } = await supabase
    .from("food_menus")
    .select("id, meal_type, name, price_per_person")
    .order("meal_type", { ascending: true });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Comida</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Elige el día, el tiempo de comida y el menú para tu estadía.
        </p>
      </div>
      <FoodBookingForm menus={menus ?? []} />
    </div>
  );
}
