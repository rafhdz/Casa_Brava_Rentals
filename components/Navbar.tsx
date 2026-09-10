"use client";

import { usePathname } from "next/navigation";
import MarketplaceNavbar from "@/components/MarketplaceNavbar";
import TenantNavbar from "@/components/TenantNavbar";

// Despachador por ruta, NO un componente de nav en sí mismo. app/layout.tsx
// monta un solo <Navbar/> global (no cambia); este componente decide en
// TIEMPO DE RENDER cuál de los dos productos mostrar:
//   - Rutas del marketplace público (PHH): MarketplaceNavbar.
//   - Todo lo demás (/p/**, /login, /register, /carrito, /perfil, /admin,
//     que es la app de huésped autenticado de Casa Brava): TenantNavbar.
//
// Esto es la decisión de arquitectura, no un paso intermedio: NO mover esta
// lógica a app/layout.tsx ni a un route group (`(marketplace)`/`(tenant)`).
// Ver CLAUDE.md, sección "Arquitectura multi-tenant", para el porqué
// completo — en resumen, son dos audiencias con condiciones de visibilidad
// distintas (TenantNavbar hoy solo pinta iconos si hay sesión) y mover
// /login, /carrito, /perfil, /admin a un route group para lograr lo mismo
// tocaría rutas que el pedido no pidió mover.
const MARKETPLACE_PATHS = ["/", "/sobre-nosotros", "/conoce-parras", "/supplier"];

export default function Navbar() {
  const pathname = usePathname();
  const isMarketplaceRoute = MARKETPLACE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  return isMarketplaceRoute ? <MarketplaceNavbar /> : <TenantNavbar />;
}
