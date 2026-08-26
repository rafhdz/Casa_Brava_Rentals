"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Mock: simula un login exitoso. La validación real llegará con Supabase Auth.
    router.push("/");
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

      <form onSubmit={handleSubmit} className="mt-8 flex w-full flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-neutral-700">Correo electrónico</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@invitado.com"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-neutral-700">Contraseña</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          />
        </label>

        <button
          type="submit"
          className="mt-2 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
        >
          Ingresar
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-neutral-400">
        ¿No tienes invitación? Contacta directamente a la administración de la propiedad.
      </p>
    </div>
  );
}
