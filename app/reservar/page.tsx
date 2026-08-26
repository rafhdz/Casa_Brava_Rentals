"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DateRangeSelector from "@/components/DateRangeSelector";
import PricingOptions from "@/components/PricingOptions";
import BookingSummary from "@/components/BookingSummary";
import { FARE_OPTIONS, PRICING_CONFIG, type FareType } from "@/lib/mock-data";

function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export default function ReservarPage() {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [fareType, setFareType] = useState<FareType>("estandar");

  const nights = useMemo(() => calculateNights(checkIn, checkOut), [checkIn, checkOut]);
  const selectedFare = FARE_OPTIONS.find((option) => option.id === fareType) ?? FARE_OPTIONS[0];
  const canProceed = nights > 0;

  function handleCheckout() {
    // Mock: aquí se integrará Stripe Checkout (ver CLAUDE.md).
    router.push("/pago-exitoso");
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">Reservar tu estadía</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Selecciona tus fechas y el tipo de tarifa que mejor se ajuste a tu plan.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-900">1. Fechas de estadía</h2>
        <DateRangeSelector
          checkIn={checkIn}
          checkOut={checkOut}
          onCheckInChange={setCheckIn}
          onCheckOutChange={setCheckOut}
        />
        {checkIn && checkOut && nights === 0 && (
          <p className="text-sm text-red-600">
            La fecha de salida debe ser posterior a la fecha de llegada.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-900">2. Tipo de tarifa</h2>
        <PricingOptions options={FARE_OPTIONS} selected={fareType} onSelect={setFareType} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-900">3. Resumen de cobro</h2>
        <BookingSummary
          nights={nights}
          nightlyRate={PRICING_CONFIG.nightlyRate}
          surchargePercent={selectedFare.surchargePercent}
          securityDeposit={PRICING_CONFIG.securityDeposit}
          currency={PRICING_CONFIG.currency}
        />
      </section>

      <button
        type="button"
        disabled={!canProceed}
        onClick={handleCheckout}
        className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-colors enabled:hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        Proceder al pago
      </button>
    </div>
  );
}
