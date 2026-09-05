import Link from "next/link";

// Reemplaza al formulario de un servicio (spa/comida/vinos) cuando la sesión
// activa no puede reservarlo: rol admin, o huésped sin una estadía activa
// todavía. Es solo UX — el backend ya rechaza ambos casos por su cuenta
// (RESERVATION_REQUIRED_ERROR, o simplemente porque un admin no tiene
// reservaciones propias) — pero sin esto el huésped llegaría al formulario,
// lo llenaría, y recién al pagar el carrito se enteraría del problema.
export default function ServiceAccessNotice({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-6 py-16 text-center shadow-sm">
      <p className="text-sm font-semibold text-neutral-900">{title}</p>
      <p className="max-w-sm text-sm text-neutral-500">{description}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-2 rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:bg-neutral-700 active:scale-95"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
