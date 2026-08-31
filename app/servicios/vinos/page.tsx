import ProtectedRoute from "@/components/ProtectedRoute";
import WineBookingForm from "@/components/WineBookingForm";
import BackButton from "@/components/BackButton";

export default function VinosServicePage() {
  return (
    <ProtectedRoute>
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
        <BackButton />
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Paquete de Vinos</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Agrega botellas individuales o selecciona el paquete de 4 vinos.
          </p>
        </div>
        <WineBookingForm />
      </div>
    </ProtectedRoute>
  );
}
