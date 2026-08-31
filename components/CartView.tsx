"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/CartContext";
import CartItemRow from "@/components/CartItemRow";

export default function CartView() {
  const router = useRouter();
  const { items, isLoading, removeFromCart, clearCart, totalPrice } = useCart();

  function handleCheckout() {
    clearCart();
    router.push("/pago-exitoso");
  }

  if (isLoading) {
    return <p className="text-sm text-neutral-500">Cargando…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-neutral-500">Tu carrito está vacío.</p>
        <Link
          href="/"
          className="rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:bg-neutral-700 active:scale-95"
        >
          Explorar servicios
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <CartItemRow key={item.id} item={item} onRemove={removeFromCart} />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-neutral-200 pt-4 text-base font-semibold text-neutral-900">
        <span>Total</span>
        <span>${totalPrice.toFixed(2)}</span>
      </div>

      <button
        type="button"
        onClick={handleCheckout}
        className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:bg-neutral-700 active:scale-95"
      >
        Pagar servicios
      </button>
    </div>
  );
}
