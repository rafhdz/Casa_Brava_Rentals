import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Nota: Next.js 16 renombró esta convención de archivo a `proxy.ts` (con la
// función exportada como `proxy`), pero sigue reconociendo `middleware.ts` +
// `export function middleware` vía compatibilidad hacia atrás (ver
// isMiddlewareFilename en next/dist/build/utils.js) — no está deprecado al
// punto de dejar de funcionar. Si en una futura versión de Next.js se retira
// ese soporte, renombrar este archivo a `proxy.ts` y la función a `proxy` es
// el único cambio necesario (existe un codemod oficial:
// `npx @next/codemod@canary middleware-to-proxy .`).
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Corre en todo excepto assets estáticos, imágenes optimizadas e íconos —
    // así la sesión se refresca en cada navegación real sin gastar ciclos en
    // archivos que no dependen de auth.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
