import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/api/server";
import { getActiveReservation } from "@/lib/reservations";
import { formatMoney, formatSimulatedDate } from "@/lib/format";
import { getPropertyBySlug, TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";
import BackButton from "@/components/BackButton";
import BookingSummary from "@/components/BookingSummary";
import ServiceAccessNotice from "@/components/ServiceAccessNotice";
import type { Property } from "@/lib/types/marketplace";

type CheckoutSearchParams = { checkin?: string; checkout?: string; guests?: string };

/**
 * Pantalla de liquidación unificada (mock). Es ADITIVA, no reemplaza el flujo
 * real de Casa Brava (ver CLAUDE.md, "Arquitectura multi-tenant", decisión
 * sobre checkout):
 *  - `casa-brava`: revisión de SOLO LECTURA de la reservación activa. No crea
 *    ni modifica nada — ReservarForm/CartView ya hicieron esa escritura real
 *    y siguen redirigiendo directo a /pago-exitoso como hoy. Esta pantalla
 *    solo existe para quien navegue aquí manualmente.
 *  - cualquier otra propiedad (mock, sin backend): única pantalla de "pago",
 *    recalculando el total a partir de la query string que le pasó
 *    MockReservarForm — nunca llama a checkoutStay.
 */
export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<CheckoutSearchParams>;
}) {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);

  if (!property) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Confirmar y pagar</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Revisa tu resumen antes de confirmar el pago (simulado).
        </p>
      </div>

      {slug === TENANT_ZERO_SLUG ? <CasaBravaCheckoutReview /> : <MockCheckout property={property} searchParams={await searchParams} />}
    </div>
  );
}

async function CasaBravaCheckoutReview() {
  const [user, activeReservation] = await Promise.all([getSessionUser(), getActiveReservation()]);

  if (user?.role === "admin") {
    return (
      <ServiceAccessNotice
        title="Los administradores no tienen reservaciones propias"
        description="Esta vista es solo para huéspedes."
      />
    );
  }

  if (!activeReservation) {
    return (
      <ServiceAccessNotice
        title="No tienes una estadía activa"
        description="Reserva tu estadía para ver aquí el resumen de cobro."
        actionHref={`/p/${TENANT_ZERO_SLUG}/reservar`}
        actionLabel="Reservar estadía"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold text-neutral-900">Tu estadía</h2>
        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between text-neutral-600">
            <dt>Fechas</dt>
            <dd>
              {formatSimulatedDate(activeReservation.check_in)} –{" "}
              {formatSimulatedDate(activeReservation.check_out)} ({activeReservation.noches} noche
              {activeReservation.noches !== 1 ? "s" : ""})
            </dd>
          </div>
          <div className="flex justify-between text-neutral-600">
            <dt>Tarifa</dt>
            <dd>{activeReservation.fare_type_name}</dd>
          </div>
          {Number(activeReservation.subtotal_servicios) > 0 && (
            <div className="flex justify-between text-neutral-600">
              <dt>Servicios adicionales</dt>
              <dd>{formatMoney(activeReservation.subtotal_servicios)}</dd>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-neutral-200 pt-3 text-base font-semibold text-neutral-900">
            <dt>Gran total</dt>
            <dd>{formatMoney(activeReservation.gran_total)}</dd>
          </div>
        </dl>
      </div>

      <Link
        href="/pago-exitoso"
        className="rounded-full bg-neutral-900 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
      >
        Confirmar pago (simulado)
      </Link>
    </div>
  );
}

function MockCheckout({
  property,
  searchParams,
}: {
  property: Property;
  searchParams: CheckoutSearchParams;
}) {
  const { checkin, checkout, guests } = searchParams;
  const nights =
    checkin && checkout
      ? Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  if (!checkin || !checkout || nights <= 0) {
    return (
      <ServiceAccessNotice
        title="Selecciona tus fechas primero"
        description="Vuelve al formulario de reservación para elegir check-in y check-out."
        actionHref={`/p/${property.slug}/reservar`}
        actionLabel="Elegir fechas"
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
        <p>
          <span className="font-medium text-neutral-900">{property.name}</span> ·{" "}
          {formatSimulatedDate(checkin)} – {formatSimulatedDate(checkout)} · {guests ?? "1"} huésped
          {guests !== "1" ? "es" : ""}
        </p>
      </div>

      <BookingSummary
        nights={nights}
        nightlyRate={property.basePricePerNight}
        surchargePercent={0}
        securityDeposit={property.securityDeposit}
        currency="MXN"
      />

      <Link
        href="/pago-exitoso"
        className="rounded-full bg-neutral-900 px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
      >
        Confirmar pago (simulado)
      </Link>
    </div>
  );
}
