export default function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-4 py-8 text-center text-sm text-neutral-500 sm:px-6">
        <p>© {new Date().getFullYear()} Casa Brava Rentals. Acceso exclusivo por invitación.</p>
        <p>Prototipo visual — datos de contacto y enlaces se activarán con la integración final.</p>
      </div>
    </footer>
  );
}
