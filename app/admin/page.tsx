import GlobalUsersPanel from "@/components/GlobalUsersPanel";
import { nullOnApiError, serverFetchAll } from "@/lib/api/server";
import {
  buildGlobalUsers,
  buildPropertyOptions,
  computePlatformMetrics,
} from "@/lib/platform-metrics";
import type { PropertyListing, Reservation, Usuario } from "@/lib/api/types";

/**
 * Fecha de referencia de las métricas (año de la ocupación, ventana de
 * nuevos registros). Fuera del componente a propósito: `new Date()` es
 * impuro y el lint `react-hooks/purity` lo marca dentro del cuerpo de un
 * componente — mismo patrón que `generateCartItemId` (ver CLAUDE.md).
 */
function metricsReferenceDate(): Date {
  return new Date();
}

/**
 * Panel de Control de Parras Home Hub — del administrador del marketplace,
 * distinto del panel de gestión de Casa Brava (`/p/casa-brava/owner-panel`,
 * ver components/OwnerNav.tsx). No confundir los dos: este es universal
 * (todo el sistema), aquel es de una sola propiedad.
 *
 * Tres colecciones reales de Django, en paralelo y con `serverFetchAll`
 * (paginadas de a 50: leer solo la primera página truncaría el GMV en
 * silencio). Las analíticas se calculan AQUÍ, en el servidor
 * (lib/platform-metrics.ts); al Client Component solo baja el resultado
 * agregado y un usuario mínimo por fila — nunca la colección de
 * reservaciones con sus desgloses.
 *
 * Todo o nada: si falla cualquiera de las tres, se pinta un solo aviso. Una
 * métrica calculada con una colección faltante (p. ej. "0 reservaciones")
 * sería un número falso, no un número incompleto.
 */
export default async function AdminPage() {
  const [users, reservations, properties] = await Promise.all([
    serverFetchAll<Usuario>("/api/usuarios/").catch(nullOnApiError),
    serverFetchAll<Reservation>("/api/reservaciones/reservaciones/").catch(nullOnApiError),
    serverFetchAll<PropertyListing>("/api/propiedades/").catch(nullOnApiError),
  ]);

  const hasData = users !== null && reservations !== null && properties !== null;

  return (
    <div className="mx-auto flex min-w-0 max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Panel de Control PHH</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Métricas de toda la plataforma y usuarios de Parras Home Hub.
        </p>
      </div>

      {hasData ? (
        <GlobalUsersPanel
          metrics={computePlatformMetrics({
            users,
            reservations,
            properties,
            referenceDate: metricsReferenceDate(),
          })}
          users={buildGlobalUsers(users, reservations)}
          properties={buildPropertyOptions(properties, reservations)}
        />
      ) : (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudieron cargar los datos de la plataforma. Verifica que el backend esté corriendo
          e intenta recargar la página.
        </p>
      )}
    </div>
  );
}
