import OwnerNav from "@/components/OwnerNav";
import UsersTable from "@/components/UsersTable";
import { getSessionUser, nullOnApiError, serverFetchAll } from "@/lib/api/server";
import { getPropertyName, TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";
import type { Usuario } from "@/lib/api/types";

/**
 * Raíz del panel de gestión de Casa Brava (Tenant 0).
 *
 * La propiedad se nombra una sola vez, aquí arriba, y de ahí salen tanto la
 * nav (`<OwnerNav propertySlug=… />`) como el encabezado: el resto del archivo
 * no vuelve a escribir "casa-brava" ni "Casa Brava" a mano. Es la preparación
 * del panel genérico — el día que estas páginas vivan en
 * `app/p/[slug]/owner-panel/`, esta constante se reemplaza por `params.slug`
 * y nada más cambia (ver lib/owner-panel.ts y components/OwnerNav.tsx).
 */
const PROPERTY_SLUG = TENANT_ZERO_SLUG;

export default async function OwnerPanelPage() {
  // `currentUserId` es lo que le permite a la tabla deshabilitar "Eliminar" y
  // los selects de rol/estado en la fila del propio admin. Es refuerzo de UX:
  // el límite real son los guards del backend.
  const [users, currentUser] = await Promise.all([
    serverFetchAll<Usuario>("/api/usuarios/").catch(nullOnApiError),
    getSessionUser(),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <OwnerNav propertySlug={PROPERTY_SLUG} />

      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          {getPropertyName(PROPERTY_SLUG)} — Panel de gestión
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Gestiona los usuarios, las reservaciones y los catálogos de{" "}
          {getPropertyName(PROPERTY_SLUG)}.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">Usuarios invitados</h2>
        {users === null ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            No se pudieron cargar los usuarios. Verifica que el backend esté corriendo e intenta
            recargar la página.
          </p>
        ) : (
          <UsersTable users={users} currentUserId={currentUser?.id ?? ""} />
        )}
      </section>
    </div>
  );
}
