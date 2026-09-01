"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type LoginResult = {
  error: string | null;
  role: Profile["role"] | null;
};

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // createBrowserClient mantiene un singleton interno; useState evita
  // recrear la referencia en cada render sin necesidad de useMemo.
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Contador que identifica la petición de perfil más reciente. Si el
  // usuario cambia de sesión mientras un fetch anterior sigue en vuelo, la
  // respuesta "vieja" se descarta en vez de pisar el estado actual.
  const profileRequestId = useRef(0);

  const loadProfile = useCallback(
    async (nextUser: User | null): Promise<Profile | null> => {
      const requestId = ++profileRequestId.current;

      if (!nextUser) {
        setProfile(null);
        return null;
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", nextUser.id)
        .single();

      if (requestId !== profileRequestId.current) return data ?? null;
      setProfile(data ?? null);
      return data ?? null;
    },
    [supabase]
  );

  useEffect(() => {
    let isMounted = true;

    // Hidratación inicial: lee la sesión ya persistida en cookies (si la
    // hay) antes de que dispare el primer evento de onAuthStateChange.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      void loadProfile(session?.user ?? null).finally(() => {
        if (isMounted) setIsLoading(false);
      });
    });

    // Mantiene el estado sincronizado ante login/logout/refresh de token,
    // incluido lo que pase en otras pestañas del mismo navegador.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      void loadProfile(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  async function login(email: string, password: string): Promise<LoginResult> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return { error: error?.message ?? "No se pudo iniciar sesión.", role: null };
    }

    // Reutiliza loadProfile (no una consulta aparte) para no disparar dos
    // requests a `profiles` en paralelo justo después del sign-in: se
    // observó que hacerlo corre una carrera real contra el fetch que
    // dispara onAuthStateChange para el mismo evento SIGNED_IN — el cliente
    // de Supabase todavía está propagando el token nuevo internamente y una
    // de las dos peticiones concurrentes puede recibir 401. Un solo
    // reintento cubre ese caso transitorio sin enmascarar errores reales
    // (credenciales inválidas ya se filtraron arriba).
    let profile = await loadProfile(data.user);
    if (!profile) {
      profile = await loadProfile(data.user);
    }

    return { error: null, role: profile?.role ?? null };
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, login, logout }}>
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
