import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { supabaseUrl } from "@/lib/supabase/env";

// Cliente de Supabase con la Service Role Key — bypassa Row Level Security por
// completo y puede usar la Auth Admin API (ej. inviteUserByEmail). SERVER-ONLY:
// nunca importar este archivo desde un Client Component, ni desde ningún
// módulo que un Client Component también importe. Hoy solo lo usa
// app/admin/actions.ts.
//
// SUPABASE_SERVICE_ROLE_KEY se valida aquí y NO en lib/supabase/env.ts a
// propósito: env.ts lo importa lib/supabase/client.ts (Client Component), y
// como un módulo ES ejecuta todo su cuerpo top-level al importarse —no solo
// los bindings que se usan—, meter ahí la validación de una env var
// server-only tumbaría el bundle del navegador en cuanto esa var faltara del
// lado del cliente (nunca está: no lleva prefijo NEXT_PUBLIC_ a propósito).
function requireServiceRoleKey(): string {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error(
      "Falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY. Agrégala a .env.local " +
        "(sección Service Role Key) — ver CLAUDE.md."
    );
  }
  return value;
}

// Crea una instancia nueva por invocación, igual que lib/supabase/server.ts.
// No usa createServerClient de @supabase/ssr porque este cliente no gestiona
// sesión de usuario ni cookies: siempre actúa con privilegios de servicio,
// por eso se desactivan explícitamente autoRefreshToken/persistSession.
export function createAdminClient() {
  return createSupabaseClient<Database, "public">(supabaseUrl, requireServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
