"use client";

import { useState } from "react";
import { useCart, generateCartItemId } from "@/lib/CartContext";
import {
  FOOD_AVAILABLE_DATES,
  FOOD_MENU_OPTIONS,
  MEAL_TYPES,
  formatSimulatedDate,
  type CartItem,
  type MealType,
} from "@/lib/mock-data";
import AddedToCartBanner from "@/components/AddedToCartBanner";

export default function FoodBookingForm() {
  const { addToCart } = useCart();
  const [day, setDay] = useState("");
  const [mealType, setMealType] = useState<MealType | "">("");
  const [menuOptionId, setMenuOptionId] = useState("");
  const [guests, setGuests] = useState(1);
  const [confirmed, setConfirmed] = useState(false);

  const menuOptions = mealType ? FOOD_MENU_OPTIONS[mealType] : [];
  const menuOption = menuOptions.find((option) => option.id === menuOptionId) ?? null;
  const canAdd = day !== "" && mealType !== "" && menuOption !== null && guests >= 1;

  function handleSelectDay(value: string) {
    setDay(value);
    setConfirmed(false);
  }

  function handleSelectMealType(value: MealType) {
    setMealType(value);
    setMenuOptionId("");
    setConfirmed(false);
  }

  function handleSelectMenuOption(value: string) {
    setMenuOptionId(value);
    setConfirmed(false);
  }

  function handleGuestsChange(value: number) {
    setGuests(Number.isNaN(value) || value < 1 ? 1 : value);
    setConfirmed(false);
  }

  function handleAddToCart() {
    if (!day || !mealType || !menuOption) return;

    const mealTypeLabel = MEAL_TYPES.find((m) => m.id === mealType)?.label ?? mealType;
    const item: CartItem = {
      id: generateCartItemId("comida"),
      serviceType: "comida",
      details: {
        day,
        mealType,
        mealTypeLabel,
        menuOptionId: menuOption.id,
        menuOptionName: menuOption.name,
        guests,
      },
      quantity: guests,
      totalPrice: menuOption.price * guests,
    };
    addToCart(item);
    setConfirmed(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-900">1. Elige el día</h2>
        <div className="flex flex-wrap gap-2">
          {FOOD_AVAILABLE_DATES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleSelectDay(d)}
              className={`rounded-full border px-4 py-2 text-sm transition-all duration-200 ease-in-out active:scale-95 ${
                day === d
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-700 hover:border-neutral-400"
              }`}
            >
              {formatSimulatedDate(d)}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-900">2. Elige el tiempo de comida</h2>
        <div className="flex flex-wrap gap-2">
          {MEAL_TYPES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelectMealType(m.id)}
              className={`rounded-full border px-4 py-2 text-sm transition-all duration-200 ease-in-out active:scale-95 ${
                mealType === m.id
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 text-neutral-700 hover:border-neutral-400"
              }`}
            >
              {m.label}
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
                <span>
                  <span className="block text-sm font-semibold text-neutral-900">
                    {option.name}{" "}
                    <span className="font-normal text-neutral-500">(${option.price} / persona)</span>
                  </span>
                  <span className="block text-sm text-neutral-500">{option.description}</span>
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

      {confirmed && <AddedToCartBanner message="Reservación de comida agregada al carrito." />}

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
