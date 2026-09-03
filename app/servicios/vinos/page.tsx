import { createClient } from "@/lib/supabase/server";
import WineBookingForm from "@/components/WineBookingForm";
import BackButton from "@/components/BackButton";

export default async function VinosServicePage() {
  const supabase = await createClient();
  const [{ data: wines }, { data: winePackages }] = await Promise.all([
    supabase.from("wines").select("id, name, type, price").gt("stock", 0).order("name", { ascending: true }),
    supabase.from("wine_packages").select("id, name, price").limit(1),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Paquete de Vinos</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Agrega botellas individuales o selecciona el paquete de 4 vinos.
        </p>
      </div>
      <WineBookingForm wines={wines ?? []} winePackage={winePackages?.[0] ?? null} />
    </div>
  );
}
