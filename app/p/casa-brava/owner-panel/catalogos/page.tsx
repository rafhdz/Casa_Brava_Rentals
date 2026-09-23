import OwnerNav from "@/components/OwnerNav";
import CatalogsView from "@/components/CatalogsView";
import { ApiError, serverFetchAll } from "@/lib/api/server";
import { toNumber } from "@/lib/format";
import { getPropertyName, TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";
import type { FareType, FoodMenu, SpaMasseuse, Wine } from "@/lib/api/types";

/** Ver la nota de `PROPERTY_SLUG` en la raíz del panel (../page.tsx). */
const PROPERTY_SLUG = TENANT_ZERO_SLUG;

/**
 * Panel de catálogos.
 *
 * Los cuatro catálogos viven en tres apps distintas del backend, así que son
 * cuatro peticiones — se lanzan en paralelo y con `serverFetchAll`, no
 * `serverFetch`: son colecciones paginadas de a 50 y el catálogo de vinos
 * puede pasar de ahí sin que nada avise.
 */

/**
 * Un fallo de la API se convierte en `null` para poder mostrar el aviso de
 * "backend caído" en vez de la pantalla de error de Next.js. Cualquier otra
 * excepción se vuelve a lanzar: `serverFetchAll` señaliza con `redirect()`
 * cuando la sesión ya no sirve, y tragarse esa señal dejaría a la persona
 * mirando un mensaje de error en vez de navegar a /login.
 */
function sinDatos(error: unknown): null {
  if (error instanceof ApiError) return null;
  throw error;
}

export default async function OwnerPanelCatalogsPage() {
  const [fareTypes, masseuses, menus, wines] = await Promise.all([
    serverFetchAll<FareType>("/api/propiedades/tarifas/").catch(sinDatos),
    serverFetchAll<SpaMasseuse>("/api/proveedores/masajistas/").catch(sinDatos),
    serverFetchAll<FoodMenu>("/api/servicios/menus/").catch(sinDatos),
    serverFetchAll<Wine>("/api/servicios/vinos/").catch(sinDatos),
  ]);

  const hasError =
    fareTypes === null || masseuses === null || menus === null || wines === null;

  return (
    <div className="mx-auto flex min-w-0 max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <OwnerNav propertySlug={PROPERTY_SLUG} />

      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Catálogos</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Lo que se ofrece en {getPropertyName(PROPERTY_SLUG)}: tarifas de la estadía y catálogos
          de los servicios adicionales.
        </p>
      </div>

      {hasError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudieron cargar los catálogos. Verifica que el backend esté corriendo e intenta
          recargar la página.
        </p>
      ) : (
        <CatalogsView
          // Los decimales llegan como string desde DRF; se convierten aquí, en
          // la página, para que los componentes de presentación reciban números
          // limpios (ver "Capa de acceso a la API" en CLAUDE.md).
          fareTypes={fareTypes.map((fare) => ({
            id: fare.id,
            name: fare.name,
            surcharge_percentage: toNumber(fare.surcharge_percentage),
          }))}
          masseuses={masseuses.map(({ id, name, status }) => ({ id, name, status }))}
          menus={menus.map((menu) => ({
            id: menu.id,
            meal_type: menu.meal_type,
            name: menu.name,
            price_per_person: toNumber(menu.price_per_person),
          }))}
          wines={wines.map((wine) => ({
            id: wine.id,
            name: wine.name,
            type: wine.type,
            price: toNumber(wine.price),
            stock: wine.stock,
          }))}
        />
      )}
    </div>
  );
}
