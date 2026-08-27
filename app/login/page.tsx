"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmedEmail = email.trim();
    let hasError = false;

    if (!trimmedEmail) {
      setEmailError("El correo electrónico es obligatorio.");
      hasError = true;
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      setEmailError("Ingresa un correo electrónico válido (ej. nombre@dominio.com).");
      hasError = true;
    } else {
      setEmailError(null);
    }

    if (!password) {
      setPasswordError("La contraseña es obligatoria.");
      hasError = true;
    } else {
      setPasswordError(null);
    }

    if (hasError) return;

    // Mock: simula un login exitoso. La validación real llegará con Supabase Auth.
    const sessionUser = login(trimmedEmail);
    router.push(sessionUser.rol === "admin" ? "/admin" : "/");
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 sm:px-6">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-base font-semibold text-white">
        CB
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Acceso restringido</h1>
      <p className="mt-2 text-center text-sm text-neutral-500">
        Casa Brava Rentals es de acceso exclusivo por invitación. Ingresa con las credenciales
        que te compartimos para continuar.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 flex w-full flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-neutral-700">Correo electrónico</span>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            placeholder="tu@invitado.com"
            className={`rounded-lg border px-3 py-2 text-sm text-neutral-900 focus:outline-none ${
              emailError
                ? "border-red-400 focus:border-red-500"
                : "border-neutral-300 focus:border-neutral-900"
            }`}
          />
          {emailError && <p className="text-xs text-red-600">{emailError}</p>}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-neutral-700">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError(null);
            }}
            placeholder="••••••••"
            className={`rounded-lg border px-3 py-2 text-sm text-neutral-900 focus:outline-none ${
              passwordError
                ? "border-red-400 focus:border-red-500"
                : "border-neutral-300 focus:border-neutral-900"
            }`}
          />
          {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
        </label>

        <button
          type="submit"
          className="mt-2 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
        >
          Ingresar
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-neutral-400">
        (Tip para demo: usa admin@test.com para ver el panel de administrador)
      </p>

      <p className="mt-6 text-center text-xs text-neutral-400">
        ¿No tienes invitación? Contacta directamente a la administración de la propiedad.
      </p>
    </div>
  );
}
