import UsersTable from "@/components/UsersTable";
import ReservationsTable from "@/components/ReservationsTable";
import { mockReservations } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const [{ data: profiles, error: profilesError }, { data: authData }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  const upcomingReservations = mockReservations.filter(
    (reservation) => reservation.estado !== "pasada"
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Panel de administración</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Gestiona los usuarios invitados de Casa Brava. Las reservaciones abajo siguen siendo
          datos de ejemplo.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">Usuarios invitados</h2>
        {profilesError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            No se pudieron cargar los usuarios. Intenta recargar la página.
          </p>
        ) : (
          <UsersTable users={profiles ?? []} currentUserId={authData.user?.id ?? ""} />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">Reservaciones</h2>
        <ReservationsTable reservations={upcomingReservations} />
      </section>
    </div>
  );
}
