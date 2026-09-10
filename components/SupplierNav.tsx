"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2 } from "lucide-react";

// Nav secundaria del portal de anfitrión — mismo patrón que AdminNav.tsx:
// vive aparte del Navbar global porque solo tiene sentido dentro de
// /supplier/*. Hoy tiene una sola pestaña porque el portal solo cubre "Mis
// propiedades" (ver CLAUDE.md); se deja como lista para no reescribir este
// componente el día que se agregue una segunda sección real.
const SUPPLIER_LINKS = [{ href: "/supplier", label: "Mis propiedades", icon: Building2, exact: true }];

export default function SupplierNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones del portal de anfitrión"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      {SUPPLIER_LINKS.map(({ href, label, icon: Icon, exact }) => {
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
