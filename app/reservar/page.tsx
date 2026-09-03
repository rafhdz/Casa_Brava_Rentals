import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/BackButton";
import ReservarForm from "@/components/ReservarForm";

export default async function ReservarPage() {
  const supabase = await createClient();
  const [{ data: fareTypes }, { data: propertySettings }, { data: bookedRanges }] = await Promise.all([
    supabase
      .from("fare_types")
      .select("id, name, surcharge_percentage")
      .order("surcharge_percentage", { ascending: true }),
    supabase.from("property_settings").select("nightly_rate, security_deposit").single(),
    supabase
      .from("reservations")
      .select("check_in, check_out")
      .eq("status", "confirmada")
      .is("deleted_at", null),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-10 sm:px-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Reservar tu estadía</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Selecciona tus fechas y el tipo de tarifa que mejor se ajuste a tu plan.
        </p>
      </div>
      <ReservarForm
        fareTypes={fareTypes ?? []}
        propertySettings={propertySettings ?? { nightly_rate: 0, security_deposit: 0 }}
        bookedRanges={bookedRanges ?? []}
      />
    </div>
  );
}
