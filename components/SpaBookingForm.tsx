"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useCart, generateCartItemId } from "@/lib/CartContext";
import { SPA_AVAILABILITY, SPA_SESSION_PRICE, formatSimulatedDate, type CartItem } from "@/lib/mock-data";
import Calendar, { AVAILABILITY_MODIFIERS_CLASS_NAMES } from "@/components/Calendar";

type MasseuseOption = {
  id: string;
  name: string;
};

export default function SpaBookingForm({ masseuses }: { masseuses: MasseuseOption[] }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [masseuseId, setMasseuseId] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");

  const masseuse = masseuses.find((m) => m.id === masseuseId) ?? null;
  // Disponibilidad simulada (ver lib/mock-data.ts) keyed por nombre — el id real es uuid.
  const availability = masseuse ? SPA_AVAILABILITY[masseuse.name] : undefined;
  const canAdd = masseuse !== null && day !== "" && time !== "";

  function isDayAvailable(date: Date): boolean {
    return availability !== undefined && availability.availableDays.includes(format(date, "yyyy-MM-dd"));
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

      {masseuse && availability && (
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
              disabled={(date) => !isDayAvailable(date)}
              modifiers={{
                available: (date) => isDayAvailable(date) && format(date, "yyyy-MM-dd") !== day,
              }}
              modifiersClassNames={AVAILABILITY_MODIFIERS_CLASS_NAMES}
              defaultMonth={parseISO(availability.availableDays[0])}
            />
          </div>
          {day && (
            <p className="text-sm text-neutral-600">
              Día seleccionado: <span className="font-medium text-neutral-900">{formatSimulatedDate(day)}</span>
            </p>
          )}
        </section>
      )}

      {masseuse && availability && day && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-neutral-900">3. Elige la hora</h2>
          <div className="flex flex-wrap gap-2">
            {availability.availableTimes.map((t) => (
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
