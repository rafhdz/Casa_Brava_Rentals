"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useCart, generateCartItemId } from "@/lib/CartContext";
import { formatSimulatedDate, formatTimeSlot } from "@/lib/format";
import type { CartItem } from "@/lib/cart-types";
import Calendar, { AVAILABILITY_MODIFIERS_CLASS_NAMES } from "@/components/Calendar";

// No hay columna de precio en spa_masseuses — sigue siendo un valor fijo a
// propósito (fuera de alcance de la migración de contenido del Home, ver
// CLAUDE.md).
const SPA_SESSION_PRICE = 600;

type MasseuseOption = {
  id: string;
  name: string;
};

// Una fila de spa_availability por bloque de hora ofertado. Llega ya filtrada
// desde app/servicios/spa/page.tsx (sin bloques ocupados ni días pasados) y
// ordenada por fecha/hora, así que aquí solo se agrupa para el calendario.
export type SpaAvailabilitySlot = {
  masseuse_id: string;
  available_date: string; // "yyyy-MM-dd"
  available_time: string; // "HH:mm:ss"
};

export default function SpaBookingForm({
  masseuses,
  availability,
  stayCheckIn,
  stayCheckOut,
}: {
  masseuses: MasseuseOption[];
  availability: SpaAvailabilitySlot[];
  // Límites estrictos de la estadía activa del huésped ("yyyy-MM-dd"), no
  // solo ayuda de UX: el backend ya rechaza un booking de spa fuera de la
  // reservación, pero sin este límite el huésped llenaría el formulario
  // entero antes de enterarse. Intervalo semi-abierto [check_in, check_out),
  // igual que en DateRangeSelector: el día de salida no cuenta como noche de
  // estadía. Comparación por string: de ancho fijo, ordena igual que la
  // fecha real (ver CLAUDE.md).
  stayCheckIn: string;
  stayCheckOut: string;
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [masseuseId, setMasseuseId] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");

  const masseuse = masseuses.find((m) => m.id === masseuseId) ?? null;

  // Días distintos con al menos un bloque libre para la masajista elegida,
  // acotados a los días de la estadía activa del huésped.
  const availableDays = useMemo(() => {
    if (!masseuseId) return [];
    const days = availability
      .filter(
        (slot) =>
          slot.masseuse_id === masseuseId &&
          slot.available_date >= stayCheckIn &&
          slot.available_date < stayCheckOut
      )
      .map((slot) => slot.available_date);
    return [...new Set(days)];
  }, [availability, masseuseId, stayCheckIn, stayCheckOut]);

  // Bloques de hora libres para (masajista, día). A diferencia del mapa
  // mockeado que existía antes —una sola lista de horas por masajista, igual
  // para todos sus días— los horarios ahora salen por día, que es como están
  // modelados en spa_availability.
  const availableTimes = useMemo(() => {
    if (!masseuseId || !day) return [];
    return availability
      .filter((slot) => slot.masseuse_id === masseuseId && slot.available_date === day)
      .map((slot) => slot.available_time);
  }, [availability, masseuseId, day]);

  const canAdd = masseuse !== null && day !== "" && time !== "";

  function isDayAvailable(date: Date): boolean {
    return availableDays.includes(format(date, "yyyy-MM-dd"));
  }

  function handleSelectMasseuse(id: string) {
    setMasseuseId(id);
    setDay("");
    setTime("");
  }

  function handleSelectDay(value: string) {
    setDay(value);
    setTime("");
  }

  function handleSelectTime(value: string) {
    setTime(value);
  }

  function handleAddToCart() {
    if (!masseuse || !day || !time) return;

    const item: CartItem = {
      id: generateCartItemId("spa"),
      serviceType: "spa",
      details: { masseuseId: masseuse.id, masseuseName: masseuse.name, day, time },
      quantity: 1,
      totalPrice: SPA_SESSION_PRICE,
    };
    addToCart(item);
    toast.success("Sesión de spa agregada al carrito.", {
      action: { label: "Ver carrito", onClick: () => router.push("/carrito") },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-900">1. Elige tu masajista</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {masseuses.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelectMasseuse(m.id)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all duration-200 ease-in-out active:scale-95 ${
                masseuseId === m.id
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-700 hover:border-neutral-400"
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </section>

      {masseuse && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-neutral-900">2. Elige el día</h2>
          {availableDays.length === 0 ? (
            <p className="text-sm text-neutral-500">
              {masseuse.name} no tiene días disponibles por ahora. Prueba con otra masajista.
            </p>
          ) : (
            <>
              <p className="text-sm text-neutral-500">
                Solo los días disponibles de {masseuse.name} están habilitados en el calendario.
              </p>
              <div className="w-fit rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                <Calendar
                  key={masseuse.id}
                  mode="single"
                  selected={day ? parseISO(day) : undefined}
                  onSelect={(date) => handleSelectDay(date ? format(date, "yyyy-MM-dd") : "")}
                  disabled={(date) => !isDayAvailable(date)}
                  modifiers={{
                    available: (date) => isDayAvailable(date) && format(date, "yyyy-MM-dd") !== day,
                  }}
                  modifiersClassNames={AVAILABILITY_MODIFIERS_CLASS_NAMES}
                  defaultMonth={parseISO(availableDays[0])}
                />
              </div>
              {day && (
                <p className="text-sm text-neutral-600">
                  Día seleccionado: <span className="font-medium text-neutral-900">{formatSimulatedDate(day)}</span>
                </p>
              )}
            </>
          )}
        </section>
      )}

      {masseuse && day && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-neutral-900">3. Elige la hora</h2>
          <div className="flex flex-wrap gap-2">
            {availableTimes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleSelectTime(t)}
                className={`rounded-full border px-4 py-2 text-sm transition-all duration-200 ease-in-out active:scale-95 ${
                  time === t
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 text-neutral-700 hover:border-neutral-400"
                }`}
              >
                {formatTimeSlot(t)}
              </button>
            ))}
          </div>
        </section>
      )}

      <button
        type="button"
        disabled={!canAdd}
        onClick={handleAddToCart}
        className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 ease-in-out enabled:hover:bg-neutral-700 enabled:active:scale-95 disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        Agregar al carrito
      </button>
    </div>
  );
}
