"use server";

// Autenticación contra SimpleJWT. Son Server Actions y no llamadas desde el
// navegador porque el resultado del login son cookies httpOnly: solo el
// servidor puede escribirlas (ver lib/api/session.ts).

import { AUTH_ENDPOINTS } from "@/lib/api/config";
import { apiFetch, ApiError } from "@/lib/api/client";
import { clearSessionTokens, readSessionTokens, writeSessionTokens } from "@/lib/api/session";
import type { TokenPair, Usuario } from "@/lib/api/types";

export type AuthResult = { user: Usuario } | { error: string };

export type RegisterInput = {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  apellido_paterno: string;
  apellido_materno?: string | null;
  phone?: string | null;
};

/**
 * Traduce los errores de autenticación a un mensaje para el usuario.
 *
 * Un 401 de `/api/auth/token/` significa siempre lo mismo (credenciales que no
 * corresponden a una cuenta activa) y el texto de SimpleJWT no está pensado
 * para mostrarse tal cual. Los errores de validación de campo del registro sí
 * vienen redactados por el backend, así que esos se dejan pasar.
 */
function translateAuthError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isUnauthorized) return "Correo o contraseña incorrectos.";
    if (error.status === 0) return error.message;
    if (error.status >= 500) return "El servidor no está disponible. Intenta más tarde.";
    return error.message;
  }
  return "No pudimos iniciar sesión. Intenta de nuevo.";
}

/** Inicia sesión y deja los tokens en cookies httpOnly. */
export async function loginAction(email: string, password: string): Promise<AuthResult> {
  try {
    const tokens = await apiFetch<TokenPair>(AUTH_ENDPOINTS.token, {
      method: "POST",
      body: { email, password },
    });

    await writeSessionTokens(tokens);
    return { user: tokens.user };
  } catch (error) {
    return { error: translateAuthError(error) };
  }
}

/**
 * Alta de huésped e inicio de sesión inmediato.
 *
 * El endpoint de registro solo crea la cuenta (siempre con rol `guest`, no hay
 * forma de pedir otro desde aquí) y no devuelve tokens, así que se encadena un
 * login para que la persona entre directo sin pasar por /login.
 *
 * Ya no hace falta la compensación que existía con Supabase —donde `signUp()`
 * creaba la cuenta y un segundo `insert` creaba el perfil, con la posibilidad
 * de que el segundo fallara y dejara un usuario huérfano—: aquí la cuenta y su
 * perfil son la misma fila y se crean en una sola petición, que o pasa entera
 * o no pasa.
 */
export async function registerAction(input: RegisterInput): Promise<AuthResult> {
  try {
    await apiFetch<Usuario>(AUTH_ENDPOINTS.registro, {
      method: "POST",
      body: {
        email: input.email,
        password: input.password,
        password_confirm: input.password_confirm,
        first_name: input.first_name,
        apellido_paterno: input.apellido_paterno,
        apellido_materno: input.apellido_materno || null,
        phone: input.phone || null,
      },
    });
  } catch (error) {
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "No pudimos completar tu registro. Intenta de nuevo.",
    };
  }

  return loginAction(input.email, input.password);
}

/**
 * Cierra la sesión: invalida el refresh token en el backend (lista negra) y
 * borra las cookies.
 *
 * Si el backend no responde, las cookies se borran igual — dejar una sesión
 * abierta en el navegador porque falló una petición sería lo peor de los dos
 * mundos.
 */
export async function logoutAction(): Promise<void> {
  const { refresh } = await readSessionTokens();

  if (refresh) {
    try {
      await apiFetch(AUTH_ENDPOINTS.logout, { method: "POST", body: { refresh } });
    } catch {
      // Token ya expirado o en lista negra: no hay nada que invalidar.
    }
  }

  await clearSessionTokens();
}
