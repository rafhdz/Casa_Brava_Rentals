"use client";

import { useState } from "react";
import { format, parseISO, startOfToday } from "date-fns";
import { Search } from "lucide-react";
import type { DateRange } from "react-day-picker";
import Calendar from "@/components/Calendar";
import GuestCounter, { type GuestCounts } from "@/components/GuestCounter";
import InviteCodeForm from "@/components/InviteCodeForm";
import { formatSimulatedDate } from "@/lib/format";

export type SearchCriteria = {
  checkIn: string;
  checkOut: string;
  guests: GuestCounts;
};

type ActivePanel = "dates" | "guests" | "invite" | null;

// Barra de búsqueda tipo Airbnb/Vrbo. No hay backend de disponibilidad para
// las propiedades del directorio (son mock), así que las fechas se capturan
// para completar la experiencia pero PropertyDirectory solo filtra por
// capacidad (`guests`) — filtrar por fecha aquí sería fingir una
// disponibilidad que no existe.
export default function MarketplaceSearchBar({
  onSearch,
}: {
  onSearch: (criteria: SearchCriteria) => void;
}) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState<GuestCounts>({ adults: 2, children: 0 });

  const today = startOfToday();
  const selectedRange: DateRange | undefined = checkIn
    ? { from: parseISO(checkIn), to: checkOut ? parseISO(checkOut) : undefined }
    : undefined;

  function togglePanel(panel: ActivePanel) {
    setActivePanel((current) => (current === panel ? null : panel));
  }

  function handleRangeSelect(range: DateRange | undefined) {
    setCheckIn(range?.from ? format(range.from, "yyyy-MM-dd") : "");
    setCheckOut(range?.to ? format(range.to, "yyyy-MM-dd") : "");
  }

  function handleSearch() {
    setActivePanel(null);
    onSearch({ checkIn, checkOut, guests });
  }

  const totalGuests = guests.adults + guests.children;
  const dateLabel =
    checkIn && checkOut
      ? `${formatSimulatedDate(checkIn)} – ${formatSimulatedDate(checkOut)}`
      : "¿Cuándo?";
  const guestsLabel = `${totalGuests} huésped${totalGuests !== 1 ? "es" : ""}`;

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      {activePanel && (
        <button
          type="button"
          aria-hidden
          tabIndex={-1}
          onClick={() => setActivePanel(null)}
          className="fixed inset-0 z-10 cursor-default"
        />
      )}

      <div className="relative z-20 flex flex-col gap-1 rounded-3xl border border-neutral-200 bg-white p-2 shadow-lg sm:flex-row sm:items-stretch sm:gap-0 sm:rounded-full sm:p-1.5">
        <button
          type="button"
          onClick={() => togglePanel("dates")}
          className="flex-1 rounded-2xl px-4 py-2.5 text-left transition-colors hover:bg-neutral-100 sm:rounded-full"
        >
          <span className="block text-xs font-semibold text-neutral-900">Fechas</span>
          <span className="block truncate text-sm text-neutral-500">{dateLabel}</span>
        </button>

        <div className="hidden w-px bg-neutral-200 sm:block" />

        <button
          type="button"
          onClick={() => togglePanel("guests")}
          className="flex-1 rounded-2xl px-4 py-2.5 text-left transition-colors hover:bg-neutral-100 sm:rounded-full"
        >
          <span className="block text-xs font-semibold text-neutral-900">Huéspedes</span>
          <span className="block truncate text-sm text-neutral-500">{guestsLabel}</span>
        </button>

        <div className="hidden w-px bg-neutral-200 sm:block" />

        <button
          type="button"
          onClick={() => togglePanel("invite")}
          className="flex-1 rounded-2xl px-4 py-2.5 text-left transition-colors hover:bg-neutral-100 sm:rounded-full"
        >
          <span className="block text-xs font-semibold text-neutral-900">
            ¿Tienes una invitación?
          </span>
          <span className="block truncate text-sm text-neutral-500">Canjear código</span>
        </button>

        <button
          type="button"
          onClick={handleSearch}
          className="mt-1 flex shrink-0 items-center justify-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-700 sm:mt-0"
        >
          <Search className="h-4 w-4" strokeWidth={2} aria-hidden />
          Buscar
        </button>
      </div>

      {activePanel === "dates" && (
        <div className="absolute z-20 mt-2 w-fit rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
          <Calendar
            mode="range"
            selected={selectedRange}
            onSelect={handleRangeSelect}
            disabled={[{ before: today }]}
            defaultMonth={selectedRange?.from ?? today}
            numberOfMonths={1}
          />
        </div>
      )}

      {activePanel === "guests" && (
        <div className="absolute right-0 z-20 mt-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl">
          <GuestCounter value={guests} onChange={setGuests} />
        </div>
      )}

      {activePanel === "invite" && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
          <p className="mb-3 text-xs text-neutral-500">
            Ingresa el código que te compartió el anfitrión de la propiedad.
          </p>
          <InviteCodeForm variant="compact" />
        </div>
      )}
    </div>
  );
}
