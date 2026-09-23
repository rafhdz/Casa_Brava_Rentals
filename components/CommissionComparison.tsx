"use client";

import { useState, type ChangeEvent } from "react";
import { CheckCircle2, HandCoins, Percent, Wallet } from "lucide-react";
import { formatMoney } from "@/lib/format";

type CommissionModel = {
  key: string;
  label: string;
  hostFeePercent: number;
  guestFeePercent: number;
};

// Tasas ilustrativas del modelo de comisiones de cada plataforma (ver el
// Business Plan de PHH). Airbnb documenta dos esquemas: "split-fee" (reparte
// la comisión entre anfitrión ~3% y huésped ~14-16%, ~18-20% combinado) y
// "host-only" (el anfitrión absorbe ~16% y el huésped no ve cargo adicional).
// Parras Home Hub cobra un 10% fijo, siempre al anfitrión, sin cargo de
// servicio al huésped en el checkout. Es contenido editorial/mock de la
// landing — no un dato que consulte el backend.
const MODELS: CommissionModel[] = [
  { key: "phh", label: "Parras Home Hub", hostFeePercent: 10, guestFeePercent: 0 },
  { key: "airbnb-host-only", label: "Airbnb — Host-only", hostFeePercent: 16, guestFeePercent: 0 },
  { key: "airbnb-split", label: "Airbnb — Split-fee", hostFeePercent: 3, guestFeePercent: 16 },
];

const MIN_AMOUNT = 2000;
const MAX_AMOUNT = 40000;
const DEFAULT_AMOUNT = 10000;
const AMOUNT_STEP = 500;

function totalTakeRate(model: CommissionModel): number {
  return model.hostFeePercent + model.guestFeePercent;
}

const MAX_TAKE_RATE = Math.max(...MODELS.map(totalTakeRate));

export default function CommissionComparison() {
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);

  function handleAmountChange(event: ChangeEvent<HTMLInputElement>) {
    setAmount(Number(event.target.value));
  }

  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6 sm:p-10">
      <div className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-600">
          <Percent className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
          Comisiones, sin letra chica
        </span>
        <h2 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">Comparativa transparente de comisiones</h2>
        <p className="max-w-2xl text-sm text-neutral-600">
          La comisión total que retiene cada plataforma sobre una reserva — sumando lo que paga el anfitrión y lo
          que se le agrega al huésped en el checkout.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {MODELS.map((model) => {
          const rate = totalTakeRate(model);
          const isPHH = model.key === "phh";
          return (
            <div key={model.key} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
              <span className={`w-full shrink-0 text-sm font-medium sm:w-44 ${isPHH ? "text-neutral-900" : "text-neutral-500"}`}>
                {model.label}
              </span>
              <div className="flex flex-1 items-center gap-3">
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${isPHH ? "bg-neutral-900" : "bg-neutral-300"}`}
                    style={{ width: `${(rate / MAX_TAKE_RATE) * 100}%` }}
                  />
                </div>
                <span className={`w-12 shrink-0 text-right text-sm font-semibold ${isPHH ? "text-neutral-900" : "text-neutral-500"}`}>
                  {rate}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 border-t border-neutral-200 pt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label htmlFor="commission-amount" className="text-sm font-medium text-neutral-900">
              Simula una reserva
            </label>
            <p className="text-xs text-neutral-500">Ajusta el monto para ver el desglose real por plataforma.</p>
          </div>
          <span className="text-2xl font-semibold text-neutral-900">{formatMoney(amount)} MXN</span>
        </div>
        <input
          id="commission-amount"
          type="range"
          min={MIN_AMOUNT}
          max={MAX_AMOUNT}
          step={AMOUNT_STEP}
          value={amount}
          onChange={handleAmountChange}
          className="mt-4 w-full accent-neutral-900"
        />

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {MODELS.map((model) => {
            const hostNet = amount * (1 - model.hostFeePercent / 100);
            const guestTotal = amount * (1 + model.guestFeePercent / 100);
            const isPHH = model.key === "phh";
            return (
              <div
                key={model.key}
                className={`flex flex-col gap-3 rounded-2xl border p-4 ${
                  isPHH ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-neutral-50 text-neutral-900"
                }`}
              >
                <p className="text-sm font-semibold">{model.label}</p>
                <div>
                  <p className={`text-xs ${isPHH ? "text-neutral-300" : "text-neutral-500"}`}>Huésped paga</p>
                  <p className="text-lg font-semibold">{formatMoney(guestTotal)}</p>
                </div>
                <div>
                  <p className={`text-xs ${isPHH ? "text-neutral-300" : "text-neutral-500"}`}>Anfitrión recibe</p>
                  <p className="text-lg font-semibold">{formatMoney(hostNet)}</p>
                </div>
                {model.guestFeePercent === 0 ? (
                  <p className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${isPHH ? "text-emerald-300" : "text-emerald-600"}`}>
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                    Sin cargo adicional al huésped
                  </p>
                ) : (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                    <HandCoins className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />+{model.guestFeePercent}% cargo de
                    servicio en checkout
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-6 flex items-start gap-2 text-sm text-neutral-600">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" strokeWidth={1.5} aria-hidden />
          Con Parras Home Hub el anfitrión paga una comisión fija del 10% — menor a cualquier esquema de Airbnb — y
          el huésped nunca ve un cargo de servicio agregado al confirmar el pago.
        </p>
      </div>
    </div>
  );
}
