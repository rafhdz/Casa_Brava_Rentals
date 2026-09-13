import SupplierNav from "@/components/SupplierNav";

// Layout dedicado del portal de anfitrión, mismo patrón que
// app/p/casa-brava/owner-panel/*: el Navbar/Footer global (despachador — ver
// components/Navbar.tsx) ya muestra la nav pública de PHH en /supplier/*;
// este layout agrega la nav secundaria propia del portal, igual que OwnerNav
// dentro del owner-panel.
export default function SupplierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <SupplierNav />
      {children}
    </div>
  );
}
