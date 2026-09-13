"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, Library, Users, type LucideIcon } from "lucide-react";
import { TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";

/**
 * Navegación secundaria del panel de gestión de Casa Brava
 * (`/p/casa-brava/owner-panel/**`).
 *
 * Vive aparte del Navbar porque solo tiene sentido dentro de ese subárbol: el
 * Navbar es global y ya se muestra en todas las rutas, incluidas las del
 * huésped. Cada página del panel la monta arriba de su contenido.
 *
 * No confundir con el panel universal de PHH en `/admin` (ver
 * app/admin/page.tsx y components/GlobalUsersPanel.tsx): ese es del
 * administrador del marketplace, este es el panel de gestión del propietario
 * (o admin) de Casa Brava — ver CLAUDE.md, "Migración del panel de
 * administración a owner-panel".
 */

const OWNER_PANEL_ROOT = `/p/${TENANT_ZERO_SLUG}/owner-panel`;

type OwnerLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * La raíz del panel se compara por igualdad, no por prefijo: con
   * `startsWith` haría match también en sus subrutas (`.../reservations`,
   * `.../catalogos`) y se marcarían dos pestañas activas a la vez. Misma
   * distinción exacta/prefijo que hace `middleware.ts` con "/".
   */
  exact?: boolean;
};

const OWNER_LINKS: OwnerLink[] = [
  { href: OWNER_PANEL_ROOT, label: "Usuarios", icon: Users, exact: true },
  { href: `${OWNER_PANEL_ROOT}/reservations`, label: "Reservaciones", icon: CalendarRange },
  { href: `${OWNER_PANEL_ROOT}/catalogos`, label: "Catálogos", icon: Library },
];

export default function OwnerNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones del panel"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      {OWNER_LINKS.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300 ease-in-out active:scale-95 ${
              isActive
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
