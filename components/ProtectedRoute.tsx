"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 sm:px-6">
        <p className="text-sm text-neutral-500">Cargando…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-2 px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-neutral-500">Debes iniciar sesión para continuar. Redirigiendo…</p>
      </div>
    );
  }

  return <>{children}</>;
}
