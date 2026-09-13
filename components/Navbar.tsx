"use client";

import { usePathname } from "next/navigation";
import MarketplaceNavbar from "@/components/MarketplaceNavbar";
import TenantNavbar from "@/components/TenantNavbar";

// Despachador por ruta, NO un componente de nav en sí mismo. app/layout.tsx
// monta un solo <Navbar/> global (no cambia); este componente decide en
// TIEMPO DE RENDER cuál de los dos productos mostrar:
//   - Páginas universales de PHH (marca PHH_logo.svg): MarketplaceNavbar.
//   - Experiencia de huésped/gestión de Casa Brava (marca CBR_logo.svg):
//     TenantNavbar — hoy es todo lo que queda fuera de MARKETPLACE_PATHS:
//     /p/**  (incluye /p/casa-brava/owner-panel), /carrito, /perfil.
//
// "/admin" (panel universal del administrador de PHH) y "/login"/"/register"
// (puerta de entrada compartida por todo el sitio) se sumaron a
// MARKETPLACE_PATHS a propósito: son páginas del marketplace, no de Casa
// Brava, y deben mostrar PHH_logo.svg — ver CLAUDE.md, "Gestión de logos e
// identidad visual". El panel de Casa Brava se movió a
// /p/casa-brava/owner-panel precisamente para que caiga del lado de
// TenantNavbar sin necesitar una entrada propia aquí.
//
// Esto es la decisión de arquitectura, no un paso intermedio: NO mover esta
// lógica a app/layout.tsx ni a un route group (`(marketplace)`/`(tenant)`).
// Ver CLAUDE.md, sección "Arquitectura multi-tenant", para el porqué
// completo — en resumen, son dos audiencias con condiciones de visibilidad
// distintas (TenantNavbar hoy solo pinta iconos si hay sesión) y mover estas
// rutas a un route group para lograr lo mismo tocaría rutas que el pedido no
// pidió mover.
const MARKETPLACE_PATHS = [
  "/",
  "/sobre-nosotros",
  "/conoce-parras",
  "/supplier",
  "/login",
  "/register",
  "/admin",
];

export default function Navbar() {
  const pathname = usePathname();
  const isMarketplaceRoute = MARKETPLACE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  return isMarketplaceRoute ? <MarketplaceNavbar /> : <TenantNavbar />;
}
