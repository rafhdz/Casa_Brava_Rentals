"use client";

import { format, parseISO, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import Calendar from "@/components/Calendar";

type DateRangeSelectorProps = {
  checkIn: string;
  checkOut: string;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
};

function formatLong(isoDate: string): string {
  return format(parseISO(isoDate), "d 'de' MMMM, yyyy", { locale: es });
}

export default function DateRangeSelector({
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
}: DateRangeSelectorProps) {
  const today = startOfToday();
  const selectedRange: DateRange | undefined = checkIn
    ? { from: parseISO(checkIn), to: checkOut ? parseISO(checkOut) : undefined }
    : undefined;

  function handleSelect(range: DateRange | undefined) {
    onCheckInChange(range?.from ? format(range.from, "yyyy-MM-dd") : "");
    onCheckOutChange(range?.to ? format(range.to, "yyyy-MM-dd") : "");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
          <span className="block text-xs font-medium text-neutral-500">Fecha de llegada</span>
          <span className="block text-sm font-medium text-neutral-900">
            {checkIn ? formatLong(checkIn) : "Selecciona en el calendario"}
          </span>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
          <span className="block text-xs font-medium text-neutral-500">Fecha de salida</span>
          <span className="block text-sm font-medium text-neutral-900">
            {checkOut ? formatLong(checkOut) : "Selecciona en el calendario"}
          </span>
        </div>
      </div>

      <div className="w-fit rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={handleSelect}
          disabled={{ before: today }}
          defaultMonth={selectedRange?.from ?? today}
          numberOfMonths={1}
        />
      </div>
    </div>
  );
}
