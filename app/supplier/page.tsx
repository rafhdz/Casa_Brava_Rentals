import { AlertCircle } from "lucide-react";
import SupplierPropertiesTable from "@/components/SupplierPropertiesTable";
import { PROPERTIES } from "@/lib/mock/marketplace-data";

// Onboarding de Stripe Connect y la ocupación agregada son datos simulados a
// propósito: no existe todavía integración real de pagos por anfitrión (ver
// "Integración futura planeada" en CLAUDE.md) ni una tabla de reservaciones
// por propiedad fuera de Casa Brava.
//
// Lo único NO simulado de esta pantalla es el acceso al panel de gestión de
// Casa Brava desde la tabla (ver components/SupplierPropertiesTable.tsx): es
// un enlace de navegación a una pantalla que existe, no una escritura contra
// una propiedad mock.
const STRIPE_CONNECT_STATUS: "linked" | "pending" = "pending";
const SIMULATED_OCCUPANCY_PERCENT = 62;

export default function SupplierPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Mis propiedades</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Portal de anfitrión de Parras Home Hub — esqueleto de navegación,
            sin escritura real todavía. Casa Brava es la única propiedad con
            panel de gestión propio: entra desde su botón{" "}
            <span className="font-medium text-neutral-700">Panel de gestión</span>.
          </p>
        </div>

        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
            STRIPE_CONNECT_STATUS === "linked"
              ? "bg-neutral-900 text-white"
              : "border border-neutral-300 text-neutral-600"
          }`}
        >
          {STRIPE_CONNECT_STATUS === "linked" ? "Cuenta de Stripe vinculada" : "Stripe Connect: pendiente"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Propiedades activas
          </p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">{PROPERTIES.length}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Ocupación estimada
          </p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">
            {SIMULATED_OCCUPANCY_PERCENT}%
          </p>
          <p className="mt-1 text-xs text-neutral-400">Métrica simulada, no calculada.</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Acceso por invitación
          </p>
          <p className="mt-2 text-2xl font-semibold text-neutral-900">
            {PROPERTIES.filter((property) => property.accessType === "INVITE_ONLY").length}
          </p>
        </div>
      </div>

      <SupplierPropertiesTable properties={PROPERTIES} />

      <div className="flex items-start gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-600">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" strokeWidth={1.75} aria-hidden />
        <p>
          Este portal todavía no da de alta propiedades nuevas ni administra
          disponibilidad — hoy solo lista el directorio mock de Parras Home
          Hub. El alta real de anfitriones llega junto con el soporte
          multi-propiedad en el backend. El enlace al panel de gestión de Casa
          Brava sigue protegido por su propio guard de rol: pide sesión con rol
          propietario o administrador, igual que si se escribiera la URL a
          mano.
        </p>
      </div>
    </div>
  );
}
