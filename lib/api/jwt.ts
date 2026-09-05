// Lectura de los claims de un JWT, **sin verificar la firma**.
//
// Vive aparte de lib/api/session.ts porque middleware.ts también lo necesita y
// no puede importar `next/headers`.
//
// ⚠️ Decodificar no es verificar. Cualquiera puede fabricar un token con
// `role: "admin"` dentro; lo que no puede es firmarlo, y el backend rechaza la
// firma inválida en cada petición. Por eso estos claims solo sirven para
// decisiones de UI y para el camino rápido del middleware (¿expiró? ¿a qué
// ruta mando a esta persona?). La autorización real la resuelve Django —
// ver el guard de /admin en middleware.ts, que confirma el rol contra la API.

import type { AccessTokenClaims } from "@/lib/api/types";

function decodeBase64Url(segment: string): string | null {
  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    // atob existe tanto en el runtime de Node moderno como en el edge del
    // middleware; Buffer no está disponible en el segundo.
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/** Devuelve los claims del token, o `null` si no es un JWT legible. */
export function decodeJwt(token: string | undefined | null): Partial<AccessTokenClaims> | null {
  if (!token) return null;

  const [, payload] = token.split(".");
  if (!payload) return null;

  const json = decodeBase64Url(payload);
  if (!json) return null;

  try {
    return JSON.parse(json) as Partial<AccessTokenClaims>;
  } catch {
    return null;
  }
}

/**
 * ¿El token ya expiró (o está por expirar)?
 *
 * El margen evita el caso de un token que pasa la validación aquí y llega
 * expirado al backend por la latencia de la propia petición. Un token
 * ilegible se trata como expirado: fail closed.
 */
export function isTokenExpired(token: string | undefined | null, skewSeconds = 30): boolean {
  const claims = decodeJwt(token);
  if (!claims?.exp) return true;
  return claims.exp * 1000 <= Date.now() + skewSeconds * 1000;
}

/** Segundos que le quedan de vida al token, para usarlos como `maxAge` de la cookie. */
export function secondsUntilExpiry(token: string, fallbackSeconds: number): number {
  const claims = decodeJwt(token);
  if (!claims?.exp) return fallbackSeconds;
  return Math.max(0, Math.floor(claims.exp - Date.now() / 1000));
}
