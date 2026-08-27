"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { mockUsers, type MockUser } from "@/lib/mock-data";

const SESSION_STORAGE_KEY = "casabrava_session_user";

type AuthContextValue = {
  user: MockUser | null;
  isLoading: boolean;
  login: (email: string) => MockUser;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hidrata la sesión mockeada desde localStorage al cargar la app (una sola vez, al montar).
  useEffect(() => {
    let storedUser: MockUser | null = null;
    try {
      const stored = window.localStorage.getItem(SESSION_STORAGE_KEY);
      storedUser = stored ? (JSON.parse(stored) as MockUser) : null;
    } catch {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación única de la sesión mockeada desde localStorage al montar; no es un efecto derivado en cadena.
    setUser(storedUser);
    setIsLoading(false);
  }, []);

  function login(email: string): MockUser {
    const normalizedEmail = email.trim().toLowerCase();
    const matchedUser = mockUsers.find((u) => u.email.toLowerCase() === normalizedEmail);

    // Mock: solo admin@test.com asume la identidad completa del usuario en mockUsers.
    // Cualquier otro correo entra como huésped genérico (ver CLAUDE.md).
    const sessionUser: MockUser =
      normalizedEmail === "admin@test.com" && matchedUser
        ? matchedUser
        : {
            id: `guest-${Date.now()}`,
            nombre: "Huésped",
            email: email.trim(),
            rol: "guest",
            estado: "invitado",
          };

    setUser(sessionUser);
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    return sessionUser;
  }

  function logout() {
    setUser(null);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
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
