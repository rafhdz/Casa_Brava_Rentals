import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

// Rutas (por prefijo) que solo requieren sesión activa.
const PROTECTED_PREFIXES = ["/reservar", "/perfil", "/carrito", "/servicios"];
// Rutas de coincidencia EXACTA que solo requieren sesión activa. "/" no puede
// vivir en PROTECTED_PREFIXES: con matchesPrefix (que usa startsWith) "/"
// haría match de cualquier pathname y protegería /login, /register, etc.,
// generando un bucle de redirección a /login.
const PROTECTED_EXACT_PATHS = ["/"];
// Ruta que además requiere role === "admin" en la tabla profiles.
const ADMIN_PREFIX = "/admin";

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// Refresca la sesión de Supabase en cada navegación y aplica los guards de
// ruta desde el servidor (reemplaza a components/ProtectedRoute.tsx, que
// redirigía en el cliente después de que la página ya había cargado).
export async function updateSession(request: NextRequest) {
  // Respuesta base: se reasigna dentro de `setAll` cada vez que el cliente
  // necesita escribir cookies (token refrescado), para no perder las que ya
  // se hayan seteado en una llamada anterior dentro del mismo request.
  let supabaseResponse = NextResponse.next({ request });

  // El segundo genérico ("public") evita el mismo bug de inferencia de schema
  // descrito en lib/supabase/client.ts y lib/supabase/server.ts.
  const supabase = createServerClient<Database, "public">(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
        // Cache-Control/Pragma que exige @supabase/ssr en respuestas que
        // escriben cookies de auth, para que un CDN/proxy no las cachee y
        // sirva la sesión de un usuario a otro.
        Object.entries(headers).forEach(([key, value]) => {
          supabaseResponse.headers.set(key, value);
        });
      },
    },
  });

  // No ejecutar código entre createServerClient y auth.getUser(): un error
  // aquí puede dejar sesiones "colgadas" muy difíciles de depurar. getUser()
  // (a diferencia de getSession()) valida el token contra Supabase Auth en
  // vez de solo decodificar el JWT local, por eso se usa aquí para decidir
  // acceso — es el único punto donde el guard es de verdad "de servidor".
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtectedRoute =
    PROTECTED_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix)) ||
    PROTECTED_EXACT_PATHS.includes(pathname);
  const isAdminRoute = matchesPrefix(pathname, ADMIN_PREFIX);

  if (!user && (isProtectedRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isAdminRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // Fail closed: si el rol no es exactamente "admin" (incluye "holder",
    // "guest", o si el perfil no se pudo leer), fuera de /admin.
    if (profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // IMPORTANTE: retornar `supabaseResponse` tal cual (o un redirect de
  // arriba) — construir una respuesta nueva aquí perdería las cookies
  // refrescadas por `setAll`. Ver el comentario de @supabase/ssr en
  // createServerClient.
  return supabaseResponse;
}
