import { createClient as createServerClient } from "@/lib/supabase/server";

// Guard compartido por cualquier Server Action de /admin: confirma sesión
// activa y role === "admin" en profiles, igual que el guard de /admin en
// lib/supabase/middleware.ts (fail closed — cualquier caso ambiguo, incluido
// no poder leer el perfil, se trata como no autorizado). Devuelve el propio
// cliente autenticado del caller (para que lo reutilice en vez de abrir una
// segunda conexión) y su userId.
//
// Extraído de app/admin/actions.ts (antes privado ahí) para que
// app/admin/reservations/actions.ts reutilice exactamente el mismo guard sin
// duplicar lógica de seguridad — ver CLAUDE.md, "CRUD de reservaciones".
export async function requireAdmin(): Promise<
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "No autorizado." };
  }

  return { supabase, userId: user.id };
}
