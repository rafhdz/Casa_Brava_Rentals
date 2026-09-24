// Rutas del panel de gestión de una propiedad (`/p/<slug>/owner-panel/**`).
//
// Única fuente de estas rutas: la consumen `middleware.ts` (guard por rol),
// `components/OwnerNav.tsx` (pestañas), el portal `/supplier` (enlace al
// panel) y las Server Actions del panel (`revalidatePath`). Antes cada uno
// armaba el string a mano y el slug `"casa-brava"` se repetía en cada
// `revalidatePath` — justo lo que CLAUDE.md prohíbe.
//
// Vive fuera de los archivos `"use server"` porque esos solo pueden exportar
// funciones `async`, y fuera de lib/api/ porque no es acceso a la API. Es
// TS puro (sin `next/headers` ni nada de Node) porque middleware.ts lo importa
// en el Edge Runtime.

import { TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";

export type OwnerPanelRoutes = {
  /** Raíz del panel: CRUD de usuarios. */
  root: string;
  reservations: string;
  catalogs: string;
};

/**
 * Rutas del panel de gestión de `slug`. Parametrizado por slug para que el
 * día que otra propiedad tenga panel propio no haya que tocar a los callers;
 * hoy solo existe el de Tenant 0, que es el valor por defecto.
 */
export function ownerPanelRoutes(slug: string = TENANT_ZERO_SLUG): OwnerPanelRoutes {
  const root = `/p/${slug}/owner-panel`;
  return {
    root,
    reservations: `${root}/reservations`,
    catalogs: `${root}/catalogos`,
  };
}
