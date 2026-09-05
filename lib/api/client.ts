// Cliente HTTP de bajo nivel contra la API de Django.
//
// No sabe nada de cookies ni de sesión: recibe el token ya resuelto y lo
// adjunta como `Authorization: Bearer <token>`. Quien resuelve la sesión es
// lib/api/server.ts (Server Components y Server Actions) o middleware.ts.

import { API_BASE_URL } from "@/lib/api/config";
import type { Paginated } from "@/lib/api/types";

/** Error de una respuesta HTTP no exitosa, con el cuerpo ya parseado. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: unknown = null
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** 401: no hay sesión, o el access token expiró. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** 403: hay sesión, pero el rol no alcanza. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /**
   * 409: la petición estaba bien formada, pero se perdió la carrera contra
   * otro usuario (fechas que se cruzan, bloque de spa ya tomado). El backend
   * manda estos mensajes ya redactados en español para el huésped, así que se
   * muestran tal cual.
   */
  get isConflict(): boolean {
    return this.status === 409;
  }
}

/**
 * Aplana el cuerpo de un error de DRF a un solo mensaje legible.
 *
 * DRF responde con tres formas distintas según el tipo de error:
 *   - `{"detail": "..."}`            — APIException (401/403/404/409 y errores de dominio)
 *   - `{"campo": ["msg", ...]}`      — errores de validación por campo
 *   - `["msg", ...]`                 — errores no asociados a un campo
 */
export function extractErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === "string" && body.trim()) return body;

  if (Array.isArray(body)) {
    const first = body.find((item) => typeof item === "string");
    return typeof first === "string" ? first : fallback;
  }

  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;

    if (typeof record.detail === "string") return record.detail;

    // Primer mensaje del primer campo con error. Se muestra uno solo (no la
    // lista completa) porque el destino es un toast, no un formulario con
    // errores en línea por campo.
    for (const value of Object.values(record)) {
      if (typeof value === "string" && value.trim()) return value;
      if (Array.isArray(value)) {
        const first = value.find((item) => typeof item === "string");
        if (typeof first === "string") return first;
      }
    }
  }

  return fallback;
}

type QueryValue = string | number | boolean | null | undefined;

export type ApiFetchOptions = {
  /** Access token JWT. Sin él la petición sale anónima (solo sirve para el contenido público del Home). */
  token?: string | null;
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  /** Se serializa como JSON. */
  body?: unknown;
  searchParams?: Record<string, QueryValue>;
  /** Igual que en `fetch` de Next.js: "no-store" para datos que cambian por sesión. */
  cache?: RequestCache;
  next?: { revalidate?: number | false; tags?: string[] };
  signal?: AbortSignal;
};

function buildUrl(path: string, searchParams?: Record<string, QueryValue>): string {
  // Un `path` absoluto llega solo desde el enlace `next` de la paginación.
  const url = path.startsWith("http") ? new URL(path) : new URL(path, `${API_BASE_URL}/`);

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

/**
 * Ejecuta una petición contra la API y devuelve el JSON ya parseado.
 *
 * Lanza `ApiError` ante cualquier respuesta no exitosa — nunca devuelve un
 * resultado "vacío" que el caller pueda confundir con éxito. Las Server
 * Actions capturan ese error y lo traducen a `{ error }`.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { token, method = "GET", body, searchParams, cache, next, signal } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, searchParams), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      // Los datos dependen de la sesión: cachearlos serviría la información de
      // un usuario a otro. Los callers que sí quieran caché lo piden explícito.
      cache: cache ?? (next ? undefined : "no-store"),
      next,
      signal,
    });
  } catch (cause) {
    // Fetch solo falla así cuando la red o el propio backend no responden.
    throw new ApiError(
      0,
      "No se pudo conectar con el servidor. Verifica que el backend de Django esté corriendo.",
      cause
    );
  }

  if (response.status === 204) return undefined as T;

  const raw = await response.text();
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      extractErrorMessage(parsed, `La petición falló (HTTP ${response.status}).`),
      parsed
    );
  }

  return parsed as T;
}

function isPaginated<T>(payload: Paginated<T> | T[]): payload is Paginated<T> {
  return !Array.isArray(payload) && Array.isArray((payload as Paginated<T>).results);
}

/**
 * Devuelve **todos** los elementos de una colección, siguiendo el enlace
 * `next` de la paginación hasta agotarla.
 *
 * No es una comodidad opcional: `PAGE_SIZE` es 50 y el backend no acepta un
 * `page_size` mayor, así que leer solo `.results` de la primera página trunca
 * en silencio cualquier colección más grande — la disponibilidad de spa ya
 * pasa de 80 bloques, y el formulario del huésped dejaría de ofrecer los días
 * más lejanos sin ningún error visible.
 *
 * Acepta también las respuestas sin paginar (el contenido del Home declara
 * `pagination_class = None` y devuelve un arreglo plano).
 */
export async function fetchAllPages<T>(path: string, options: ApiFetchOptions = {}): Promise<T[]> {
  const items: T[] = [];
  let nextPath: string | null = path;
  let nextParams = options.searchParams;

  while (nextPath) {
    const payload: Paginated<T> | T[] = await apiFetch<Paginated<T> | T[]>(nextPath, {
      ...options,
      searchParams: nextParams,
    });

    if (!isPaginated(payload)) return payload;

    items.push(...payload.results);
    // El enlace `next` ya trae su propio `?page=`; volver a mezclar los
    // searchParams originales duplicaría los filtros.
    nextPath = payload.next;
    nextParams = undefined;
  }

  return items;
}
