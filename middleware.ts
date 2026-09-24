import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, API_BASE_URL, AUTH_ENDPOINTS, REFRESH_TOKEN_COOKIE } from "@/lib/api/config";
import { decodeJwt, isTokenExpired, secondsUntilExpiry } from "@/lib/api/jwt";
import { isInviteOnlyBySlug, TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";
import { ownerPanelBasePath } from "@/lib/owner-panel";
import type { RoleType, Usuario } from "@/lib/api/types";

// Nota: Next.js 16 renombró esta convención de archivo a `proxy.ts` (con la
// función exportada como `proxy`), pero sigue reconociendo `middleware.ts` +
// `export function middleware` vía compatibilidad hacia atrás (ver
// isMiddlewareFilename en next/dist/build/utils.js). Si en una versión futura
// se retira ese soporte, renombrar el archivo y la función es el único cambio
// necesario (hay codemod oficial:
// `npx @next/codemod@canary middleware-to-proxy .`).

// Rutas (por prefijo) que solo requieren sesión activa. "/reservar" y
// "/servicios" YA NO viven aquí: se movieron bajo /p/[slug]/ y su protección
// ahora depende del `accessType` de esa propiedad (ver PROPERTY_ROUTE_PATTERN
// más abajo), no de un prefijo fijo.
const PROTECTED_PREFIXES = ["/perfil", "/carrito"];

// Panel universal del administrador de Parras Home Hub — el marketplace
// territorial, no una propiedad en particular.
const ADMIN_PREFIX = "/admin";

// Panel de gestión de Casa Brava (usuarios/reservaciones/catálogos de ESA
// propiedad). Vive bajo /p/<TENANT_ZERO_SLUG>/owner-panel — no confundir con
// ADMIN_PREFIX: aquel es del administrador de todo PHH, este es del
// propietario (o admin) de una sola casa. Ver CLAUDE.md, "Migración del
// panel de administración a owner-panel".
// `ownerPanelBasePath` (lib/owner-panel.ts) es un módulo puro, sin imports de
// Node ni de `next/headers`: puede correr en este Edge Runtime igual que
// lib/mock/marketplace-data.ts. Hoy solo hay panel para Tenant 0; el día que
// haya uno por propiedad, este guard pasa a leer el slug de la ruta (como ya
// hace PROPERTY_ROUTE_PATTERN) en vez de una constante.
const OWNER_PANEL_PREFIX = ownerPanelBasePath(TENANT_ZERO_SLUG);
const OWNER_PANEL_ROLES: RoleType[] = ["holder", "admin"];

// Rutas de una propiedad del marketplace: /p/<slug>, /p/<slug>/reservar,
// /p/<slug>/servicios/*, /p/<slug>/checkout — todo el subárbol.
//
// IMPORTANTE — leer antes de tocar esto: "/" YA NO está en ninguna lista de
// rutas protegidas, y eso es intencional, no una regresión de seguridad. "/"
// dejó de ser la fachada de Casa Brava (la única propiedad, invitación-only)
// y ahora es la landing PÚBLICA del marketplace territorial (Parras Home
// Hub) — ver CLAUDE.md, sección "Arquitectura multi-tenant". La fachada real
// de Casa Brava vive en /p/casa-brava, y ESA ruta sigue exigiendo sesión
// abajo, porque `isInviteOnlyBySlug("casa-brava")` es `true`. El bug de
// seguridad que motivó la regla original de CBR (acceso anónimo a la casa)
// sigue igual de cerrado; solo cambió el nombre de la ruta protegida. No
// vuelvas a agregar "/" a una lista de rutas protegidas pensando que se te
// olvidó — sería redirigir a /login a cualquier visitante público del
// directorio, y sería exactamente el bug que este comentario previene.
const PROPERTY_ROUTE_PATTERN = /^\/p\/([^/]+)(?:\/|$)/;

// `isInviteOnlyBySlug` vive en lib/mock/marketplace-data.ts, que corre en
// este mismo Edge Runtime en cada navegación. Ese archivo no puede importar
// nada de Node (`fs`, `path`) ni de `next/headers`/`lib/api/server.ts` — un
// import roto ahí no es un error de tipos sutil, es un 500 en TODAS las
// rutas del sitio, porque este middleware corre delante de cualquier página.

const ACCESS_FALLBACK_MAX_AGE = 60 * 60;
const REFRESH_FALLBACK_MAX_AGE = 7 * 24 * 60 * 60;

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

type Session = { access: string; refresh: string } | null;

/**
 * Canjea el refresh token. El backend rota el refresh en cada uso y deja el
 * anterior en lista negra, así que el par que vuelve reemplaza al completo.
 */
async function refreshTokens(refresh: string): Promise<Session> {
  try {
    const response = await fetch(`${API_BASE_URL}${AUTH_ENDPOINTS.refresh}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { access: string; refresh?: string };
    return { access: data.access, refresh: data.refresh ?? refresh };
  } catch {
    // El backend no responde: se trata como sesión no válida (fail closed).
    return null;
  }
}

/**
 * Confirma el rol contra la API en vez de creerle al claim del token.
 *
 * El middleware no verifica firmas, así que un token fabricado a mano podría
 * declarar cualquier `role`. Ese token no sirve para nada contra Django (la
 * firma no cuadra y toda petición devuelve 401), pero sin esta comprobación sí
 * alcanzaría para *entrar* a una ruta protegida por rol y ver la cáscara de la
 * página. Una llamada a `/api/usuarios/me/` cierra ese hueco: solo corre
 * cuando el claim ya declara uno de los roles permitidos, así que no penaliza
 * al resto de las navegaciones.
 *
 * Genérica en `allowedRoles` porque hay dos guards por rol distintos:
 * ADMIN_PREFIX (solo "admin") y OWNER_PANEL_PREFIX ("holder" o "admin").
 */
async function confirmarRol(access: string, allowedRoles: RoleType[]): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/usuarios/me/`, {
      headers: { Authorization: `Bearer ${access}`, Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return false;

    const perfil = (await response.json()) as Pick<Usuario, "role">;
    return allowedRoles.includes(perfil.role);
  } catch {
    return false;
  }
}

/**
 * Refresca la sesión en cada navegación y aplica los guards de ruta del lado
 * del servidor, antes de que la página renderice.
 *
 * Es el único lugar que puede persistir un token refrescado durante una
 * navegación normal: un Server Component no puede escribir cookies.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const propertySlug = pathname.match(PROPERTY_ROUTE_PATTERN)?.[1];
  const isOwnerPanelRoute = matchesPrefix(pathname, OWNER_PANEL_PREFIX);
  const isProtectedRoute =
    PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix)) ||
    (propertySlug !== undefined && isInviteOnlyBySlug(propertySlug));
  const isAdminRoute = matchesPrefix(pathname, ADMIN_PREFIX);

  let access = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refresh = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  let renewed: Session = null;

  if ((!access || isTokenExpired(access)) && refresh) {
    renewed = await refreshTokens(refresh);
    access = renewed?.access;

    // El token nuevo se escribe también en el request para que los Server
    // Components de ESTA navegación lo lean ya renovado, no solo el navegador
    // en la siguiente.
    if (renewed) {
      request.cookies.set(ACCESS_TOKEN_COOKIE, renewed.access);
      request.cookies.set(REFRESH_TOKEN_COOKIE, renewed.refresh);
    }
  }

  const haySesion = Boolean(access) && !isTokenExpired(access);

  // Nota: OWNER_PANEL_PREFIX ya queda cubierto por `isProtectedRoute` (vive
  // bajo /p/<TENANT_ZERO_SLUG>, que es INVITE_ONLY), pero se incluye explícito
  // aquí para que el requisito de sesión de esta ruta no dependa en silencio
  // de que Casa Brava siga siendo invitación-only — si eso cambiara, el
  // guard por rol de abajo seguiría exigiendo sesión de todos modos.
  if (!haySesion && (isProtectedRoute || isAdminRoute || isOwnerPanelRoute)) {
    const redirect = NextResponse.redirect(new URL("/login", request.url));
    // La sesión ya no vale: limpiar evita reintentar el mismo refresh muerto
    // en cada navegación siguiente.
    if (refresh) {
      redirect.cookies.delete(ACCESS_TOKEN_COOKIE);
      redirect.cookies.delete(REFRESH_TOKEN_COOKIE);
    }
    return redirect;
  }

  if (haySesion && isAdminRoute) {
    const rol = decodeJwt(access)?.role as RoleType | undefined;
    // Fail closed: cualquier caso ambiguo (rol distinto de "admin", token
    // ilegible, o la API que no confirma) sale de /admin. "/" ya no exige
    // sesión (es la landing pública del marketplace), pero eso no importa
    // aquí: esta rama solo corre cuando `haySesion` ya es `true`, así que
    // este redirect manda a alguien CON sesión a la landing, no a un
    // anónimo — no hay bucle con /login posible.
    if (rol !== "admin" || !(await confirmarRol(access as string, ["admin"]))) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Guard por rol del panel de gestión de Casa Brava: sesión ya confirmada
  // arriba, aquí solo se exige "holder" o "admin" — mismo patrón fail-closed
  // que ADMIN_PREFIX. Un huésped con sesión que intenta entrar vuelve a la
  // fachada de la propiedad, no a "/", porque ya sabemos que tiene invitación
  // válida a Casa Brava (si no, ya habría salido por el guard de arriba).
  if (haySesion && isOwnerPanelRoute) {
    const rol = decodeJwt(access)?.role as RoleType | undefined;
    if (!rol || !OWNER_PANEL_ROLES.includes(rol) || !(await confirmarRol(access as string, OWNER_PANEL_ROLES))) {
      return NextResponse.redirect(new URL(`/p/${TENANT_ZERO_SLUG}`, request.url));
    }
  }

  const response = NextResponse.next({ request });

  if (renewed) {
    response.cookies.set(
      ACCESS_TOKEN_COOKIE,
      renewed.access,
      cookieOptions(secondsUntilExpiry(renewed.access, ACCESS_FALLBACK_MAX_AGE))
    );
    response.cookies.set(
      REFRESH_TOKEN_COOKIE,
      renewed.refresh,
      cookieOptions(secondsUntilExpiry(renewed.refresh, REFRESH_FALLBACK_MAX_AGE))
    );
  }

  return response;
}

export const config = {
  matcher: [
    // Corre en todo excepto assets estáticos, imágenes optimizadas e íconos —
    // así la sesión se refresca en cada navegación real sin gastar ciclos en
    // archivos que no dependen de auth.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
