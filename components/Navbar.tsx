"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  function handleLogout() {
    // Mock: en producción esto invalidará la sesión real (Supabase Auth).
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white">
            CB
          </span>
          <span className="text-lg font-semibold tracking-tight text-neutral-900">
            Casa Brava
          </span>
        </Link>

        <button
          onClick={handleLogout}
          className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900"
        >
          Cerrar sesión
        </button>
      </nav>
    </header>
  );
}
