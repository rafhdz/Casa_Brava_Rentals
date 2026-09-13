"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ShoppingCart, User } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useCart } from "@/lib/CartContext";
import { TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";

// Nav de la experiencia de huésped y de gestión de Casa Brava (Tenant 0):
// /p/** (incluye /p/casa-brava/owner-panel), /carrito, /perfil. Es el
// contenido exacto de lo que antes era components/Navbar.tsx —
// components/Navbar.tsx ahora solo decide CUÁL de los dos navs (este o
// MarketplaceNavbar) montar según la ruta; "/login", "/register" y "/admin"
// pasaron a MarketplaceNavbar (ver esa nota en Navbar.tsx). No fusionar de
// nuevo en un solo componente: son dos audiencias distintas (ver CLAUDE.md,
// "Arquitectura multi-tenant").
const OWNER_PANEL_PREFIX = `/p/${TENANT_ZERO_SLUG}/owner-panel`;

export default function TenantNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { totalItems } = useCart();

  const isOwnerPanelRoute = pathname.startsWith(OWNER_PANEL_PREFIX);

  // Este componente también monta en /p/<slug> de las propiedades OPEN
  // (mock, sin backend) — ahí NO corresponde el logo de Casa Brava. Regla de
  // visualización de CLAUDE.md: CBR_logo.svg es exclusivo de
  // /p/casa-brava/** (incluido su owner-panel); todo lo demás usa
  // PHH_logo.svg, igual que el resto del marketplace.
  const isCasaBravaScope = pathname.startsWith(`/p/${TENANT_ZERO_SLUG}`);
  const logoHref = isCasaBravaScope ? `/p/${TENANT_ZERO_SLUG}` : "/";
  const logoSrc = isCasaBravaScope ? "/icons/system/CBR_logo.svg" : "/icons/system/PHH_logo.svg";
  const logoAlt = isCasaBravaScope ? "Casa Brava" : "Parras Home Hub";

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href={logoHref} className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático de public/, no requiere el optimizador de next/image */}
          <img
            src={logoSrc}
            alt={logoAlt}
            className="h-10 w-auto"
          />
        </Link>

        {user && (
          <div className="flex items-center gap-2 sm:gap-3">
            {!isOwnerPanelRoute && (
              <Link
                href="/carrito"
                title="Carrito"
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                <ShoppingCart
                  className="h-5 w-5"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="sr-only">Carrito</span>
                {totalItems > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-neutral-900 px-1 text-[10px] font-semibold text-white">
                    {totalItems}
                  </span>
                )}
              </Link>
            )}
            <Link
              href="/perfil"
              title="Perfil"
              className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              <User className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              <span className="sr-only">Perfil</span>
            </Link>
            <button
              onClick={handleLogout}
              title="Cerrar sesión"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900"
            >
              <LogOut className="h-5 w-5" strokeWidth={1.75} aria-hidden />
              <span className="sr-only">Cerrar sesión</span>
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
