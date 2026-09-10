"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DateRangeSelector from "@/components/DateRangeSelector";
import BookingSummary from "@/components/BookingSummary";
import type { Property } from "@/lib/types/marketplace";

function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Selector de fechas + resumen de cobro para una propiedad mock (sin
 * backend). NUNCA llama a checkoutStay ni a serverFetch — esta pantalla es
 * puro cálculo de cliente sobre `property` (mock). El botón solo navega a
 * `/p/[slug]/checkout` con la selección por query string; ahí se recalcula
 * el mismo total antes de "confirmar" (ver app/p/[slug]/checkout/page.tsx).
 * Ver CLAUDE.md, "Arquitectura multi-tenant", frontera dura mock/real.
 */
export default function MockReservarForm({ property }: { property: Property }) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);

  const nights = useMemo(() => calculateNights(checkIn, checkOut), [checkIn, checkOut]);
  const canProceed = nights > 0 && guests >= 1 && guests <= property.maxGuests;

  function handleContinue() {
    const params = new URLSearchParams({
      checkin: checkIn,
      checkout: checkOut,
      guests: String(guests),
    });
    router.push(`/p/${property.slug}/checkout?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-900">1. Fechas de estadía</h2>
        <DateRangeSelector
          checkIn={checkIn}
          checkOut={checkOut}
          onCheckInChange={setCheckIn}
          onCheckOutChange={setCheckOut}
          bookedRanges={[]}
        />
        {checkIn && checkOut && nights === 0 && (
          <p className="text-sm text-red-600">
            La fecha de salida debe ser posterior a la fecha de llegada.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-900">2. Huéspedes</h2>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={property.maxGuests}
            value={guests}
            onChange={(event) => setGuests(Number(event.target.value))}
            className="w-24 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
          />
          <span className="text-sm text-neutral-500">de hasta {property.maxGuests} huéspedes</span>
        </div>
        {guests > property.maxGuests && (
          <p className="text-sm text-red-600">
            Esta propiedad admite un máximo de {property.maxGuests} huéspedes.
          </p>
        )}
      </section>

      {nights > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-neutral-900">3. Resumen de cobro</h2>
          <BookingSummary
            nights={nights}
            nightlyRate={property.basePricePerNight}
            surchargePercent={0}
            securityDeposit={property.securityDeposit}
            currency="MXN"
          />
        </section>
      )}

      <button
        type="button"
        disabled={!canProceed}
        onClick={handleContinue}
        className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 ease-in-out enabled:hover:bg-neutral-700 enabled:active:scale-95 disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        Continuar
      </button>
    </div>
  );
}
