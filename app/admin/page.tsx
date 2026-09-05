import AdminNav from "@/components/AdminNav";
import UsersTable from "@/components/UsersTable";
import { getSessionUser, serverFetchAll } from "@/lib/api/server";
import type { Usuario } from "@/lib/api/types";

export default async function AdminPage() {
  // `currentUserId` es lo que le permite a la tabla deshabilitar "Eliminar" y
  // los selects de rol/estado en la fila del propio admin. Es refuerzo de UX:
  // el límite real son los guards del backend.
  const [usersResult, currentUser] = await Promise.all([
    serverFetchAll<Usuario>("/api/usuarios/")
      .then((users) => ({ users }))
      .catch(() => ({ users: null })),
    getSessionUser(),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <AdminNav />

      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Panel de administración</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Gestiona los usuarios, las reservaciones y los catálogos de Casa Brava.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">Usuarios invitados</h2>
        {usersResult.users === null ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            No se pudieron cargar los usuarios. Verifica que el backend esté corriendo e intenta
            recargar la página.
          </p>
        ) : (
          <UsersTable users={usersResult.users} currentUserId={currentUser?.id ?? ""} />
        )}
      </section>
    </div>
  );
}
