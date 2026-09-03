// Datos mockeados del prototipo visual.
// TODO(backend): reemplazar por datos reales desde Supabase (ver CLAUDE.md).

import type { Enums } from "@/lib/database.types";

export type Photo = {
  id: string;
  label: string;
  url: string;
};

export const PROPERTY_PHOTOS: Photo[] = [
  { id: "jardin-1", label: "Jardín", url: "/images/jardin_1.jpeg" },
  { id: "jardin-2", label: "Jardín", url: "/images/jardin_2.jpeg" },
  { id: "jardin-3", label: "Jardín", url: "/images/jardin_3.jpeg" },
  { id: "jardin-4", label: "Jardín", url: "/images/jardin_4.jpeg" },
  { id: "jardin-5", label: "Jardín", url: "/images/jardin_5.jpeg" },

  { id: "parking-1", label: "Estacionamiento", url: "/images/parking_1.jpeg" },
  { id: "parking-2", label: "Estacionamiento", url: "/images/parking_2.jpeg" },
  { id: "parking-3", label: "Estacionamiento", url: "/images/parking_3.jpeg" },
  { id: "parking-4", label: "Estacionamiento", url: "/images/parking_4.jpeg" },
  { id: "parking-5", label: "Estacionamiento", url: "/images/parking_5.jpeg" },

  {
    id: "ent-principal-lat-1",
    label: "Entrada Principal Lateral",
    url: "/images/ent_principal_lat_1.jpeg",
  },
  {
    id: "ent-principal-lat-2",
    label: "Entrada Principal Lateral",
    url: "/images/ent_principal_lat_2.jpeg",
  },

  {
    id: "ent-principal-1",
    label: "Entrada Principal",
    url: "/images/ent_principal_1.jpeg",
  },
  {
    id: "ent-principal-2",
    label: "Entrada Principal",
    url: "/images/ent_principal_2.jpeg",
  },

  { id: "terraza-1", label: "Terraza", url: "/images/terraza_1.jpeg" },
  { id: "terraza-2", label: "Terraza", url: "/images/terraza_2.jpeg" },
  { id: "terraza-3", label: "Terraza", url: "/images/terraza_3.jpeg" },
  { id: "terraza-4", label: "Terraza", url: "/images/terraza_4.jpeg" },

  {
    id: "mezzanine-1",
    label: "Habitación del Mezzanine",
    url: "/images/del_mezzanine_1.jpeg",
  },
  {
    id: "mezzanine-2",
    label: "Habitación del Mezzanine",
    url: "/images/del_mezzanine_2.jpeg",
  },
  {
    id: "mezzanine-3",
    label: "Habitación del Mezzanine",
    url: "/images/del_mezzanine_3.jpeg",
  },
  {
    id: "mezzanine-4",
    label: "Habitación del Mezzanine",
    url: "/images/del_mezzanine_4.jpeg",
  },

  {
    id: "hab-terraza-1",
    label: "Habitación de la Terraza",
    url: "/images/de_la_terraza_1.jpeg",
  },
  {
    id: "hab-terraza-2",
    label: "Habitación de la Terraza",
    url: "/images/de_la_terraza_2.jpeg",
  },
  {
    id: "hab-terraza-3",
    label: "Habitación de la Terraza",
    url: "/images/de_la_terraza_3.jpeg",
  },
  {
    id: "hab-terraza-4",
    label: "Habitación de la Terraza",
    url: "/images/de_la_terraza_4.jpeg",
  },
  {
    id: "hab-terraza-5",
    label: "Habitación de la Terraza",
    url: "/images/de_la_terraza_5.jpeg",
  },

  { id: "sala-tv-1", label: "Sala de TV", url: "/images/sala_tv_1.jpeg" },
  { id: "sala-tv-2", label: "Sala de TV", url: "/images/sala_tv_2.jpeg" },
  { id: "sala-tv-3", label: "Sala de TV", url: "/images/sala_tv_3.jpeg" },
  { id: "sala-tv-4", label: "Sala de TV", url: "/images/sala_tv_4.jpeg" },

  {
    id: "pasillo-principal-1",
    label: "Pasillo Principal",
    url: "/images/pas_principal.jpeg",
  },

  {
    id: "amarillo-1",
    label: "Habitación Amarilla",
    url: "/images/amarillo_1.jpeg",
  },
  {
    id: "amarillo-2",
    label: "Habitación Amarilla",
    url: "/images/amarillo_2.jpeg",
  },
  {
    id: "amarillo-3",
    label: "Habitación Amarilla",
    url: "/images/amarillo_3.jpeg",
  },
  {
    id: "amarillo-4",
    label: "Habitación Amarilla",
    url: "/images/amarillo_4.jpeg",
  },
  {
    id: "amarillo-5",
    label: "Habitación Amarilla",
    url: "/images/amarillo_5.jpeg",
  },

  {
    id: "hab-principal-1",
    label: "Habitación Principal",
    url: "/images/principal_1.jpeg",
  },
  {
    id: "hab-principal-2",
    label: "Habitación Principal",
    url: "/images/principal_2.jpeg",
  },
  {
    id: "hab-principal-3",
    label: "Habitación Principal",
    url: "/images/principal_3.jpeg",
  },
  {
    id: "hab-principal-4",
    label: "Habitación Principal",
    url: "/images/principal_4.jpeg",
  },
  {
    id: "hab-principal-5",
    label: "Habitación Principal",
    url: "/images/principal_5.jpeg",
  },
  {
    id: "hab-principal-6",
    label: "Habitación Principal",
    url: "/images/principal_6.jpeg",
  },
  {
    id: "hab-principal-7",
    label: "Habitación Principal",
    url: "/images/principal_7.jpeg",
  },

  {
    id: "hab-fuente-1",
    label: "Habitación de la Fuente",
    url: "/images/de_la_fuente_1.jpeg",
  },
  {
    id: "hab-fuente-2",
    label: "Habitación de la Fuente",
    url: "/images/de_la_fuente_2.jpeg",
  },
  {
    id: "hab-fuente-3",
    label: "Habitación de la Fuente",
    url: "/images/de_la_fuente_3.jpeg",
  },
  {
    id: "hab-fuente-4",
    label: "Habitación de la Fuente",
    url: "/images/de_la_fuente_4.jpeg",
  },

  {
    id: "hab-mane-1",
    label: "Habitación de Mane",
    url: "/images/de_mane_1.jpeg",
  },
  {
    id: "hab-mane-2",
    label: "Habitación de Mane",
    url: "/images/de_mane_2.jpeg",
  },
  {
    id: "hab-mane-3",
    label: "Habitación de Mane",
    url: "/images/de_mane_3.jpeg",
  },
  {
    id: "hab-mane-4",
    label: "Habitación de Mane",
    url: "/images/de_mane_4.jpeg",
  },
  {
    id: "hab-mane-5",
    label: "Habitación de Mane",
    url: "/images/de_mane_5.jpeg",
  },
  {
    id: "hab-mane-6",
    label: "Habitación de Mane",
    url: "/images/de_mane_6.jpeg",
  },
  {
    id: "hab-mane-7",
    label: "Habitación de Mane",
    url: "/images/de_mane_7.jpeg",
  },
  {
    id: "hab-mane-8",
    label: "Habitación de Mane",
    url: "/images/de_mane_8.jpeg",
  },
  {
    id: "hab-mane-9",
    label: "Habitación de Mane",
    url: "/images/de_mane_9.jpeg",
  },

  {
    id: "hab-abuela-1",
    label: "Habitación de la Abuela",
    url: "/images/de_la_abuela_1.jpeg",
  },
  {
    id: "hab-abuela-2",
    label: "Habitación de la Abuela",
    url: "/images/de_la_abuela_2.jpeg",
  },
  {
    id: "hab-abuela-3",
    label: "Habitación de la Abuela",
    url: "/images/de_la_abuela_3.jpeg",
  },
];

