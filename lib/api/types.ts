// Contratos de la API REST de Django (backend/). Reemplaza al antiguo
// `lib/database.types.ts`, que se generaba desde el esquema de Postgres.
//
// Este archivo se escribe a mano contra los serializers del backend; no hay
// generador automático. Si cambia un serializer, este archivo cambia con él
// (el esquema OpenAPI vive en http://localhost:8000/api/docs/ y es la
// referencia para verificar la forma exacta de cada respuesta).

// ---------------------------------------------------------------------------
// Convenciones de la capa de transporte
// ---------------------------------------------------------------------------

/**
 * Un `DecimalField` de DRF viaja como **string**, no como number
 * (`COERCE_DECIMAL_TO_STRING` viene activado por defecto): `"4500.00"`,
 * `"15.00"`. Es a propósito — evita la pérdida de precisión de un float al
 * serializar dinero.
 *
 * Consecuencia para el frontend: nunca operar aritméticamente sobre estos
 * campos directamente. Pasarlos antes por `toNumber()` (lib/format.ts), que es
 * el único lugar donde se hace la conversión.
 */
export type Decimal = string;

/** Fecha ISO sin hora, `"yyyy-MM-dd"` (DateField). */
export type IsoDate = string;
/** Hora en 24h, `"HH:mm:ss"` (TimeField). */
export type IsoTime = string;
/** Fecha y hora con zona horaria (DateTimeField). */
export type IsoDateTime = string;

/**
 * Envoltura de las listas paginadas (`PageNumberPagination`, `PAGE_SIZE = 50`).
 *
 * El backend NO expone `page_size` como query param, así que 50 es un tope
 * duro por página: una colección más grande (la disponibilidad de spa ya pasa
 * de 80 bloques) obliga a seguir el enlace `next`. Para eso está
 * `fetchAllPages()` en lib/api/client.ts — usarlo en vez de leer `.results` de
 * la primera página y asumir que ahí está todo.
 *
 * Tres endpoints declaran `pagination_class = None` y devuelven un arreglo
 * plano en vez de esta envoltura: fotos, categorías de amenidades y tarjetas
 * de servicios del Home.
 */
export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

// ---------------------------------------------------------------------------
// Enumeraciones (TextChoices del backend)
// ---------------------------------------------------------------------------

export type RoleType = "admin" | "holder" | "guest";
export type ProfileStatus = "activo" | "invitado";
export type ReservationStatus = "pendiente" | "confirmada" | "cancelada" | "finalizada";
export type PaymentStatus = "pendiente" | "parcial" | "completado" | "reembolsado";
export type PaymentProvider = "simulado" | "stripe";
export type MealType = "Desayuno" | "Almuerzo" | "Cena";

/** Estados en los que una reservación ocupa el calendario y admite servicios. */
export const ESTADOS_ACTIVOS: ReservationStatus[] = ["pendiente", "confirmada"];

/**
 * Los tres tiempos de comida, en el orden en que se ofrecen.
 *
 * El enum del backend ya viene en español, así que cada valor sirve también
 * como label — no hay tabla de traducción. Alimenta los selects del catálogo
 * de menús en `/p/casa-brava/owner-panel/catalogos`.
 */
export const MEAL_TYPES: MealType[] = ["Desayuno", "Almuerzo", "Cena"];

// ---------------------------------------------------------------------------
// usuarios
// ---------------------------------------------------------------------------

/**
 * Perfil de usuario — `/api/usuarios/`.
 *
 * En Supabase el usuario vivía partido en `auth.users` (credenciales) y
 * `public.profiles` (rol y datos de negocio). Django los fusiona en un único
 * modelo, así que aquí también hay **un solo tipo**: ya no existe el par
 * `user` + `profile` que exponía el antiguo AuthContext.
 */
export type Usuario = {
  id: string;
  email: string;
  first_name: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  /** Derivado en el servidor: nombre + apellidos, ya unidos. */
  nombre_completo: string;
  phone: string | null;
  date_of_birth: IsoDate | null;
  document_id: string | null;
  role: RoleType;
  status: ProfileStatus;
  is_active: boolean;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
};

/** Respuesta de `POST /api/auth/token/`. */
export type TokenPair = {
  access: string;
  refresh: string;
  user: Usuario;
};

/** Claims que el backend mete dentro del access token (ver CasaBravaTokenObtainPairSerializer). */
export type AccessTokenClaims = {
  exp: number;
  user_id: string;
  role: RoleType;
  email: string;
};

// ---------------------------------------------------------------------------
// propiedades
// ---------------------------------------------------------------------------

export type PropertySettings = {
  id: string;
  nightly_rate: Decimal;
  security_deposit: Decimal;
};

export type FareType = {
  id: string;
  name: string;
  surcharge_percentage: Decimal;
};

export type PropertyPhoto = {
  id: string;
  url: string;
  label: string;
  sort_order: number;
};

