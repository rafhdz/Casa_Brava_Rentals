import GlobalUsersPanel, { type GlobalUserFields } from "@/components/GlobalUsersPanel";
import { nullOnApiError, serverFetchAll } from "@/lib/api/server";
import { computePlatformMetrics } from "@/lib/platform-metrics";
import { attachPropertyScopes } from "@/lib/user-properties";
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
 * Solo los campos que la tabla pinta o filtra. Todo lo que se pasa por props
 * a un Client Component viaja serializado al navegador: `phone`,
 * `date_of_birth` y `document_id` no tienen por qué salir del servidor.
 */
function toPanelFields({
  id,
  nombre_completo,
  email,
  role,
  status,
  created_at,
}: Usuario): GlobalUserFields {
  return { id, nombre_completo, email, role, status, created_at };
}

/**
 * Panel de Control de Parras Home Hub — del administrador del marketplace,
 * distinto del panel de gestión de Casa Brava (`/p/casa-brava/owner-panel`,
 * ver components/OwnerNav.tsx). No confundir los dos: este es universal
 * (todo el sistema), aquel es de una sola propiedad.
 *
 * Tres colecciones reales de Django, en paralelo y con `serverFetchAll`
 * (paginadas de a 50: leer solo la primera página truncaría el GMV en
 * silencio):
 *
 *   * `/api/usuarios/` — las cuentas de todo PHH.
 *   * `/api/reservaciones/reservaciones/` — con sesión admin, las estadías de
 *     todo el sistema. No se listan aquí: son el insumo de los KPIs
 *     (lib/platform-metrics.ts) y de a qué propiedad pertenece cada cuenta
 *     (lib/user-properties.ts).
 *   * `/api/propiedades/` — las propiedades activas: la capacidad (noches
 *     disponibles) contra la que se mide la ocupación.
 *
 * Todo se cruza AQUÍ, en el servidor, una sola vez: al Client Component solo
 * bajan los KPIs ya agregados y un usuario mínimo por fila, así que los
 * filtros de la tabla corren después en el navegador sin volver a pedirle
 * nada al backend. Todo o nada: si falla cualquiera de las tres colecciones
 * se pinta un solo aviso — una métrica calculada con una colección faltante
 * sería un número falso, no uno incompleto.
 *
 * Sigue siendo de SOLO LECTURA: el CRUD de usuarios vive en el owner-panel de
 * Casa Brava y duplicarlo aquí sería una segunda fuente de verdad para la
 * misma escritura.
 */
export default async function AdminPage() {
  // `nullOnApiError` y no un `.catch(() => null)` a secas: un `redirect()` de
  // sesión expirada tiene que propagarse, no convertirse en "backend caído".
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
          Métricas de toda la plataforma y usuarios de Parras Home Hub, con la propiedad a la que
          está vinculado cada uno.
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
          users={attachPropertyScopes(users.map(toPanelFields), reservations)}
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
