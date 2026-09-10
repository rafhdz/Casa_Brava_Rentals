"use client";

import { usePathname } from "next/navigation";
import MarketplaceFooter from "@/components/MarketplaceFooter";
import TenantFooter from "@/components/TenantFooter";

// Despachador por ruta — mismo criterio y misma advertencia que
// components/Navbar.tsx (leer ese archivo primero). No fusionar con Navbar.tsx
// en un solo componente "Chrome": Navbar necesita reaccionar a la sesión con
// más granularidad (ítems del carrito, botón de logout) de lo que el footer
// necesita, y mantenerlos separados es el mismo patrón que ya usa el resto
// del proyecto (Navbar.tsx / Footer.tsx como archivos independientes).
const MARKETPLACE_PATHS = ["/", "/sobre-nosotros", "/conoce-parras", "/supplier"];

export default function Footer() {
  const pathname = usePathname();
  const isMarketplaceRoute = MARKETPLACE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  return isMarketplaceRoute ? <MarketplaceFooter /> : <TenantFooter />;
}
