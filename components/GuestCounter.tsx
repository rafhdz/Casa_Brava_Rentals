"use client";

import { Minus, Plus } from "lucide-react";

export type GuestCounts = {
  adults: number;
  children: number;
};

type GuestCounterProps = {
  value: GuestCounts;
  onChange: (value: GuestCounts) => void;
};

const MIN_ADULTS = 1;
const MAX_GUESTS_PER_FIELD = 20;

function CounterRow({
  label,
  hint,
  count,
  min,
  onDecrement,
  onIncrement,
}: {
  label: string;
  hint: string;
  count: number;
  min: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        <p className="text-xs text-neutral-500">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDecrement}
          disabled={count <= min}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition-colors disabled:cursor-not-allowed disabled:opacity-30 enabled:hover:border-neutral-900 enabled:hover:text-neutral-900"
        >
          <Minus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
        <span className="w-4 text-center text-sm font-medium text-neutral-900">{count}</span>
        <button
          type="button"
          onClick={onIncrement}
          disabled={count >= MAX_GUESTS_PER_FIELD}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition-colors disabled:cursor-not-allowed disabled:opacity-30 enabled:hover:border-neutral-900 enabled:hover:text-neutral-900"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
      </div>
    </div>
  );
}

// Popover de conteo de huéspedes (adultos/niños). El toggle de visibilidad lo
// maneja el componente padre (MarketplaceSearchBar) — este componente solo
// renderiza las filas +/-.
export default function GuestCounter({ value, onChange }: GuestCounterProps) {
  return (
    <div className="w-64 divide-y divide-neutral-100 px-1">
      <CounterRow
        label="Adultos"
        hint="13 años o más"
        count={value.adults}
        min={MIN_ADULTS}
        onDecrement={() => onChange({ ...value, adults: Math.max(MIN_ADULTS, value.adults - 1) })}
        onIncrement={() => onChange({ ...value, adults: value.adults + 1 })}
      />
      <CounterRow
        label="Niños"
        hint="Menores de 13 años"
        count={value.children}
        min={0}
        onDecrement={() => onChange({ ...value, children: Math.max(0, value.children - 1) })}
        onIncrement={() => onChange({ ...value, children: value.children + 1 })}
      />
    </div>
  );
}
