import Link from "next/link";

// Footer institucional del marketplace territorial (Parras Home Hub). Ver la
// nota en TenantNavbar.tsx sobre por qué existen dos pares Navbar/Footer.
export default function MarketplaceFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-neutral-900">Parras Home Hub</p>
            <p className="mt-1 max-w-sm text-sm text-neutral-500">
              El directorio de hospedaje de Parras de la Fuente, Coahuila —
              cuna del vino mexicano.
            </p>
          </div>
          <div className="flex gap-8 text-sm">
            <div className="flex flex-col gap-2">
              <span className="font-medium text-neutral-900">Explorar</span>
              <Link href="/sobre-nosotros" className="text-neutral-500 hover:text-neutral-900">
                Sobre nosotros
              </Link>
              <Link href="/conoce-parras" className="text-neutral-500 hover:text-neutral-900">
                Conoce Parras
              </Link>
              <Link href="/supplier" className="text-neutral-500 hover:text-neutral-900">
                Portal de anfitrión
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-medium text-neutral-900">Cuenta</span>
              <Link href="/login" className="text-neutral-500 hover:text-neutral-900">
                Iniciar sesión
              </Link>
              <Link href="/register" className="text-neutral-500 hover:text-neutral-900">
                Registrarse
              </Link>
            </div>
          </div>
        </div>
        <p className="border-t border-neutral-200 pt-4 text-xs text-neutral-400">
          © {new Date().getFullYear()} Parras Home Hub. Cada propiedad listada
          opera bajo su propia marca — Casa Brava Rentals es una de ellas.
          Prototipo: el pago y el onboarding de anfitriones todavía están
          simulados.
        </p>
      </div>
    </footer>
  );
}
