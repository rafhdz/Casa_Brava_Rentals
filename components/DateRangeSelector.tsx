"use client";

import { useMemo } from "react";
import { format, parseISO, startOfToday, subDays } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange, Matcher } from "react-day-picker";
import Calendar from "@/components/Calendar";

type BookedRange = {
  check_in: string;
  check_out: string;
};

type DateRangeSelectorProps = {
  checkIn: string;
  checkOut: string;
  onCheckInChange: (value: string) => void;
  onCheckOutChange: (value: string) => void;
  bookedRanges: BookedRange[];
};

function formatLong(isoDate: string): string {
  return format(parseISO(isoDate), "d 'de' MMMM, yyyy", { locale: es });
}

export default function DateRangeSelector({
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  bookedRanges,
}: DateRangeSelectorProps) {
  const today = startOfToday();
  const selectedRange: DateRange | undefined = checkIn
    ? { from: parseISO(checkIn), to: checkOut ? parseISO(checkOut) : undefined }
    : undefined;

  // Intervalo semi-abierto [check_in, check_out): el día de check_out de una
  // reserva confirmada NO se deshabilita, porque un huésped nuevo puede
  // hacer check-in ese mismo día (misma regla que hasOverlappingConfirmedReservation
  // en lib/supabase/reservation-rules.ts). Por eso el rango deshabilitado en el
  // calendario termina un día antes del check_out real (subDays(checkOut, 1)),
  // no en el check_out mismo.
  const disabledBookedRanges: Matcher[] = useMemo(
    () =>
      bookedRanges.map((range) => ({
        from: parseISO(range.check_in),
        to: subDays(parseISO(range.check_out), 1),
      })),
    [bookedRanges]
  );

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
          disabled={[{ before: today }, ...disabledBookedRanges]}
          excludeDisabled
          defaultMonth={selectedRange?.from ?? today}
          numberOfMonths={1}
        />
      </div>
    </div>
  );
}
