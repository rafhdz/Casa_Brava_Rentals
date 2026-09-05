// Punto de entrada a la API desde el servidor de Next.js: resuelve la sesión
// (cookies), adjunta el token y refresca cuando hace falta.
//
// Todo Server Component y toda Server Action pasan por aquí. Ningún Client
// Component llama a Django directamente — no podría, el token es httpOnly.

import { redirect } from "next/navigation";
import { AUTH_ENDPOINTS } from "@/lib/api/config";
import { apiFetch, ApiError, fetchAllPages, type ApiFetchOptions } from "@/lib/api/client";
import { isTokenExpired } from "@/lib/api/jwt";
import { clearSessionTokens, readSessionTokens, writeSessionTokens } from "@/lib/api/session";
import type { Usuario } from "@/lib/api/types";

type RefreshResponse = { access: string; refresh?: string };

/**
 * Canjea el refresh token por uno nuevo y lo persiste.
 *
 * `ROTATE_REFRESH_TOKENS` está activado en el backend y el token anterior
 * queda en lista negra, así que **siempre** hay que guardar el refresh que
 * vuelve; conservar el viejo dejaría la sesión muerta en el siguiente intento.
 */
async function refreshSession(refreshToken: string): Promise<string | null> {
  try {
    const data = await apiFetch<RefreshResponse>(AUTH_ENDPOINTS.refresh, {
      method: "POST",
      body: { refresh: refreshToken },
    });

    await writeSessionTokens({ access: data.access, refresh: data.refresh ?? refreshToken });
    return data.access;
  } catch {
    // Refresh expirado, rotado por otra pestaña o en lista negra: la sesión
    // se terminó. Se limpia para que el middleware mande a /login en la
    // siguiente navegación en vez de reintentar en bucle.
    await clearSessionTokens();
    return null;
  }
}

const SESSION_EXPIRED = "Tu sesión expiró. Vuelve a iniciar sesión.";

/**
 * Sin sesión utilizable: se manda a /login en vez de lanzar un error.
 *
 * Normalmente el middleware ya redirigió antes de llegar aquí, pero queda una
 * ventana real: al cerrar sesión, el `router.refresh()` vuelve a renderizar en
 * el servidor la ruta protegida en la que estaba la persona, ya sin cookies.
 * Lanzando, eso pintaba la pantalla de error de Next.js por un instante; con
 * `redirect` la navegación a /login es la única salida visible.
 *
 * `redirect()` funciona igual dentro de una Server Action (hace navegar al
 * cliente), pero señaliza lanzando un error interno de Next.js — por eso
 * `toActionError` lo deja pasar en vez de convertirlo en `{ error }`.
 */
function redirectToLogin(): never {
  redirect("/login");
}

/** ¿Es una señal de control de Next.js (redirect / notFound) y no un fallo real? */
function isNextControlFlowError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_")
  );
}

/**
 * Resuelve el access token a usar, refrescando si ya expiró.
 *
 * En un Server Component el refresco no se puede persistir (no se pueden
 * escribir cookies durante el render) — `writeSessionTokens` lo reporta sin
 * lanzar, y el token nuevo se usa igual para ESTA petición. El middleware lo
 * vuelve a hacer, esta vez sí persistiéndolo, en la siguiente navegación.
 */
async function resolveAccessToken(): Promise<string | null> {
  const { access, refresh } = await readSessionTokens();

  if (access && !isTokenExpired(access)) return access;
  if (!refresh) return null;

  return refreshSession(refresh);
}

/**
 * Petición autenticada a la API. Lanza `ApiError` si algo falla.
 *
 * Ante un 401 reintenta una sola vez con un token recién refrescado: cubre el
 * caso de un token que expira entre que el middleware lo validó y que la
 * petición llega a Django.
 */
export async function serverFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const token = await resolveAccessToken();
  if (!token) redirectToLogin();

  try {
    return await apiFetch<T>(path, { ...options, token });
  } catch (error) {
    if (!(error instanceof ApiError) || !error.isUnauthorized) throw error;

    const { refresh } = await readSessionTokens();
    const renewed = refresh ? await refreshSession(refresh) : null;
    if (!renewed) redirectToLogin();

    return apiFetch<T>(path, { ...options, token: renewed });
  }
}

/** Igual que `serverFetch`, pero recorriendo todas las páginas de una colección. */
export async function serverFetchAll<T>(path: string, options: ApiFetchOptions = {}): Promise<T[]> {
  const token = await resolveAccessToken();
  if (!token) redirectToLogin();

  try {
    return await fetchAllPages<T>(path, { ...options, token });
  } catch (error) {
    if (!(error instanceof ApiError) || !error.isUnauthorized) throw error;

    const { refresh } = await readSessionTokens();
    const renewed = refresh ? await refreshSession(refresh) : null;
    if (!renewed) redirectToLogin();

    return fetchAllPages<T>(path, { ...options, token: renewed });
  }
}

/**
 * Colección pública (el contenido del Home), sin exigir sesión.
 *
 * Se manda el token si existe, pero la petición funciona sin él: esos
 * endpoints declaran lectura pública en el backend.
 */
export async function publicFetchAll<T>(path: string, options: ApiFetchOptions = {}): Promise<T[]> {
  const { access } = await readSessionTokens();
  return fetchAllPages<T>(path, { ...options, token: access ?? null });
}

/**
 * Perfil de la sesión activa, o `null` si no hay ninguna.
 *
 * Lo consume el layout raíz para hidratar el AuthContext del cliente sin que
 * el navegador tenga que pedirlo por su cuenta (no podría: el token es
 * httpOnly).
 *
 * ⚠️ **No usa `serverFetch` a propósito.** El layout raíz corre en TODAS las
 * rutas, incluidas /login y /register, donde no tener sesión es lo normal. Si
 * esta función heredara el `redirect("/login")` de `serverFetch`, /login se
 * redirigiría a sí misma en un bucle infinito. Aquí "no hay sesión" es una
 * respuesta válida (`null`), no un error.
 */
export async function getSessionUser(): Promise<Usuario | null> {
  const { access, refresh } = await readSessionTokens();
  if (!access && !refresh) return null;

  try {
    const token = access && !isTokenExpired(access) ? access : refresh ? await refreshSession(refresh) : null;
    if (!token) return null;

    return await apiFetch<Usuario>("/api/usuarios/me/", { token });
  } catch {
    return null;
  }
}

/**
 * Mensaje listo para el usuario a partir de cualquier fallo de una Server Action.
 *
 * Vuelve a lanzar las señales de control de Next.js: un `redirect()` se propaga
 * como excepción, y convertirlo en `{ error }` cancelaría la navegación y
 * dejaría a la persona mirando un mensaje en una pantalla a la que ya no
 * debería tener acceso.
 */
export function toActionError(error: unknown, fallback = "Ocurrió un error inesperado."): string {
  if (isNextControlFlowError(error)) throw error;

  if (error instanceof ApiError) {
    if (error.isUnauthorized) return SESSION_EXPIRED;
    if (error.isForbidden) return "No tienes permiso para realizar esta acción.";
    return error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export { ApiError };