export type Amenity = {
  id: string;
  /** FK a AmenityCategory (uuid). */
  category: string;
  name: string;
  icon_url: string;
  sort_order: number;
};

/** Categoría con sus amenidades ya anidadas y ordenadas por el backend. */
export type AmenityCategory = {
  id: string;
  name: string;
  sort_order: number;
  amenities: Amenity[];
};

/** El `id` coincide con la carpeta de ruta bajo `app/servicios/`. */
export type AdditionalServiceInfo = {
  id: "spa" | "comida" | "vinos";
  title: string;
  description: string;
  image_url: string;
  price_hint: string;
};

// ---------------------------------------------------------------------------
// proveedores y servicios
// ---------------------------------------------------------------------------

export type SpaMasseuse = {
  id: string;
  name: string;
  status: ProfileStatus;
};

export type FoodMenu = {
  id: string;
  meal_type: MealType;
  name: string;
  price_per_person: Decimal;
};

export type Wine = {
  id: string;
  name: string;
  type: string;
  price: Decimal;
  stock: number;
};

export type WinePackage = {
  id: string;
  name: string;
  price: Decimal;
};

/**
 * Un bloque de hora ofertado. Al huésped el backend ya le oculta los bloques
 * ocupados y los días pasados; el admin ve el inventario completo.
 */
export type SpaAvailability = {
  id: string;
  /** FK a SpaMasseuse (uuid). */
  masseuse: string;
  masseuse_name: string;
  available_date: IsoDate;
  available_time: IsoTime;
  is_booked: boolean;
};

export type FoodAvailability = {
  id: string;
  available_date: IsoDate;
};

// ---------------------------------------------------------------------------
// reservaciones
// ---------------------------------------------------------------------------

/** Datos mínimos del huésped que trae anidados una reservación. */
export type GuestResumen = {
  id: string;
  nombre_completo: string;
  email: string;
};

export type SpaBooking = {
  id: string;
  reservation: string;
  masseuse: string;
  masseuse_name: string;
  date: IsoDate;
  time: IsoTime;
  /** Snapshot del precio al contratar — el servidor lo fija, el cliente nunca lo manda. */
  price_per_hour: Decimal;
};

export type FoodBooking = {
  id: string;
  reservation: string;
  date: IsoDate;
  meal_type: MealType;
  menu: string;
  menu_name: string;
  guests_count: number;
  total_price: Decimal;
};

/** Una línea del pedido: una botella **o** un paquete, nunca ambos. */
export type WineOrderItem = {
  id: string;
  wine: string | null;
  wine_package: string | null;
  /** Nombre del producto (botella o paquete), resuelto por el backend. */
  producto: string | null;
  quantity: number;
  unit_price: Decimal;
};

export type WineOrder = {
  id: string;
  reservation: string;
  total_price: Decimal;
  items: WineOrderItem[];
};

/**
 * Reservación con su desglose de servicios — `/api/reservaciones/reservaciones/`.
 *
 * `subtotal_servicios` y `gran_total` son propiedades derivadas del modelo, no
 * columnas: se calculan sobre los precios ya guardados en cada booking (el
 * snapshot del momento de contratar), no sobre el catálogo vigente.
 */
export type Reservation = {
  id: string;
  guest: GuestResumen;
  check_in: IsoDate;
  check_out: IsoDate;
  noches: number;
  /** FK a FareType (uuid); el nombre legible viene aparte en `fare_type_name`. */
  fare_type: string;
  fare_type_name: string;
  total_amount: Decimal;
  status: ReservationStatus;
  payment_status: PaymentStatus;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
  spa_bookings: SpaBooking[];
  food_bookings: FoodBooking[];
  wine_orders: WineOrder[];
  subtotal_servicios: Decimal;
  gran_total: Decimal;
};

/** Rango ocupado para pintar el calendario — `/api/reservaciones/reservaciones/ocupadas/`. */
export type BookedRange = {
  check_in: IsoDate;
  check_out: IsoDate;
};

// ---------------------------------------------------------------------------
// pagos
// ---------------------------------------------------------------------------

/**
 * Un movimiento de cobro (o reembolso) — `/api/pagos/`.
 *
 * Es la tabla que **no** existía en Supabase, donde el cobro era una sola
 * columna (`reservations.payment_status`), incapaz de registrar un anticipo,
 * un segundo cargo o un reembolso parcial. Ahora la reservación conserva su
 * estado agregado (`Reservation.payment_status`) y esta colección guarda cada
 * movimiento que lo produjo: el estado se **deriva** de los movimientos, nunca
 * se escribe suelto.
 */
export type Payment = {
  id: string;
  reservation: string;
  amount: Decimal;
  status: PaymentStatus;
  provider: PaymentProvider;
  /** Id del PaymentIntent/cargo externo. Vacío mientras el cobro siga simulado. */
  external_reference: string | null;
  notes: string | null;
  created_at: IsoDateTime;
  updated_at: IsoDateTime;
};
