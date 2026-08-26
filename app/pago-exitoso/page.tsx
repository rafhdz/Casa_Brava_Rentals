import Link from "next/link";

export default function PagoExitosoPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center sm:px-6">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
        ✓
      </span>
      <h1 className="mt-4 text-2xl font-semibold text-neutral-900">¡Reservación confirmada!</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Tu pago fue procesado correctamente (simulado). Recibirás un correo con los detalles de
        tu estadía en Casa Brava.
      </p>

      <Link
        href="/"
        className="mt-8 rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
