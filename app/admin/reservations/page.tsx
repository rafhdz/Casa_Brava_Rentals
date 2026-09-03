import { createClient } from "@/lib/supabase/server";
import { getReservations } from "@/app/admin/reservations/actions";
import ReservationsTable from "@/components/ReservationsTable";
import BackButton from "@/components/BackButton";

export default async function AdminReservationsPage() {
  const supabase = await createClient();

  const [reservationsResult, profilesResult, fareTypesResult, propertySettingsResult] = await Promise.all([
    getReservations(),
    supabase
      .from("profiles")
      .select("id, first_name, apellido_paterno, apellido_materno, email")
      .order("first_name", { ascending: true }),
    supabase.from("fare_types").select("id, name, surcharge_percentage"),
    supabase.from("property_settings").select("nightly_rate, security_deposit").single(),
  ]);

  const hasError =
    "error" in reservationsResult ||
    Boolean(profilesResult.error) ||
    Boolean(fareTypesResult.error) ||
    Boolean(propertySettingsResult.error) ||
    !propertySettingsResult.data;

  return (
    <div className="mx-auto flex min-w-0 max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <BackButton />

      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Reservaciones</h1>
        <p className="mt-1 text-sm text-neutral-500">Casa Brava</p>
      </div>

      {hasError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudieron cargar los datos de reservaciones. Intenta recargar la página.
        </p>
      ) : (
        <ReservationsTable
          reservations={"data" in reservationsResult ? reservationsResult.data : []}
          guests={profilesResult.data ?? []}
          fareTypes={fareTypesResult.data ?? []}
          propertySettings={propertySettingsResult.data ?? { nightly_rate: 0, security_deposit: 0 }}
        />
      )}
    </div>
  );
}
