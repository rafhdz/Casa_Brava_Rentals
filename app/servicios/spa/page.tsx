import { createClient } from "@/lib/supabase/server";
import SpaBookingForm from "@/components/SpaBookingForm";
import BackButton from "@/components/BackButton";

export default async function SpaServicePage() {
  const supabase = await createClient();
  const { data: masseuses } = await supabase
    .from("spa_masseuses")
    .select("id, name")
    .eq("status", "activo")
    .order("name", { ascending: true });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">SPA / Masajes</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Elige tu masajista, día y hora para tu sesión.
        </p>
      </div>
      <SpaBookingForm masseuses={masseuses ?? []} />
    </div>
  );
}
