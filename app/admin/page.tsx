import GlobalUsersPanel from "@/components/GlobalUsersPanel";
import { serverFetchAll } from "@/lib/api/server";
import type { Usuario } from "@/lib/api/types";

/**
 * Panel de Control de Parras Home Hub — del administrador del marketplace,
 * distinto del panel de gestión de Casa Brava (`/p/casa-brava/owner-panel`,
 * ver components/OwnerNav.tsx). No confundir los dos: este es universal
 * (todo el sistema), aquel es de una sola propiedad.
 *
 * El backend todavía es de una sola propiedad (ver CLAUDE.md, "Arquitectura
 * multi-tenant"): no existe un endpoint que consolide usuarios por varias
 * propiedades, así que este listado consume `/api/usuarios/` tal cual —
 * hoy es, de hecho, la misma colección completa que ve el owner-panel. Ver
 * el tipo `GlobalUser` en components/GlobalUsersPanel.tsx para el porqué de
 * declararlo aparte en vez de solo reusar `Usuario` en silencio.
 */
export default async function AdminPage() {
  const users = await serverFetchAll<Usuario>("/api/usuarios/").catch(() => null);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Panel de Control PHH</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Usuarios de todo Parras Home Hub — filtra por rol y por estado.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">Usuarios</h2>
        {users === null ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            No se pudieron cargar los usuarios. Verifica que el backend esté corriendo e intenta
            recargar la página.
          </p>
        ) : (
          <GlobalUsersPanel users={users} />
        )}
      </section>
    </div>
  );
}
