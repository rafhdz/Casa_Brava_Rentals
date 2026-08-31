import ProtectedRoute from "@/components/ProtectedRoute";
import CartView from "@/components/CartView";
import BackButton from "@/components/BackButton";

export default function CarritoPage() {
  return (
    <ProtectedRoute>
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
        <BackButton />
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Tu carrito</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Revisa los servicios adicionales que agregaste antes de continuar.
          </p>
        </div>
        <CartView />
      </div>
    </ProtectedRoute>
  );
}
