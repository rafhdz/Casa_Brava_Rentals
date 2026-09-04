"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { useCart, generateCartItemId } from "@/lib/CartContext";
import { formatSimulatedDate } from "@/lib/format";
import type { CartItem } from "@/lib/cart-types";
import type { MealType } from "@/lib/api/types";
import Calendar from "@/components/Calendar";

type MenuOption = {
  id: string;
  meal_type: MealType;
  name: string;
  price_per_person: number;
};

// Orden fijo de despliegue de los tiempos de comida — el enum del backend ya trae
// las cadenas en español, así que se usan directo como value/label sin tabla
// de traducción aparte.
const MEAL_TYPE_ORDER: MealType[] = ["Desayuno", "Almuerzo", "Cena"];

export default function FoodBookingForm({
  menus,
  availableDates,
}: {
  menus: MenuOption[];
  // Fechas ISO ("yyyy-MM-dd") de FoodAvailability. El backend ya le oculta al
  // huésped los días pasados, así que llegan listas para pintar el calendario.
  availableDates: string[];
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [day, setDay] = useState("");
  const [mealType, setMealType] = useState<MealType | "">("");
  const [menuOptionId, setMenuOptionId] = useState("");
  const [guests, setGuests] = useState(1);

  const availableMealTypes = MEAL_TYPE_ORDER.filter((type) => menus.some((menu) => menu.meal_type === type));
  const menuOptions = mealType ? menus.filter((menu) => menu.meal_type === mealType) : [];
  const menuOption = menuOptions.find((option) => option.id === menuOptionId) ?? null;
  const canAdd = day !== "" && mealType !== "" && menuOption !== null && guests >= 1;

  function handleSelectDay(value: string) {
    setDay(value);
  }

  function handleSelectMealType(value: MealType) {
    setMealType(value);
    setMenuOptionId("");
  }

  function handleSelectMenuOption(value: string) {
    setMenuOptionId(value);
  }

  function handleGuestsChange(value: number) {
    setGuests(Number.isNaN(value) || value < 1 ? 1 : value);
  }

  function handleAddToCart() {
    if (!day || !mealType || !menuOption) return;

    const item: CartItem = {
      id: generateCartItemId("comida"),
      serviceType: "comida",
      details: {
        day,
        mealType,
        menuOptionId: menuOption.id,
        menuOptionName: menuOption.name,
        guests,
      },
      quantity: guests,
      totalPrice: menuOption.price_per_person * guests,
    };
    addToCart(item);
    toast.success("Reservación de comida agregada al carrito.", {
      action: { label: "Ver carrito", onClick: () => router.push("/carrito") },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-900">1. Elige el día</h2>
        {availableDates.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No hay días con servicio de cocina disponibles por ahora.
          </p>
        ) : (
          <>
            <p className="text-sm text-neutral-500">Solo los días con servicio de cocina disponible están habilitados.</p>
            <div className="w-fit rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
              <Calendar
                mode="single"
                selected={day ? parseISO(day) : undefined}
                onSelect={(date) => handleSelectDay(date ? format(date, "yyyy-MM-dd") : "")}
                disabled={(date) => !availableDates.includes(format(date, "yyyy-MM-dd"))}
                defaultMonth={parseISO(availableDates[0])}
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

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-900">2. Elige el tiempo de comida</h2>
        <div className="flex flex-wrap gap-2">
          {availableMealTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleSelectMealType(type)}
              className={`rounded-full border px-4 py-2 text-sm transition-all duration-200 ease-in-out active:scale-95 ${
                mealType === type
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-700 hover:border-neutral-400"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </section>

      {mealType && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-neutral-900">3. Elige el tipo de menú</h2>
          <div className="flex flex-col gap-3">
            {menuOptions.map((option) => (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-all duration-200 ease-in-out ${
                  menuOptionId === option.id
                    ? "border-neutral-900 bg-neutral-50"
                    : "border-neutral-200 hover:border-neutral-400"
                }`}
              >
                <input
                  type="radio"
                  name="menu-option"
                  value={option.id}
                  checked={menuOptionId === option.id}
                  onChange={() => handleSelectMenuOption(option.id)}
                  className="mt-1 h-4 w-4 accent-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/40 focus-visible:ring-offset-2"
                />
                <span className="block text-sm font-semibold text-neutral-900">
                  {option.name}{" "}
                  <span className="font-normal text-neutral-500">(${option.price_per_person} / persona)</span>
                </span>
              </label>
            ))}
          </div>
        </section>
      )}

      {menuOption && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-neutral-900">4. Número de personas</h2>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleGuestsChange(guests - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition-all duration-200 ease-in-out hover:border-neutral-900 hover:text-neutral-900 active:scale-90"
            >
              −
            </button>
            <span className="w-8 text-center text-sm font-semibold text-neutral-900">{guests}</span>
            <button
              type="button"
              onClick={() => handleGuestsChange(guests + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition-all duration-200 ease-in-out hover:border-neutral-900 hover:text-neutral-900 active:scale-90"
            >
              +
            </button>
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
