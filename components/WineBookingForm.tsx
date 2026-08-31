"use client";

import { useState } from "react";
import { useCart, generateCartItemId } from "@/lib/CartContext";
import { WINE_BOTTLES, WINE_PACKAGE, type CartItem, type WineOrderBottle } from "@/lib/mock-data";
import AddedToCartBanner from "@/components/AddedToCartBanner";

export default function WineBookingForm() {
  const { addToCart } = useCart();
  const [bottleQuantities, setBottleQuantities] = useState<Record<string, number>>({});
  const [packageQuantity, setPackageQuantity] = useState(0);
  const [confirmed, setConfirmed] = useState(false);

  const totalBottles = Object.values(bottleQuantities).reduce((sum, qty) => sum + qty, 0);
  const canAdd = totalBottles > 0 || packageQuantity > 0;

  const bottlesTotal = WINE_BOTTLES.reduce(
    (sum, bottle) => sum + (bottleQuantities[bottle.id] ?? 0) * bottle.price,
    0
  );
  const packageTotal = packageQuantity * WINE_PACKAGE.price;
  const orderTotal = bottlesTotal + packageTotal;

  function handleBottleQuantityChange(bottleId: string, delta: number) {
    setBottleQuantities((prev) => {
      const next = Math.max(0, (prev[bottleId] ?? 0) + delta);
      return { ...prev, [bottleId]: next };
    });
    setConfirmed(false);
  }

  function handlePackageQuantityChange(delta: number) {
    setPackageQuantity((prev) => Math.max(0, prev + delta));
    setConfirmed(false);
  }

  function handleAddToCart() {
    if (!canAdd) return;

    const bottles: WineOrderBottle[] = WINE_BOTTLES.filter(
      (bottle) => (bottleQuantities[bottle.id] ?? 0) > 0
    ).map((bottle) => ({
      bottleId: bottle.id,
      bottleName: bottle.name,
      quantity: bottleQuantities[bottle.id] ?? 0,
      unitPrice: bottle.price,
    }));

    const item: CartItem = {
      id: generateCartItemId("vinos"),
      serviceType: "vinos",
      details: { bottles, packageQuantity, packageUnitPrice: WINE_PACKAGE.price },
      quantity: totalBottles + packageQuantity * 4,
      totalPrice: orderTotal,
    };
    addToCart(item);
    setBottleQuantities({});
    setPackageQuantity(0);
    setConfirmed(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-900">Botellas individuales</h2>
        <div className="flex flex-col gap-3">
          {WINE_BOTTLES.map((bottle) => (
            <div
              key={bottle.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  {bottle.name} <span className="font-normal text-neutral-500">(${bottle.price})</span>
                </p>
                <p className="text-sm text-neutral-500">{bottle.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleBottleQuantityChange(bottle.id, -1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition-all duration-200 ease-in-out hover:border-neutral-900 hover:text-neutral-900 active:scale-90"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm font-semibold text-neutral-900">
                  {bottleQuantities[bottle.id] ?? 0}
                </span>
                <button
                  type="button"
                  onClick={() => handleBottleQuantityChange(bottle.id, 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition-all duration-200 ease-in-out hover:border-neutral-900 hover:text-neutral-900 active:scale-90"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-neutral-900">{WINE_PACKAGE.label}</h2>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {WINE_PACKAGE.label}{" "}
              <span className="font-normal text-neutral-500">(${WINE_PACKAGE.price})</span>
            </p>
            <p className="text-sm text-neutral-500">{WINE_PACKAGE.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handlePackageQuantityChange(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition-all duration-200 ease-in-out hover:border-neutral-900 hover:text-neutral-900 active:scale-90"
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-semibold text-neutral-900">{packageQuantity}</span>
            <button
              type="button"
              onClick={() => handlePackageQuantityChange(1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-700 transition-all duration-200 ease-in-out hover:border-neutral-900 hover:text-neutral-900 active:scale-90"
            >
              +
            </button>
          </div>
        </div>
      </section>

      {canAdd && (
        <p className="text-sm font-medium text-neutral-900">Total del pedido: ${orderTotal.toFixed(2)}</p>
      )}

      {confirmed && <AddedToCartBanner message="Pedido de vinos agregado al carrito." />}

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
