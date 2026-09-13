"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";

// Nav pública del marketplace territorial (Parras Home Hub): /, /sobre-nosotros,
// /conoce-parras, /supplier. Ver la nota en TenantNavbar.tsx sobre por qué
// existen dos pares Navbar/Footer — este no sabe nada de carrito/reservación,
// esa lógica vive en TenantNavbar y no debe mezclarse aquí.
const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/sobre-nosotros", label: "Sobre nosotros" },
  { href: "/conoce-parras", label: "Conoce Parras" },
];

export default function MarketplaceNavbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center" onClick={() => setIsMenuOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático de public/, no requiere el optimizador de next/image */}
          <img src="/icons/system/PHH_logo.svg" alt="Parras Home Hub" className="h-9 w-auto" />
        </Link>

        <div className="hidden items-center gap-6 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <Link
            href="/supplier"
            className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900"
          >
            Portal de anfitrión
          </Link>
          {user ? (
            <Link
              href={`/p/${TENANT_ZERO_SLUG}`}
              className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
            >
              Mi cuenta
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 hover:bg-neutral-100 sm:hidden"
          aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {isMenuOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </nav>

      {isMenuOpen && (
        <div className="flex flex-col gap-1 border-t border-neutral-200 bg-white px-4 py-3 sm:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/supplier"
            onClick={() => setIsMenuOpen(false)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Portal de anfitrión
          </Link>
          {user ? (
            <Link
              href={`/p/${TENANT_ZERO_SLUG}`}
              onClick={() => setIsMenuOpen(false)}
              className="mt-1 rounded-full bg-neutral-900 px-3 py-2 text-center text-sm font-semibold text-white"
            >
              Mi cuenta
            </Link>
          ) : (
            <div className="mt-1 flex gap-2">
              <Link
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="flex-1 rounded-full border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-700"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMenuOpen(false)}
                className="flex-1 rounded-full bg-neutral-900 px-3 py-2 text-center text-sm font-semibold text-white"
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
