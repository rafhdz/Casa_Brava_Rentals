"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import DateRangeSelector from "@/components/DateRangeSelector";
import PricingOptions from "@/components/PricingOptions";
import BookingSummary from "@/components/BookingSummary";
import { checkoutStay } from "@/app/actions/checkout";

type FareTypeOption = {
  id: string;
  name: string;
  surcharge_percentage: number;
};

type PropertySettings = {
  nightly_rate: number;
  security_deposit: number;
};

type BookedRange = {
  check_in: string;
  check_out: string;
};

function calculateNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export default function ReservarForm({
  fareTypes,
  propertySettings,
  bookedRanges,
}: {
  fareTypes: FareTypeOption[];
  propertySettings: PropertySettings;
  bookedRanges: BookedRange[];
}) {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [fareTypeId, setFareTypeId] = useState(fareTypes[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, startTransition] = useTransition();

  const nights = useMemo(() => calculateNights(checkIn, checkOut), [checkIn, checkOut]);
  const selectedFare = fareTypes.find((option) => option.id === fareTypeId) ?? fareTypes[0];
  const canProceed = nights > 0 && Boolean(selectedFare) && !isProcessing;

  function handleCheckout() {
    if (!selectedFare) return;
    setError(null);

    startTransition(async () => {
      // El total_amount real se recalcula en el servidor (ver checkoutStay) —
      // aquí solo se manda lo mínimo necesario para identificar la estadía.
      const result = await checkoutStay({
        check_in: checkIn,
        check_out: checkOut,
        fare_type_id: selectedFare.id,
      });

      if ("error" in result) {
        setError(result.error);
        return;
      }

      router.push("/pago-exitoso");
    });
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
          bookedRanges={bookedRanges}
        />
        {checkIn && checkOut && nights === 0 && (
          <p className="text-sm text-red-600">
            La fecha de salida debe ser posterior a la fecha de llegada.
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-900">2. Tipo de tarifa</h2>
        <PricingOptions options={fareTypes} selected={fareTypeId} onSelect={setFareTypeId} />
      </section>

      {selectedFare && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-neutral-900">3. Resumen de cobro</h2>
          <BookingSummary
            nights={nights}
            nightlyRate={propertySettings.nightly_rate}
            surchargePercent={selectedFare.surcharge_percentage}
            securityDeposit={propertySettings.security_deposit}
            currency="USD"
          />
        </section>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={!canProceed}
        onClick={handleCheckout}
        className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 ease-in-out enabled:hover:bg-neutral-700 enabled:active:scale-95 disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {isProcessing ? "Procesando…" : "Proceder al pago"}
      </button>
    </div>
  );
}
