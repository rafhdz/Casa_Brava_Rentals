import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, API_BASE_URL, AUTH_ENDPOINTS, REFRESH_TOKEN_COOKIE } from "@/lib/api/config";
import { decodeJwt, isTokenExpired, secondsUntilExpiry } from "@/lib/api/jwt";
import type { RoleType, Usuario } from "@/lib/api/types";

// Nota: Next.js 16 renombró esta convención de archivo a `proxy.ts` (con la
// función exportada como `proxy`), pero sigue reconociendo `middleware.ts` +
// `export function middleware` vía compatibilidad hacia atrás (ver
// isMiddlewareFilename en next/dist/build/utils.js). Si en una versión futura
// se retira ese soporte, renombrar el archivo y la función es el único cambio
// necesario (hay codemod oficial:
// `npx @next/codemod@canary middleware-to-proxy .`).

// Rutas (por prefijo) que solo requieren sesión activa.
const PROTECTED_PREFIXES = ["/reservar", "/perfil", "/carrito", "/servicios"];

// Rutas de coincidencia EXACTA que solo requieren sesión activa. "/" no puede
// vivir en PROTECTED_PREFIXES: `startsWith("/")` haría match de cualquier
// pathname —incluidos /login y /register— y generaría un bucle de redirección.
const PROTECTED_EXACT_PATHS = ["/"];

// Ruta que además exige rol de administrador.
const ADMIN_PREFIX = "/admin";

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
 * declarar `role: "admin"`. Ese token no sirve para nada contra Django (la
 * firma no cuadra y toda petición devuelve 401), pero sin esta comprobación sí
 * alcanzaría para *entrar* a /admin y ver la cáscara de la página. Una llamada
 * a `/api/usuarios/me/` cierra ese hueco: solo corre cuando el claim ya dice
 * "admin", así que no penaliza al resto de las navegaciones.
 */
async function confirmarRolAdmin(access: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/usuarios/me/`, {
      headers: { Authorization: `Bearer ${access}`, Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return false;

    const perfil = (await response.json()) as Pick<Usuario, "role">;
    return perfil.role === "admin";
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

  const isProtectedRoute =
    PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix)) ||
    PROTECTED_EXACT_PATHS.includes(pathname);
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

  if (!haySesion && (isProtectedRoute || isAdminRoute)) {
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
    // ilegible, o la API que no confirma) sale de /admin. Como "/" también
    // exige sesión y aquí ya hay una válida, este redirect no rebota a /login.
    if (rol !== "admin" || !(await confirmarRolAdmin(access as string))) {
      return NextResponse.redirect(new URL("/", request.url));
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
