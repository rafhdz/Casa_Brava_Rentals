// Sesión JWT persistida en cookies httpOnly, para Server Components, Server
// Actions y Route Handlers (usa `next/headers`; middleware.ts gestiona sus
// propias cookies sobre el request/response y no importa este archivo).
//
// Por qué cookies httpOnly y no localStorage: el token tiene que ser legible
// por el servidor. El middleware decide el acceso a una ruta ANTES de
// renderizarla, y cada Server Component/Action necesita el token para llamar a
// Django — nada de eso puede leer localStorage. Como efecto secundario, un XSS
// tampoco puede robar el token: el JavaScript de la página no lo ve.

import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/api/config";
import { secondsUntilExpiry } from "@/lib/api/jwt";
import type { TokenPair } from "@/lib/api/types";

// Vidas por defecto si el token no trae `exp` legible: las mismas que
// `JWT_ACCESS_MINUTES` / `JWT_REFRESH_DAYS` del backend.
const DEFAULT_ACCESS_MAX_AGE = 60 * 60;
const DEFAULT_REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    // "lax" deja que la cookie viaje en navegaciones de nivel superior (volver
    // desde un enlace externo mantiene la sesión) pero no en peticiones
    // cross-site, que es la parte que importa contra CSRF.
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export type SessionTokens = { access: string; refresh: string };

/** Tokens de la sesión activa, si los hay. */
export async function readSessionTokens(): Promise<Partial<SessionTokens>> {
  const store = await cookies();
  return {
    access: store.get(ACCESS_TOKEN_COOKIE)?.value,
    refresh: store.get(REFRESH_TOKEN_COOKIE)?.value,
  };
}

/**
 * Persiste el par de tokens.
 *
 * Devuelve `false` si el contexto no puede escribir cookies (un Server
 * Component puro), en vez de lanzar: ahí el refresco se pierde para este
 * render pero el middleware lo repetirá en la siguiente navegación.
 */
export async function writeSessionTokens(tokens: Partial<TokenPair> & SessionTokens): Promise<boolean> {
  try {
    const store = await cookies();
    store.set(
      ACCESS_TOKEN_COOKIE,
      tokens.access,
      cookieOptions(secondsUntilExpiry(tokens.access, DEFAULT_ACCESS_MAX_AGE))
    );
    store.set(
      REFRESH_TOKEN_COOKIE,
      tokens.refresh,
      cookieOptions(secondsUntilExpiry(tokens.refresh, DEFAULT_REFRESH_MAX_AGE))
    );
    return true;
  } catch {
    return false;
  }
}

/** Borra la sesión. Mismo criterio que arriba: no lanza si no puede escribir. */
export async function clearSessionTokens(): Promise<boolean> {
  try {
    const store = await cookies();
    store.delete(ACCESS_TOKEN_COOKIE);
    store.delete(REFRESH_TOKEN_COOKIE);
    return true;
  } catch {
    return false;
  }
}
