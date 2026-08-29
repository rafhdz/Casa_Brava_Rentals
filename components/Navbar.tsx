"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { totalItems } = useCart();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático de public/, no requiere el optimizador de next/image */}
          <img src="/icons/system/logo.svg" alt="Casa Brava" className="h-10 w-auto" />
        </Link>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/carrito"
              title="Carrito"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático de public/, no requiere el optimizador de next/image */}
              <img src="/icons/system/cart.svg" alt="" aria-hidden className="h-5 w-5" />
              <span className="sr-only">Carrito</span>
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-semibold text-white">
                  {totalItems}
                </span>
              )}
            </Link>
            <Link
              href="/perfil"
              title="Perfil"
              className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático de public/, no requiere el optimizador de next/image */}
              <img src="/icons/system/profile.svg" alt="" aria-hidden className="h-5 w-5" />
              <span className="sr-only">Perfil</span>
            </Link>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático de public/, no requiere el optimizador de next/image */}
              <img src="/icons/system/logout.svg" alt="" aria-hidden className="h-5 w-5" />
              <span className="sr-only">Cerrar sesión</span>
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900"
          >
            Iniciar sesión
          </Link>
        )}
      </nav>
    </header>
  );
}
