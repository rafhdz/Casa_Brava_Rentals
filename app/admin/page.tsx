import GlobalUsersPanel from "@/components/GlobalUsersPanel";
import { ApiError, serverFetchAll } from "@/lib/api/server";
import { attachPropertyScopes } from "@/lib/user-properties";
import type { Reservation, Usuario } from "@/lib/api/types";

/**
 * Panel de Control de Parras Home Hub — del administrador del marketplace,
 * distinto del panel de gestión de Casa Brava (`/p/casa-brava/owner-panel`,
 * ver components/OwnerNav.tsx). No confundir los dos: este es universal
 * (todo el sistema), aquel es de una sola propiedad.
 *
 * Dos colecciones, en paralelo:
 *
 *   * `/api/usuarios/` — las cuentas de todo PHH.
 *   * `/api/reservaciones/reservaciones/` — con sesión admin, las estadías de
 *     todo el sistema. No se listan aquí: son el insumo para resolver a qué
 *     propiedad pertenece cada cuenta (ver lib/user-properties.ts). El cruce
 *     ocurre en el servidor, una sola vez, para que los filtros de la tabla
 *     corran después en el cliente sin volver a pedirle nada al backend.
 *
 * Sigue siendo de SOLO LECTURA: el CRUD de usuarios vive en el owner-panel de
 * Casa Brava y duplicarlo aquí sería una segunda fuente de verdad para la
 * misma escritura.
 */

/**
 * Un fallo de la API se convierte en `null` para poder mostrar el aviso de
 * "backend caído" en vez de la pantalla de error de Next.js. Cualquier otra
 * excepción se vuelve a lanzar: `serverFetchAll` señaliza con `redirect()`
 * cuando la sesión ya no sirve, y tragarse esa señal dejaría a la persona
 * mirando un mensaje de error en vez de navegar a /login (mismo patrón que
 * app/p/casa-brava/owner-panel/catalogos/page.tsx).
 */
function sinDatos(error: unknown): null {
  if (error instanceof ApiError) return null;
  throw error;
}

export default async function AdminPage() {
  const [users, reservations] = await Promise.all([
    serverFetchAll<Usuario>("/api/usuarios/").catch(sinDatos),
    serverFetchAll<Reservation>("/api/reservaciones/reservaciones/").catch(sinDatos),
  ]);

  const hasError = users === null || reservations === null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Panel de Control PHH</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Usuarios de todo Parras Home Hub, con la propiedad a la que está
          vinculado cada uno — filtra por rol, estado, vínculo o propiedad.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-neutral-900">Usuarios</h2>
        {hasError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            No se pudieron cargar los usuarios. Verifica que el backend esté corriendo e intenta
            recargar la página.
          </p>
        ) : (
          <GlobalUsersPanel users={attachPropertyScopes(users, reservations)} />
        )}
      </section>
    </div>
  );
}
