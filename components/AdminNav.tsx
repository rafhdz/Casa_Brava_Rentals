"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, Library, Users, type LucideIcon } from "lucide-react";

/**
 * Navegación secundaria del panel de administración.
 *
 * Vive aparte del Navbar porque solo tiene sentido dentro de `/admin/*`: el
 * Navbar es global y ya se muestra en todas las rutas, incluidas las del
 * huésped. Cada página del panel la monta arriba de su contenido.
 */

type AdminLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  /**
   * `/admin` se compara por igualdad, no por prefijo: con `startsWith` haría
   * match también en `/admin/reservations` y `/admin/catalogos`, y se marcarían
   * dos pestañas activas a la vez. Misma distinción exacta/prefijo que hace
   * `middleware.ts` con "/".
   */
  exact?: boolean;
};

const ADMIN_LINKS: AdminLink[] = [
  { href: "/admin", label: "Usuarios", icon: Users, exact: true },
  { href: "/admin/reservations", label: "Reservaciones", icon: CalendarRange },
  { href: "/admin/catalogos", label: "Catálogos", icon: Library },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones del panel"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      {ADMIN_LINKS.map(({ href, label, icon: Icon, exact }) => {
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
