"use server";

import { revalidatePath } from "next/cache";
import { serverFetch, toActionError } from "@/lib/api/server";
import type {
  FareType,
  FoodMenu,
  MealType,
  ProfileStatus,
  SpaMasseuse,
  Wine,
} from "@/lib/api/types";

/**
 * CRUD de los cuatro catálogos que administra `/admin/catalogos`.
 *
 * Cada catálogo vive en su propia app del backend —tarifas en `propiedades`,
 * masajistas en `proveedores`, menús y vinos en `servicios`—, pero los cuatro
 * comparten la misma clase de permiso (`SoloLecturaAutenticadoEscrituraAdmin`:
 * cualquier sesión lee, solo un admin escribe). Aquí no se replica esa regla:
 * un rol insuficiente vuelve como 403 y `toActionError` lo convierte en un
 * mensaje mostrable.
 *
 * Los cuatro modelos están referenciados con `on_delete=PROTECT` desde las
 * reservaciones y sus bookings, así que un DELETE sobre una fila que ya tiene
 * historial responde **409** con su mensaje en español (ver
 * `backend/casabrava_core/exceptions.py`). No hay que anticiparlo aquí: llega
 * como cualquier otro error de la API.
 */

export type CatalogActionResult = { success: true } | { error: string };

const CATALOGS_PATH = "/admin/catalogos";

// Endpoints de cada catálogo. Agrupados aquí para que la ruta de un catálogo
// se escriba una sola vez y no se disperse entre sus tres acciones.
const ENDPOINTS = {
  fareTypes: "/api/propiedades/tarifas/",
  masseuses: "/api/proveedores/masajistas/",
  menus: "/api/servicios/menus/",
  wines: "/api/servicios/vinos/",
} as const;

/**
 * Ejecuta una escritura contra un catálogo y revalida la página.
 *
 * Las doce acciones exportadas difieren solo en endpoint, cuerpo y mensaje de
 * respaldo; el resto —revalidar, no lanzar nunca hacia el caller, traducir el
 * fallo a `{ error }`— es idéntico y vive aquí una sola vez.
 */
async function escribirCatalogo(
  path: string,
  options: { method: "POST" | "PATCH" | "DELETE"; body?: unknown },
  fallback: string
): Promise<CatalogActionResult> {
  try {
    await serverFetch(path, options);

    revalidatePath(CATALOGS_PATH);
    return { success: true };
  } catch (error) {
    return { error: toActionError(error, fallback) };
  }
}

// ---------------------------------------------------------------------------
// Tipos de tarifa (propiedades.FareType)
// ---------------------------------------------------------------------------

export type FareTypeInput = {
  name: string;
  /**
   * Recargo porcentual. Viaja como number y DRF lo devuelve luego como el
   * string decimal `"15.00"` — ver el alias `Decimal` en lib/api/types.ts.
   */
  surcharge_percentage: number;
};

export async function createFareType(input: FareTypeInput): Promise<CatalogActionResult> {
  return escribirCatalogo(
    ENDPOINTS.fareTypes,
    { method: "POST", body: input },
    "No se pudo crear el tipo de tarifa."
  );
}

export async function updateFareType(
  id: FareType["id"],
  input: FareTypeInput
): Promise<CatalogActionResult> {
  return escribirCatalogo(
    `${ENDPOINTS.fareTypes}${id}/`,
    { method: "PATCH", body: input },
    "No se pudo actualizar el tipo de tarifa."
  );
}

export async function deleteFareType(id: FareType["id"]): Promise<CatalogActionResult> {
  return escribirCatalogo(
    `${ENDPOINTS.fareTypes}${id}/`,
    { method: "DELETE" },
    "No se pudo eliminar el tipo de tarifa."
  );
}

// ---------------------------------------------------------------------------
// Masajistas (proveedores.SpaMasseuse)
// ---------------------------------------------------------------------------

export type MasseuseInput = {
  name: string;
  /**
   * Reutiliza el enum `ProfileStatus` de los perfiles. Para una masajista,
   * `"invitado"` significa "fuera de servicio": el backend documenta que esa
   * —y no el borrado— es la vía para retirar a alguien con historial, porque
   * su FK en `spa_bookings` es PROTECT.
   */
  status: ProfileStatus;
};

export async function createMasseuse(input: MasseuseInput): Promise<CatalogActionResult> {
  return escribirCatalogo(
    ENDPOINTS.masseuses,
    { method: "POST", body: input },
    "No se pudo crear la masajista."
  );
}

export async function updateMasseuse(
  id: SpaMasseuse["id"],
  input: MasseuseInput
): Promise<CatalogActionResult> {
  return escribirCatalogo(
    `${ENDPOINTS.masseuses}${id}/`,
    { method: "PATCH", body: input },
    "No se pudo actualizar la masajista."
  );
}

export async function deleteMasseuse(id: SpaMasseuse["id"]): Promise<CatalogActionResult> {
  return escribirCatalogo(
    `${ENDPOINTS.masseuses}${id}/`,
    { method: "DELETE" },
    "No se pudo eliminar la masajista."
  );
}

// ---------------------------------------------------------------------------
// Menús (servicios.FoodMenu)
// ---------------------------------------------------------------------------

export type MenuInput = {
  meal_type: MealType;
  name: string;
  price_per_person: number;
};

export async function createMenu(input: MenuInput): Promise<CatalogActionResult> {
  return escribirCatalogo(
    ENDPOINTS.menus,
    { method: "POST", body: input },
    "No se pudo crear el menú."
  );
}

export async function updateMenu(
  id: FoodMenu["id"],
  input: MenuInput
): Promise<CatalogActionResult> {
  return escribirCatalogo(
    `${ENDPOINTS.menus}${id}/`,
    { method: "PATCH", body: input },
    "No se pudo actualizar el menú."
  );
}

export async function deleteMenu(id: FoodMenu["id"]): Promise<CatalogActionResult> {
  return escribirCatalogo(
    `${ENDPOINTS.menus}${id}/`,
    { method: "DELETE" },
    "No se pudo eliminar el menú."
  );
}

// ---------------------------------------------------------------------------
// Vinos (servicios.Wine)
// ---------------------------------------------------------------------------

export type WineInput = {
  name: string;
  /** Varietal o categoría en texto libre (ej. "Tinto", "Espumoso"). */
  type: string;
  price: number;
  stock: number;
};

export async function createWine(input: WineInput): Promise<CatalogActionResult> {
  return escribirCatalogo(
    ENDPOINTS.wines,
    { method: "POST", body: input },
    "No se pudo crear el vino."
  );
}

export async function updateWine(
  id: Wine["id"],
  input: WineInput
): Promise<CatalogActionResult> {
  return escribirCatalogo(
    `${ENDPOINTS.wines}${id}/`,
    { method: "PATCH", body: input },
    "No se pudo actualizar el vino."
  );
}

export async function deleteWine(id: Wine["id"]): Promise<CatalogActionResult> {
  return escribirCatalogo(
    `${ENDPOINTS.wines}${id}/`,
    { method: "DELETE" },
    "No se pudo eliminar el vino."
  );
}
