// Datos mockeados del prototipo visual.
// TODO(backend): reemplazar por datos reales desde Supabase (ver CLAUDE.md).

export type Photo = {
  id: string;
  label: string;
};

export const PROPERTY_PHOTOS: Photo[] = [
  { id: "foto-1", label: "Fachada principal" },
  { id: "foto-2", label: "Piscina infinita" },
  { id: "foto-3", label: "Sala principal" },
  { id: "foto-4", label: "Cocina gourmet" },
  { id: "foto-5", label: "Habitación master" },
  { id: "foto-6", label: "Vista al atardecer" },
];

export type Amenity = {
  id: string;
  icon: string;
  label: string;
};

export const AMENITIES: Amenity[] = [
  { id: "wifi", icon: "📶", label: "WiFi de alta velocidad" },
  { id: "piscina", icon: "🏊", label: "Piscina privada" },
  { id: "ac", icon: "❄️", label: "Aire acondicionado" },
  { id: "cocina", icon: "🍳", label: "Cocina totalmente equipada" },
  { id: "parqueo", icon: "🚗", label: "Parqueo privado" },
  { id: "seguridad", icon: "🔒", label: "Seguridad 24/7" },
  { id: "terraza", icon: "🌅", label: "Terraza con vista al mar" },
  { id: "tv", icon: "📺", label: "Smart TV en cada habitación" },
];

export type AdditionalService = {
  id: string;
  title: string;
  description: string;
  priceLabel: string;
};

export const ADDITIONAL_SERVICES: AdditionalService[] = [
  {
    id: "comida",
    title: "Comida",
    description: "Chef privado disponible para preparar desayunos, almuerzos y cenas durante tu estadía.",
    priceLabel: "Desde $45 / persona",
  },
  {
    id: "spa",
    title: "SPA / Masajes",
    description: "Sesiones de masaje relajante o terapéutico a domicilio, con terapeutas certificados.",
    priceLabel: "Desde $80 / sesión",
  },
  {
    id: "vinos",
    title: "Paquete de Vinos",
    description: "Selección curada de vinos nacionales e importados, entregada antes de tu llegada.",
    priceLabel: "Desde $60 / paquete",
  },
];

export type FareType = "estandar" | "flexible";

export type FareOption = {
  id: FareType;
  title: string;
  description: string;
  surchargePercent: number;
};

export const FARE_OPTIONS: FareOption[] = [
  {
    id: "estandar",
    title: "Tarifa Estándar",
    description: "No cancelable. Precio base sin recargos.",
    surchargePercent: 0,
  },
  {
    id: "flexible",
    title: "Tarifa Flexible",
    description: "Cancelable hasta 5 días antes de la llegada. Incluye un recargo del 15%.",
    surchargePercent: 15,
  },
];

// Precios base del prototipo (en USD). Ajustar aquí para la demo.
export const PRICING_CONFIG = {
  nightlyRate: 250,
  securityDeposit: 300,
  currency: "USD",
};
