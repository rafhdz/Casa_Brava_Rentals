type BookingSummaryProps = {
  nights: number;
  nightlyRate: number;
  surchargePercent: number;
  securityDeposit: number;
  currency: string;
};

export default function BookingSummary({
  nights,
  nightlyRate,
  surchargePercent,
  securityDeposit,
  currency,
}: BookingSummaryProps) {
  const subtotal = nights * nightlyRate;
  const surcharge = subtotal * (surchargePercent / 100);
  const total = subtotal + surcharge + securityDeposit;

  const format = (value: number) => `${currency} $${value.toFixed(2)}`;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <h3 className="text-base font-semibold text-neutral-900">Resumen de cobro</h3>

      <dl className="mt-4 flex flex-col gap-2 text-sm">
        <div className="flex justify-between text-neutral-600">
          <dt>
            {nightlyRate ? format(nightlyRate) : "—"} x {nights} noche{nights !== 1 ? "s" : ""}
          </dt>
          <dd>{format(subtotal)}</dd>
        </div>

        {surchargePercent > 0 && (
          <div className="flex justify-between text-neutral-600">
            <dt>Recargo tarifa flexible ({surchargePercent}%)</dt>
            <dd>{format(surcharge)}</dd>
          </div>
        )}

        <div className="flex justify-between text-neutral-600">
          <dt>Depósito de garantía (reembolsable)</dt>
          <dd>{format(securityDeposit)}</dd>
        </div>

        <div className="mt-2 flex justify-between border-t border-neutral-200 pt-3 text-base font-semibold text-neutral-900">
          <dt>Total</dt>
          <dd>{format(total)}</dd>
        </div>
      </dl>
    </div>
  );
}
