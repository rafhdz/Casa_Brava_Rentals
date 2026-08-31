"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { useCart, generateCartItemId } from "@/lib/CartContext";
import { SPA_MASSEUSES, SPA_SESSION_PRICE, formatSimulatedDate, type CartItem } from "@/lib/mock-data";
import AddedToCartBanner from "@/components/AddedToCartBanner";
import Calendar from "@/components/Calendar";

export default function SpaBookingForm() {
  const { addToCart } = useCart();
  const [masseuseId, setMasseuseId] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const masseuse = SPA_MASSEUSES.find((m) => m.id === masseuseId) ?? null;
  const canAdd = masseuse !== null && day !== "" && time !== "";

  function handleSelectMasseuse(id: string) {
    setMasseuseId(id);
    setDay("");
    setTime("");
    setConfirmed(false);
  }

  function handleSelectDay(value: string) {
    setDay(value);
    setTime("");
    setConfirmed(false);
  }

  function handleSelectTime(value: string) {
    setTime(value);
    setConfirmed(false);
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
    setConfirmed(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-900">1. Elige tu masajista</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {SPA_MASSEUSES.map((m) => (
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
          <p className="text-sm text-neutral-500">
            Solo los días disponibles de {masseuse.name} están habilitados en el calendario.
          </p>
          <div className="w-fit rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <Calendar
              key={masseuse.id}
              mode="single"
              selected={day ? parseISO(day) : undefined}
              onSelect={(date) => handleSelectDay(date ? format(date, "yyyy-MM-dd") : "")}
              disabled={(date) => !masseuse.availableDays.includes(format(date, "yyyy-MM-dd"))}
              defaultMonth={parseISO(masseuse.availableDays[0])}
            />
          </div>
          {day && (
            <p className="text-sm text-neutral-600">
              Día seleccionado: <span className="font-medium text-neutral-900">{formatSimulatedDate(day)}</span>
            </p>
          )}
        </section>
      )}

      {masseuse && day && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-neutral-900">3. Elige la hora</h2>
          <div className="flex flex-wrap gap-2">
            {masseuse.availableTimes.map((t) => (
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
                {t}
              </button>
            ))}
          </div>
        </section>
      )}

      {confirmed && <AddedToCartBanner message="Sesión de spa agregada al carrito." />}

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