export type Amenity = {
  id: string;
  label: string;
  url: string;
};

export type AmenityCategory = {
  id: string;
  category: string;
  items: Amenity[];
};

export const AMENITIES: AmenityCategory[] = [
  {
    id: "bano",
    category: "Baño",
    items: [
      {
        id: "jabon-corporal",
        label: "Jabón corporal",
        url: "/icons/amenities/baño/jabon_corporal.svg",
      },
      {
        id: "regadera-interior",
        label: "Regadera interior",
        url: "/icons/amenities/baño/regadera_interior.svg",
      },
      {
        id: "agua-caliente",
        label: "Agua caliente",
        url: "/icons/amenities/baño/agua_caliente.svg",
      },
    ],
  },
  {
    id: "habitacion-lavanderia",
    category: "Habitación y lavandería",
    items: [
      {
        id: "ganchos",
        label: "Ganchos",
        url: "/icons/amenities/habitación/ganchos.svg",
      },
      {
        id: "ventanas-blackout",
        label: "Ventanas blackout",
        url: "/icons/amenities/habitación/ventana_blackout.svg",
      },
      {
        id: "mosquitero",
        label: "Mosquitero",
        url: "/icons/amenities/habitación/mosquitera.svg",
      },
    ],
  },
  {
    id: "espacio-guardar-ropa",
    category: "Espacio para guardar ropa",
    items: [
      {
        id: "closet",
        label: "Clóset",
        url: "/icons/amenities/habitación/closet.svg",
      },
    ],
  },
  {
    id: "entretenimiento",
    category: "Entretenimiento",
    items: [
      {
        id: "television",
        label: "Televisión",
        url: "/icons/amenities/entrenimiento/tv.svg",
      },
      {
        id: "libros",
        label: "Libros y material de lectura",
        url: "/icons/amenities/entrenimiento/libros.svg",
      },
    ],
  },
  {
    id: "calefaccion-refrigeracion",
    category: "Calefacción y refrigeración",
    items: [
      {
        id: "aire-acondicionado",
        label: "Aire acondicionado",
        url: "/icons/amenities/calefacción/ac.svg",
      },
      {
        id: "ventilador-techo",
        label: "Ventilador de techo",
        url: "/icons/amenities/calefacción/fan.svg",
      },
    ],
  },
  {
    id: "seguridad-hogar",
    category: "Seguridad en el hogar",
    items: [
      {
        id: "camaras-seguridad",
        label: "Cámaras de seguridad dentro de la propiedad",
        url: "/icons/amenities/seguridad/camara.svg",
      },
    ],
  },
  {
    id: "internet-oficina",
    category: "Internet y oficina",
    items: [
      {
        id: "wifi",
        label: "Wifi de alta velocidad",
        url: "/icons/amenities/internet/wifi.svg",
      },
    ],
  },
  {
    id: "cocina-comedor",
    category: "Cocina y comedor",
    items: [
      {
        id: "refrigerador",
        label: "Refrigerador",
        url: "/icons/amenities/cocina/fridge.svg",
      },
      {
        id: "microondas",
        label: "Microondas",
        url: "/icons/amenities/cocina/microwave.svg",
      },
      {
        id: "utensilios-basicos",
        label: "Utensilios básicos para cocinar",
        url: "/icons/amenities/cocina/utensils.svg",
      },
      {
        id: "platos-cubiertos",
        label: "Platos y cubiertos",
        url: "/icons/amenities/cocina/dishes.svg",
      },
      {
        id: "cristaleria",
        label: "Cristalería",
        url: "/icons/amenities/cocina/glass.svg",
      },
      {
        id: "congelador",
        label: "Congelador",
        url: "/icons/amenities/cocina/fridge.svg",
      },
      {
        id: "estufa-gas",
        label: "Estufa de gas",
        url: "/icons/amenities/cocina/stove.svg",
      },
      {
        id: "cafetera",
        label: "Cafetera",
        url: "/icons/amenities/cocina/coffee_machine.svg",
      },
      {
        id: "cafetera-filtro",
        label: "Cafetera de filtro",
        url: "/icons/amenities/cocina/coffee_machine.svg",
      },
      {
        id: "tostador",
        label: "Tostador",
        url: "/icons/amenities/cocina/toaster.svg",
      },
      {
        id: "licuadora",
        label: "Licuadora",
        url: "/icons/amenities/cocina/licuadora.svg",
      },
    ],
  },
  {
    id: "caracteristicas-ubicacion",
    category: "Características de la ubicación",
    items: [
      {
        id: "cerca-centro-pueblo",
        label: "5 minutos del centro del pueblo",
        url: "/icons/amenities/ubicación/location.svg",
      },
    ],
  },
  {
    id: "exterior",
    category: "Exterior",
    items: [
      {
        id: "jardin-privado",
        label: "Jardín privado",
        url: "/icons/amenities/exterior/jardin.svg",
      },
      {
        id: "muebles-exteriores",
        label: "Muebles exteriores",
        url: "/icons/amenities/exterior/mueble_exterior.svg",
      },
    ],
  },
  {
    id: "estacionamiento",
    category: "Estacionamiento",
    items: [
      {
        id: "estacionamiento-privado",
        label: "Estacionamiento privado de 8 plazas",
        url: "/icons/amenities/exterior/parking.svg",
      },
    ],
  },
];

