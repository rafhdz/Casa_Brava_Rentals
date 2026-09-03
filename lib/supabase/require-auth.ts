import { createClient as createServerClient } from "@/lib/supabase/server";

// Guard compartido por cualquier Server Action que solo requiera sesión
// activa (sin importar el rol) — ej. el checkout de huésped en
// app/actions/checkout.ts. Mismo criterio fail-closed que requireAdmin
// (lib/supabase/require-admin.ts), pero sin el chequeo de role === "admin".
// Devuelve el propio cliente autenticado del caller (para que lo reutilice
// en vez de abrir una segunda conexión) y su userId.
export async function requireAuth(): Promise<
  | { supabase: Awaited<ReturnType<typeof createServerClient>>; userId: string }
  | { error: string }
> {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autenticado." };
  }

  return { supabase, userId: user.id };
}
