import Link from "next/link";
import UsersTable from "@/components/UsersTable";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await createClient();
  const [{ data: profiles, error: profilesError }, { data: authData }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.auth.getUser(),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Panel de administración</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Gestiona los usuarios invitados y las reservaciones de Casa Brava.
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
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-sm text-neutral-500">
            Administra fechas, estado y estado de pago de las reservaciones de Casa Brava.
          </p>
          <Link
            href="/admin/reservations"
            className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:bg-neutral-700 active:scale-95"
          >
            Ver reservaciones
          </Link>
        </div>
      </section>
    </div>
  );
}
