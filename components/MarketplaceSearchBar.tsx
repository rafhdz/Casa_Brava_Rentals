"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { format, isWeekend, parseISO, startOfToday } from "date-fns";
import { ArrowUpRight, CheckCircle2, KeyRound, Search, XCircle } from "lucide-react";
import type { DateRange } from "react-day-picker";
import Calendar from "@/components/Calendar";
import GuestCounter, { type GuestCounts } from "@/components/GuestCounter";
import { formatSimulatedDate } from "@/lib/format";
import { validateInviteCode } from "@/lib/mock/marketplace-data";
import type { Property } from "@/lib/types/marketplace";

export type SearchCriteria = {
  checkIn: string;
  checkOut: string;
  guests: GuestCounts;
};

type ActivePanel = "dates" | "guests" | "invite" | null;
type InviteStatus = "idle" | "success" | "error";

// Resalta sábados y domingos como temporada alta, sin tocar bg/texto de la celda
// (que ya cargan selected/range_*/outside) — así no compite por especificidad con
// esas clases y no necesita !important (ver la nota de cascada en Calendar.tsx).
const WEEKEND_MODIFIER_CLASS_NAMES = {
  weekend:
    "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-amber-500",
};

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
  const [inviteCode, setInviteCode] = useState("");
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>("idle");
  const [matchedProperty, setMatchedProperty] = useState<Property | null>(null);

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

  function handleInviteCodeChange(event: ChangeEvent<HTMLInputElement>) {
    setInviteCode(event.target.value);
    setInviteStatus("idle");
    setMatchedProperty(null);
  }

  function handleInviteSubmit(event: FormEvent) {
    event.preventDefault();
    const property = validateInviteCode(inviteCode);
    if (property) {
      setMatchedProperty(property);
      setInviteStatus("success");
    } else {
      setMatchedProperty(null);
      setInviteStatus("error");
    }
  }

  const totalGuests = guests.adults + guests.children;
  const dateLabel =
    checkIn && checkOut ? `${formatSimulatedDate(checkIn)} – ${formatSimulatedDate(checkOut)}` : "¿Cuándo?";
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

      <div className="relative z-20 flex flex-col gap-1 rounded-3xl border border-neutral-200/60 bg-white/90 p-2 shadow-lg backdrop-blur-md sm:flex-row sm:items-stretch sm:gap-0 sm:rounded-full sm:p-1.5">
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
          <span className="block text-xs font-semibold text-neutral-900">¿Tienes una invitación?</span>
          <span className="block truncate text-sm text-neutral-500">
            {inviteStatus === "success" ? "Acceso concedido" : "Canjear código"}
          </span>
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
            modifiers={{ weekend: isWeekend }}
            modifiersClassNames={WEEKEND_MODIFIER_CLASS_NAMES}
          />
          <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
            Fines de semana — temporada alta
          </p>
        </div>
      )}

      {activePanel === "guests" && (
        <div className="absolute right-0 z-20 mt-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-xl">
          <GuestCounter value={guests} onChange={setGuests} />
        </div>
      )}

      {activePanel === "invite" && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-neutral-200 bg-white p-4 shadow-xl">
          <p className="mb-3 text-xs text-neutral-500">
            Ingresa el código que te compartió el anfitrión de una residencia exclusiva.
          </p>
          <form onSubmit={handleInviteSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <KeyRound
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
                strokeWidth={1.5}
                aria-hidden
              />
              <input
                type="text"
                value={inviteCode}
                onChange={handleInviteCodeChange}
                placeholder="Código de invitación"
                className={`w-full min-w-0 rounded-full border bg-neutral-50 py-2 pl-9 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none ${
                  inviteStatus === "error" ? "border-red-300 focus:border-red-500" : "border-neutral-200 focus:border-neutral-900"
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={!inviteCode.trim()}
              className="shrink-0 rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
            >
              Verificar
            </button>
          </form>

          {inviteStatus === "success" && matchedProperty && (
            <div className="mt-3 flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 [animation:fade-in_300ms_ease-in-out]">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                Acceso Concedido — Residencia Privada
              </span>
              <Link
                href={`/p/${matchedProperty.slug}`}
                className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50"
              >
                Ir a {matchedProperty.name}
                <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden />
              </Link>
            </div>
          )}

          {inviteStatus === "error" && (
            <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-600 [animation:fade-in_200ms_ease-in-out]">
              <XCircle className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              Ese código no es válido o ya expiró.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
