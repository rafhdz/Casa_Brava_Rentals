"use client";

import { createContext, useContext, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { loginAction, logoutAction } from "@/app/actions/auth";
import type { RoleType, Usuario } from "@/lib/api/types";

// Sesión del lado del cliente.
//
// A diferencia de la versión con Supabase, este contexto **no** guarda estado
// propio ni consulta el perfil por su cuenta: el token vive en cookies
// httpOnly que el navegador no puede leer, así que quien resuelve la sesión es
// el layout raíz (Server Component) y la entrega ya hidratada por prop. Eso
// elimina de un golpe el parpadeo de carga inicial, la suscripción a
// `onAuthStateChange` y la carrera entre el fetch del perfil y el del login
// que hubo que sortear con un reintento.
//
// También desaparece el par `user` + `profile`: Django fusiona credenciales y
// perfil en un solo modelo, así que aquí hay un único `user`.

type LoginResult = { error: string | null; role: RoleType | null };

type AuthContextValue = {
  user: Usuario | null;
  /** Hay una transición de sesión (login/logout) en vuelo. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  initialUser,
  children,
}: {
  /** Perfil resuelto en el servidor por app/layout.tsx. `null` si no hay sesión. */
  initialUser: Usuario | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [isLoading, startTransition] = useTransition();

  // `initialUser` es la fuente de verdad, no una semilla de useState: cada
  // `router.refresh()` vuelve a renderizar el layout en el servidor y baja el
  // perfil actualizado. Copiarlo a estado obligaría a sincronizarlo con un
  // efecto, justo el patrón que la regla react-hooks/set-state-in-effect
  // prohíbe (ver CLAUDE.md).
  const user = initialUser;

  async function login(email: string, password: string): Promise<LoginResult> {
    const result = await loginAction(email, password);

    if ("error" in result) {
      return { error: result.error, role: null };
    }

    // Quien llama decide a dónde navegar (ver app/login/page.tsx); aquí solo
    // se invalida el árbol para que el layout vuelva a leer la sesión nueva.
    startTransition(() => router.refresh());
    return { error: null, role: result.user.role };
  }

  async function logout(): Promise<void> {
    await logoutAction();
    startTransition(() => router.refresh());
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
