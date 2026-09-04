import type { Enums } from "@/lib/database.types";

export type SpaReservation = {
  masseuseId: string;
  masseuseName: string;
  day: string; // fecha ISO ("yyyy-MM-dd"), tomada de spa_availability.available_date
  time: string; // hora en 24h ("HH:mm:ss"), tomada de spa_availability.available_time
};

// mealType usa directamente el ENUM real de la base (meal_type: "Desayuno" |
// "Almuerzo" | "Cena") — el valor ya viene en español y sirve como label sin
// traducción aparte, por eso no hay un campo mealTypeLabel separado.
export type FoodReservation = {
  day: string; // fecha ISO ("yyyy-MM-dd"), tomada de food_availability.available_date
  mealType: Enums<"meal_type">;
  menuOptionId: string;
  menuOptionName: string;
  guests: number;
};

export type WineOrderBottle = {
  bottleId: string;
  bottleName: string;
  quantity: number;
  unitPrice: number;
};

export type WineOrder = {
  bottles: WineOrderBottle[];
  packageQuantity: number;
  packageUnitPrice: number;
  packageId: string | null; // wine_packages.id real — null si packageQuantity es 0
};

export type CartItem =
  | { id: string; serviceType: "spa"; details: SpaReservation; quantity: number; totalPrice: number }
  | { id: string; serviceType: "comida"; details: FoodReservation; quantity: number; totalPrice: number }
  | { id: string; serviceType: "vinos"; details: WineOrder; quantity: number; totalPrice: number };