export type AdditionalService = {
  id: string;
  title: string;
  description: string;
  priceLabel: string;
  image: string;
};

export const ADDITIONAL_SERVICES: AdditionalService[] = [
  {
    id: "comida",
    title: "Comida",
    description:
      "Desayunos, almuerzos y cenas preparados por un cocinero local durante tu estadía.",
    priceLabel: "Desde $200 / persona",
    image: "/images/servicio_comida_holder.jpg",
  },
  {
    id: "spa",
    title: "SPA / Masajes",
    description:
      "Sesiones de masaje relajante o terapéutico directamente en el spa de la propiedad, con nuestras masajistas.",
    priceLabel: "Desde $600 / sesión de una hora",
    image: "/images/servicio_spa_holder.jpg",
  },
  {
    id: "vinos",
    title: "Paquete de Vinos",
    description:
      "Selección de vinos Parvada disponibles a un precio exclusivo, entregados antes de tu estancia.",
    priceLabel: "Desde $2250 / paquete",
    image: "/images/paquete_vinos_holder.jpg",
  },
];

// Formatea una fecha simulada ISO (ej. "2026-09-04") a un formato corto legible (ej. "04 sept.").
export function formatSimulatedDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

// Disponibilidad simulada de días/horas por masajista — no existe tabla de
// disponibilidad real en Supabase (spa_masseuses solo tiene id/name/status),
// así que este mapa sigue siendo mock a propósito. Keyed por `name` (no por
// `id`): los ids reales de spa_masseuses son uuid generados por
// gen_random_uuid() y cambian en cada `supabase db reset`, así que no se
// pueden hardcodear como llave — el nombre es lo único estable entre reseeds.
export const SPA_AVAILABILITY: Record<string, { availableDays: string[]; availableTimes: string[] }> = {
  Ana: {
    availableDays: ["2026-09-02", "2026-09-04", "2026-09-09"],
    availableTimes: ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM"],
  },
  Carlos: {
    availableDays: ["2026-09-03", "2026-09-05", "2026-09-10"],
    availableTimes: ["9:00 AM", "11:00 AM", "3:00 PM", "5:00 PM"],
  },
  Laura: {
    availableDays: ["2026-09-02", "2026-09-06", "2026-09-11"],
    availableTimes: ["10:00 AM", "1:00 PM", "4:00 PM"],
  },
};

// Precio de sesión de spa — no hay columna de precio en spa_masseuses, sigue
// siendo un valor mock a propósito.
export const SPA_SESSION_PRICE = 600;

export const FOOD_AVAILABLE_DATES: string[] = [
  "2026-09-01",
  "2026-09-02",
  "2026-09-03",
  "2026-09-04",
  "2026-09-05",
];

export type SpaReservation = {
  masseuseId: string;
  masseuseName: string;
  day: string; // fecha ISO simulada
  time: string;
};

// mealType usa directamente el ENUM real de la base (meal_type: "Desayuno" |
// "Almuerzo" | "Cena") desde que FoodBookingForm se conectó al catálogo real
// de food_menus — el valor ya viene en español y sirve como label sin
// traducción aparte, por eso no hay un campo mealTypeLabel separado.
export type FoodReservation = {
  day: string; // fecha ISO simulada
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
