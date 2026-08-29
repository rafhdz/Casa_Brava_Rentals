"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CartItem } from "@/lib/mock-data";

const CART_STORAGE_KEY = "casabrava_cart";

// Genera un id único para un item del carrito. Vive fuera de cualquier componente/hook
// para no disparar react-hooks/purity (Date.now es una función impura).
export function generateCartItemId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type CartContextValue = {
  items: CartItem[];
  isLoading: boolean;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hidrata el carrito mockeado desde localStorage al cargar la app (una sola vez, al montar).
  useEffect(() => {
    let storedItems: CartItem[] = [];
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY);
      storedItems = stored ? (JSON.parse(stored) as CartItem[]) : [];
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación única del carrito mockeado desde localStorage al montar; no es un efecto derivado en cadena.
    setItems(storedItems);
    setIsLoading(false);
  }, []);

  function persist(next: CartItem[]) {
    setItems(next);
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  }

  function addToCart(item: CartItem) {
    persist([...items, item]);
  }

  function removeFromCart(id: string) {
    persist(items.filter((item) => item.id !== id));
  }

  function clearCart() {
    persist([]);
  }

  const totalPrice = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const totalItems = items.length;

  return (
    <CartContext.Provider
      value={{ items, isLoading, addToCart, removeFromCart, clearCart, totalPrice, totalItems }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart debe usarse dentro de un CartProvider");
  }
  return context;
}
