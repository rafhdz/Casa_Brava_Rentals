"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import type { UserRole } from "@/lib/mock-data";
import BackButton from "@/components/BackButton";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrador",
  guest: "Huésped",
};

export default function PerfilPage() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 sm:px-6">
        <p className="text-sm text-neutral-500">Cargando perfil…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-2 px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-neutral-500">
          Debes iniciar sesión para ver tu perfil. Redirigiendo…
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12 sm:px-6">
      <BackButton />

      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Hola, {user.nombre}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Información de tu sesión actual (simulada).
        </p>
      </div>

      <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3 p-6">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-900 text-xl font-semibold text-white">
            {user.nombre.charAt(0).toUpperCase()}
          </span>
          <span className="text-lg font-semibold text-neutral-900">{user.nombre}</span>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              user.rol === "admin" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700"
            }`}
          >
            {ROLE_LABELS[user.rol]}
          </span>
        </div>

        <dl className="flex flex-col gap-3 p-5 text-sm">
          <div className="flex justify-between border-b border-neutral-100 pb-3">
            <dt className="text-neutral-500">Nombre</dt>
            <dd className="font-medium text-neutral-900">{user.nombre}</dd>
          </div>
          <div className="flex justify-between border-b border-neutral-100 pb-3">
            <dt className="text-neutral-500">Correo</dt>
            <dd className="font-medium text-neutral-900">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Rol</dt>
            <dd className="font-medium text-neutral-900">{ROLE_LABELS[user.rol]}</dd>
          </div>
        </dl>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="rounded-full border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 transition-all duration-300 ease-in-out hover:border-neutral-900 hover:text-neutral-900 active:scale-95"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
