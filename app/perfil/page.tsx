"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import type { Database } from "@/lib/database.types";
import BackButton from "@/components/BackButton";

type RoleType = Database["public"]["Enums"]["role_type"];

const ROLE_LABELS: Record<RoleType, string> = {
  admin: "Administrador",
  holder: "Propietario",
  guest: "Huésped",
};

export default function PerfilPage() {
  const { user, profile, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  // isLoading cubre la hidratación de la sesión; una vez hay `user` puede
  // faltar un instante más mientras se resuelve el fetch a `profiles`.
  if (isLoading || (user && !profile)) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 sm:px-6">
        <p className="text-sm text-neutral-500">Cargando perfil…</p>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-2 px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-neutral-500">
          Debes iniciar sesión para ver tu perfil. Redirigiendo…
        </p>
      </div>
    );
  }

  const fullName = [profile.first_name, profile.apellido_paterno, profile.apellido_materno]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12 sm:px-6">
      <BackButton />

      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Hola, {profile.first_name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Información de tu sesión actual.
        </p>
      </div>

      <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-3 p-6">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-900 text-xl font-semibold text-white">
            {profile.first_name.charAt(0).toUpperCase()}
          </span>
          <span className="text-lg font-semibold text-neutral-900">{fullName}</span>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
              profile.role === "admin" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700"
            }`}
          >
            {ROLE_LABELS[profile.role]}
          </span>
        </div>

        <dl className="flex flex-col gap-3 p-5 text-sm">
          <div className="flex justify-between border-b border-neutral-100 pb-3">
            <dt className="text-neutral-500">Nombre</dt>
            <dd className="font-medium text-neutral-900">{fullName}</dd>
          </div>
          <div className="flex justify-between border-b border-neutral-100 pb-3">
            <dt className="text-neutral-500">Correo</dt>
            <dd className="font-medium text-neutral-900">{profile.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Rol</dt>
            <dd className="font-medium text-neutral-900">{ROLE_LABELS[profile.role]}</dd>
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
