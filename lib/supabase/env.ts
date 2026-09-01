// Variables de entorno de Supabase, validadas una sola vez y compartidas por
// los tres clientes (browser, server, middleware) — ver CLAUDE.md.
//
// Se leen a través de una función (en vez de exportar `process.env.X`
// directamente) para que TypeScript infiera `string`, no `string | undefined`
// — createBrowserClient/createServerClient de @supabase/ssr no aceptan
// `undefined` para la URL/key.
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Revisa .env.local.`);
  }
  return value;
}

export const supabaseUrl = requireEnv(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL
);
export const supabaseAnonKey = requireEnv(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
