import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

// Cliente de Supabase para Client Components. `createBrowserClient` mantiene
// un singleton interno, así que llamar a esta función varias veces es seguro.
//
// El segundo genérico ("public") se pasa explícito porque el default de
// SchemaName en supabase-js espera un campo `__InternalSupabase` en el tipo
// `Database` (lo agregan versiones más nuevas del generador de tipos); nuestro
// `database.types.ts` no lo trae, y sin este genérico explícito la inferencia
// de schema se rompe y cualquier `.from("tabla")` deja de tipar.
export function createClient() {
  return createBrowserClient<Database, "public">(supabaseUrl, supabaseAnonKey);
}
