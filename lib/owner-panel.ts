// Rutas del panel de gestión de UNA propiedad (`/p/<slug>/owner-panel/**`).
//
// Existe para que el panel deje de depender de literales repetidos en media
// docena de archivos (OwnerNav, sus tres páginas, sus Server Actions,
// TenantNavbar y middleware.ts). Hoy solo hay un panel real —Tenant 0, Casa
// Brava, servido por la carpeta ESTÁTICA `app/p/casa-brava/owner-panel/`— y
// este módulo no cambia eso: lo que cambia es que cada consumidor ya construye
// su ruta a partir de un `propertySlug` en vez de escribir "casa-brava" a mano.
// El día que el backend sirva varias propiedades con panel propio, mover esas
// páginas a `app/p/[slug]/owner-panel/` es cambiar de dónde sale el slug (de la
// constante a `params`), no reescribir las rutas una por una.
//
// Módulo puro a propósito: nada de `next/headers`, de `lib/api/server.ts` ni de
// imports de Node. Lo importa `middleware.ts`, que corre en el Edge Runtime en
// cada navegación — misma regla que lib/mock/marketplace-data.ts.

/** Segmento fijo del panel dentro del subárbol de una propiedad. */
export const OWNER_PANEL_SEGMENT = "owner-panel";

/** Prefijo del panel de gestión de esa propiedad, sin barra final. */
export function ownerPanelBasePath(propertySlug: string): string {
  return `/p/${propertySlug}/${OWNER_PANEL_SEGMENT}`;
}

/**
 * Las tres secciones del panel. Se declaran juntas para que agregar una cuarta
 * sea un solo cambio aquí y no una búsqueda de strings por el repositorio.
 */
export type OwnerPanelRoutes = {
  /** Usuarios — la raíz del panel. */
  root: string;
  reservations: string;
  catalogos: string;
};

export function ownerPanelRoutes(propertySlug: string): OwnerPanelRoutes {
  const root = ownerPanelBasePath(propertySlug);
  return {
    root,
    reservations: `${root}/reservations`,
    catalogos: `${root}/catalogos`,
  };
}
