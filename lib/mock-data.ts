// Datos mockeados del prototipo visual.
// TODO(backend): reemplazar por datos reales desde Supabase (ver CLAUDE.md).

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

  { id: "ent-principal-lat-1", label: "Entrada Principal Lateral", url: "/images/ent_principal_lat_1.jpeg" },
  { id: "ent-principal-lat-2", label: "Entrada Principal Lateral", url: "/images/ent_principal_lat_2.jpeg" },

  { id: "ent-principal-1", label: "Entrada Principal", url: "/images/ent_principal_1.jpeg" },
  { id: "ent-principal-2", label: "Entrada Principal", url: "/images/ent_principal_2.jpeg" },

  { id: "terraza-1", label: "Terraza", url: "/images/terraza_1.jpeg" },
  { id: "terraza-2", label: "Terraza", url: "/images/terraza_2.jpeg" },
  { id: "terraza-3", label: "Terraza", url: "/images/terraza_3.jpeg" },
  { id: "terraza-4", label: "Terraza", url: "/images/terraza_4.jpeg" },

  { id: "mezzanine-1", label: "Habitación del Mezzanine", url: "/images/del_mezzanine_1.jpeg" },
  { id: "mezzanine-2", label: "Habitación del Mezzanine", url: "/images/del_mezzanine_2.jpeg" },
  { id: "mezzanine-3", label: "Habitación del Mezzanine", url: "/images/del_mezzanine_3.jpeg" },
  { id: "mezzanine-4", label: "Habitación del Mezzanine", url: "/images/del_mezzanine_4.jpeg" },

  { id: "hab-terraza-1", label: "Habitación de la Terraza", url: "/images/de_la_terraza_1.jpeg" },
  { id: "hab-terraza-2", label: "Habitación de la Terraza", url: "/images/de_la_terraza_2.jpeg" },
  { id: "hab-terraza-3", label: "Habitación de la Terraza", url: "/images/de_la_terraza_3.jpeg" },
  { id: "hab-terraza-4", label: "Habitación de la Terraza", url: "/images/de_la_terraza_4.jpeg" },
  { id: "hab-terraza-5", label: "Habitación de la Terraza", url: "/images/de_la_terraza_5.jpeg" },

  { id: "sala-tv-1", label: "Sala de TV", url: "/images/sala_tv_1.jpeg" },
  { id: "sala-tv-2", label: "Sala de TV", url: "/images/sala_tv_2.jpeg" },
  { id: "sala-tv-3", label: "Sala de TV", url: "/images/sala_tv_3.jpeg" },
  { id: "sala-tv-4", label: "Sala de TV", url: "/images/sala_tv_4.jpeg" },

  { id: "pasillo-principal-1", label: "Pasillo Principal", url: "/images/pas_principal.jpeg" },

  { id: "amarillo-1", label: "Habitación Amarilla", url: "/images/amarillo_1.jpeg" },
  { id: "amarillo-2", label: "Habitación Amarilla", url: "/images/amarillo_2.jpeg" },
  { id: "amarillo-3", label: "Habitación Amarilla", url: "/images/amarillo_3.jpeg" },
  { id: "amarillo-4", label: "Habitación Amarilla", url: "/images/amarillo_4.jpeg" },
  { id: "amarillo-5", label: "Habitación Amarilla", url: "/images/amarillo_5.jpeg" },

  { id: "hab-principal-1", label: "Habitación Principal", url: "/images/principal_1.jpeg" },
  { id: "hab-principal-2", label: "Habitación Principal", url: "/images/principal_2.jpeg" },
  { id: "hab-principal-3", label: "Habitación Principal", url: "/images/principal_3.jpeg" },
  { id: "hab-principal-4", label: "Habitación Principal", url: "/images/principal_4.jpeg" },
  { id: "hab-principal-5", label: "Habitación Principal", url: "/images/principal_5.jpeg" },
  { id: "hab-principal-6", label: "Habitación Principal", url: "/images/principal_6.jpeg" },
  { id: "hab-principal-7", label: "Habitación Principal", url: "/images/principal_7.jpeg" },

  { id: "hab-fuente-1", label: "Habitación de la Fuente", url: "/images/de_la_fuente_1.jpeg" },
  { id: "hab-fuente-2", label: "Habitación de la Fuente", url: "/images/de_la_fuente_2.jpeg" },
  { id: "hab-fuente-3", label: "Habitación de la Fuente", url: "/images/de_la_fuente_3.jpeg" },
  { id: "hab-fuente-4", label: "Habitación de la Fuente", url: "/images/de_la_fuente_4.jpeg" },

  { id: "hab-mane-1", label: "Habitación de Mane", url: "/images/de_mane_1.jpeg" },
  { id: "hab-mane-2", label: "Habitación de Mane", url: "/images/de_mane_2.jpeg" },
  { id: "hab-mane-3", label: "Habitación de Mane", url: "/images/de_mane_3.jpeg" },
  { id: "hab-mane-4", label: "Habitación de Mane", url: "/images/de_mane_4.jpeg" },
  { id: "hab-mane-5", label: "Habitación de Mane", url: "/images/de_mane_5.jpeg" },
  { id: "hab-mane-6", label: "Habitación de Mane", url: "/images/de_mane_6.jpeg" },
  { id: "hab-mane-7", label: "Habitación de Mane", url: "/images/de_mane_7.jpeg" },
  { id: "hab-mane-8", label: "Habitación de Mane", url: "/images/de_mane_8.jpeg" },
  { id: "hab-mane-9", label: "Habitación de Mane", url: "/images/de_mane_9.jpeg" },

  { id: "hab-abuela-1", label: "Habitación de la Abuela", url: "/images/de_la_abuela_1.jpeg" },
  { id: "hab-abuela-2", label: "Habitación de la Abuela", url: "/images/de_la_abuela_2.jpeg" },
  { id: "hab-abuela-3", label: "Habitación de la Abuela", url: "/images/de_la_abuela_3.jpeg" },
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
      { id: "jabon-corporal", label: "Jabón corporal", url: "/icons/amenities/baño/jabon_corporal.svg" },
      { id: "regadera-interior", label: "Regadera interior", url: "/icons/amenities/baño/regadera_interior.svg" },
      { id: "agua-caliente", label: "Agua caliente", url: "/icons/amenities/baño/agua_caliente.svg" },
    ],
  },
  {
    id: "habitacion-lavanderia",
    category: "Habitación y lavandería",
    items: [
      { id: "ganchos", label: "Ganchos", url: "/icons/amenities/habitación/ganchos.svg" },
      { id: "ventanas-blackout", label: "Ventanas blackout", url: "/icons/amenities/habitación/ventana_blackout.svg" },
      { id: "mosquitero", label: "Mosquitero", url: "/icons/amenities/habitación/mosquitera.svg" },
    ],
  },
  {
    id: "espacio-guardar-ropa",
    category: "Espacio para guardar ropa",
    items: [{ id: "closet", label: "Clóset", url: "/icons/amenities/habitación/closet.svg" }],
  },
  {
    id: "entretenimiento",
    category: "Entretenimiento",
    items: [
      { id: "television", label: "Televisión", url: "/icons/amenities/entrenimiento/tv.svg" },
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
      { id: "aire-acondicionado", label: "Aire acondicionado", url: "/icons/amenities/calefacción/ac.svg" },
      { id: "ventilador-techo", label: "Ventilador de techo", url: "/icons/amenities/calefacción/fan.svg" },
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
    items: [{ id: "wifi", label: "Wifi de alta velocidad", url: "/icons/amenities/internet/wifi.svg" }],
  },
  {
    id: "cocina-comedor",
    category: "Cocina y comedor",
    items: [
      { id: "refrigerador", label: "Refrigerador", url: "/icons/amenities/cocina/fridge.svg" },
      { id: "microondas", label: "Microondas", url: "/icons/amenities/cocina/microwave.svg" },
      {
        id: "utensilios-basicos",
        label: "Utensilios básicos para cocinar",
        url: "/icons/amenities/cocina/utensils.svg",
      },
      { id: "platos-cubiertos", label: "Platos y cubiertos", url: "/icons/amenities/cocina/dishes.svg" },
      { id: "cristaleria", label: "Cristalería", url: "/icons/amenities/cocina/glass.svg" },
      { id: "congelador", label: "Congelador", url: "/icons/amenities/cocina/fridge.svg" },
      { id: "estufa-gas", label: "Estufa de gas", url: "/icons/amenities/cocina/stove.svg" },
      { id: "cafetera", label: "Cafetera", url: "/icons/amenities/cocina/coffee_machine.svg" },
      {
        id: "cafetera-filtro",
        label: "Cafetera de filtro",
        url: "/icons/amenities/cocina/coffee_machine.svg",
      },
      { id: "tostador", label: "Tostador", url: "/icons/amenities/cocina/toaster.svg" },
      { id: "licuadora", label: "Licuadora", url: "/icons/amenities/cocina/licuadora.svg" },
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
      { id: "jardin-privado", label: "Jardín privado", url: "/icons/amenities/exterior/jardin.svg" },
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
    description: "Chef privado disponible para preparar desayunos, almuerzos y cenas durante tu estadía.",
    priceLabel: "Desde $45 / persona",
    image: "/images/servicio_comida_holder.jpg",
  },
  {
    id: "spa",
    title: "SPA / Masajes",
    description: "Sesiones de masaje relajante o terapéutico a domicilio, con terapeutas certificados.",
    priceLabel: "Desde $80 / sesión",
    image: "/images/servicio_spa_holder.jpg",
  },
  {
    id: "vinos",
    title: "Paquete de Vinos",
    description: "Selección curada de vinos nacionales e importados, entregada antes de tu llegada.",
    priceLabel: "Desde $60 / paquete",
    image: "/images/paquete_vinos_holder.jpg",
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

export type UserRole = "admin" | "guest";
export type UserStatus = "activo" | "invitado";

export type MockUser = {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  estado: UserStatus;
};

export const mockUsers: MockUser[] = [
  {
    id: "user-1",
    nombre: "Rafael Hernández",
    email: "admin@test.com",
    rol: "admin",
    estado: "activo",
  },
  {
    id: "user-2",
    nombre: "María Gómez",
    email: "maria.gomez@example.com",
    rol: "guest",
    estado: "activo",
  },
  {
    id: "user-3",
    nombre: "Carlos Ruiz",
    email: "carlos.ruiz@example.com",
    rol: "guest",
    estado: "invitado",
  },
];

export type ReservationStatus = "actual" | "futura" | "pasada";

export type MockReservation = {
  id: string;
  huespedName: string;
  fechaCheckIn: string;
  fechaCheckOut: string;
  estado: ReservationStatus;
  montoTotal: number;
};

export const mockReservations: MockReservation[] = [
  {
    id: "res-1",
    huespedName: "María Gómez",
    fechaCheckIn: "2026-08-20",
    fechaCheckOut: "2026-08-24",
    estado: "actual",
    montoTotal: 1300,
  },
  {
    id: "res-2",
    huespedName: "Carlos Ruiz",
    fechaCheckIn: "2026-09-10",
    fechaCheckOut: "2026-09-14",
    estado: "futura",
    montoTotal: 1450,
  },
  {
    id: "res-3",
    huespedName: "Laura Fernández",
    fechaCheckIn: "2026-10-01",
    fechaCheckOut: "2026-10-05",
    estado: "futura",
    montoTotal: 1000,
  },
  {
    id: "res-4",
    huespedName: "Jorge Salas",
    fechaCheckIn: "2026-07-01",
    fechaCheckOut: "2026-07-05",
    estado: "pasada",
    montoTotal: 1000,
  },
];
