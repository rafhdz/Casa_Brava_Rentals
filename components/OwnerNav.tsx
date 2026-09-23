"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarRange, Library, Users, type LucideIcon } from "lucide-react";
import { ownerPanelRoutes } from "@/lib/owner-panel";
import { TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";

/**
 * Navegación secundaria del panel de gestión de UNA propiedad
 * (`/p/<propertySlug>/owner-panel/**`).
 *
 * Vive aparte del Navbar porque solo tiene sentido dentro de ese subárbol: el
 * Navbar es global y ya se muestra en todas las rutas, incluidas las del
 * huésped. Cada página del panel la monta arriba de su contenido.
 *
 * **Parametrizado por propiedad, montado hoy solo para Tenant 0.** El
 * componente no sabe nada de Casa Brava: recibe un `propertySlug` y arma sus
 * tres rutas con `ownerPanelRoutes()` (lib/owner-panel.ts). Hoy las únicas
 * páginas que lo montan son las de la carpeta estática
 * `app/p/casa-brava/owner-panel/`, que le pasan `TENANT_ZERO_SLUG` explícito;
 * el default existe para que un montaje futuro sin prop siga cayendo en el
 * panel que sí existe, no para invitar a omitirlo. Cuando el backend sirva
 * varias propiedades con panel propio, esas páginas se mueven a
 * `app/p/[slug]/owner-panel/` y le pasan `params.slug`: este componente no
 * cambia.
 *
 * No confundir con el panel universal de PHH en `/admin` (ver
 * app/admin/page.tsx y components/GlobalUsersPanel.tsx): ese es del
 * administrador del marketplace, este es el panel de gestión del propietario
 * (o admin) de una propiedad — ver CLAUDE.md, "Migración del panel de
 * administración a owner-panel".
 */

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

function ownerLinks(propertySlug: string): OwnerLink[] {
  const routes = ownerPanelRoutes(propertySlug);
  return [
    { href: routes.root, label: "Usuarios", icon: Users, exact: true },
    { href: routes.reservations, label: "Reservaciones", icon: CalendarRange },
    { href: routes.catalogos, label: "Catálogos", icon: Library },
  ];
}

export default function OwnerNav({
  propertySlug = TENANT_ZERO_SLUG,
}: {
  propertySlug?: string;
}) {
  const pathname = usePathname();
  const links = ownerLinks(propertySlug);

  return (
    <nav
      aria-label="Secciones del panel"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      {links.map(({ href, label, icon: Icon, exact }) => {
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
