// Footer de la experiencia de huésped autenticado (Casa Brava / Tenant 0).
// Contenido exacto de lo que antes era components/Footer.tsx — ver la nota en
// TenantNavbar.tsx sobre por qué existen dos pares Navbar/Footer.
export default function TenantFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-8 text-center text-sm text-neutral-500 sm:px-6">
        <p>
          © {new Date().getFullYear()} Casa Brava Rentals / Rafael IT
          Developments. Acceso exclusivo por invitación.
        </p>
        <p>
          Esto es un prototipo — los datos de contacto y enlaces se activarán
          con la integración final.
        </p>
      </div>
    </footer>
  );
}
