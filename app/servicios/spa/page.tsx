import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import SpaBookingForm from "@/components/SpaBookingForm";
import BackButton from "@/components/BackButton";

export default async function SpaServicePage() {
  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const [{ data: masseuses }, { data: availability }] = await Promise.all([
    supabase
      .from("spa_masseuses")
      .select("id, name")
      .eq("status", "activo")
      .order("name", { ascending: true }),
    // Disponibilidad real (ver CLAUDE.md, "Disponibilidad real de servicios
    // adicionales"). Se excluyen los bloques ya tomados (`is_booked`) y los
    // días pasados aquí, en el servidor, para que el formulario reciba
    // únicamente lo que de verdad puede reservarse; la garantía contra el
    // doble-booking sigue viviendo en book_spa_slot() al momento del
    // checkout, no en este filtro.
    supabase
      .from("spa_availability")
      .select("masseuse_id, available_date, available_time")
      .eq("is_booked", false)
      .gte("available_date", today)
      .order("available_date", { ascending: true })
      .order("available_time", { ascending: true }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">SPA / Masajes</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Elige tu masajista, día y hora para tu sesión.
        </p>
      </div>
      <SpaBookingForm masseuses={masseuses ?? []} availability={availability ?? []} />
    </div>
  );
}
