"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { CartItem } from "@/lib/cart-types";
import { useAuth } from "@/lib/AuthContext";

const ANON_CART_KEY = "casabrava_cart_anon";

function cartStorageKey(userId: string | null): string {
  return userId ? `casabrava_cart_${userId}` : ANON_CART_KEY;
}

function readCart(key: string): CartItem[] {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as CartItem[]) : [];
  } catch {
    window.localStorage.removeItem(key);
    return [];
  }
}

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
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carrito namespaced por guest_id — cada usuario en el mismo navegador
  // tiene su propio carrito en localStorage. Se deriva en cada render desde
  // useAuth() (no necesita su propio estado/efecto).
  const storageKey = cartStorageKey(user?.id ?? null);

  // Hidrata el carrito de la clave resuelta una vez que AuthProvider terminó
  // de resolver la sesión (espera a que authLoading sea false para no
  // hidratar con la clave equivocada y tener que cambiarla justo después). Si
  // hay sesión y el bucket anónimo tiene items (agregados antes de iniciar
  // sesión), se fusionan una sola vez en el bucket del usuario y se limpia el
  // anónimo — idempotente, en la siguiente corrida el bucket anónimo ya está vacío.
  useEffect(() => {
    if (authLoading) return;

    let nextItems = readCart(storageKey);
    if (storageKey !== ANON_CART_KEY) {
      const anonItems = readCart(ANON_CART_KEY);
      if (anonItems.length > 0) {
        nextItems = [...nextItems, ...anonItems];
        window.localStorage.setItem(storageKey, JSON.stringify(nextItems));
        window.localStorage.removeItem(ANON_CART_KEY);
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación del carrito (mockeado en localStorage) al resolverse la sesión; no es un efecto derivado en cadena.
    setItems(nextItems);
    setIsLoading(false);
  }, [authLoading, storageKey]);

  function persist(next: CartItem[]) {
    setItems(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
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
