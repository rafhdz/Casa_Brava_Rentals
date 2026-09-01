import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

// Cliente de Supabase para Server Components, Server Actions y Route Handlers.
// Crear una instancia nueva por request — nunca reutilizar entre requests.
//
// El segundo genérico ("public") se pasa explícito por la misma razón que en
// lib/supabase/client.ts: sin él, la inferencia de schema de supabase-js se
// rompe con nuestro database.types.ts (no trae `__InternalSupabase`).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database, "public">(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Se llamó desde un Server Component (no puede escribir cookies).
          // Se puede ignorar porque middleware.ts ya refresca la sesión en
          // cada navegación — ver lib/supabase/middleware.ts.
        }
      },
    },
  });
}
