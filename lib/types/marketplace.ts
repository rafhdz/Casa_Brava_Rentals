// Contratos del marketplace territorial (Parras Home Hub). Deliberadamente
// separados de lib/api/types.ts: esos tipos describen lo que devuelve Django
// para Casa Brava (Tenant 0); estos describen el directorio de propiedades,
// que hoy es 100% mock (ver lib/mock/marketplace-data.ts) porque el backend
// sigue siendo de una sola propiedad. No convertir uno en otro ni mezclarlos
// en el mismo componente — ver CLAUDE.md, sección "Arquitectura multi-tenant".

export type AccessType = "OPEN" | "INVITE_ONLY";

export type GeoCoordinates = {
  lat: number;
  lng: number;
};

// Calificación desglosada por rubro (1-5). `Property.ratingsAverage` se
// deriva de este objeto en lib/mock/marketplace-data.ts — no son dos fuentes
// de verdad independientes.
export type PropertyRatings = {
  cleanliness: number;
  location: number;
  comfort: number;
  connectivity: number;
};

// Nivel de verificación de identidad del anfitrión, mostrado como badge en
// PropertyCard. Hoy las 4 propiedades del directorio son "C" (nivel de
// entrada): no hay todavía un proceso real de verificación en el backend
// (ver "Arquitectura multi-tenant" en CLAUDE.md), así que este campo es
// puramente informativo/mock, igual que el resto de este archivo.
export type VerificationLevel = "A" | "B" | "C";

// Categorías fijas para agrupar amenidades en el directorio mock. No usar
// lucide-react en este árbol de tipos ni en lib/mock/marketplace-data.ts (ese
// archivo lo importa middleware.ts en el Edge Runtime): el mapeo categoría →
// ícono vive en el componente que lo consume (ver components/PropertyCard.tsx).
export type AmenityCategoryKey = "connectivity" | "wine" | "wellness" | "gastronomy" | "outdoor" | "comfort";

export const AMENITY_CATEGORY_LABELS: Record<AmenityCategoryKey, string> = {
  connectivity: "Conectividad",
  wine: "Vino y cava",
  wellness: "Bienestar",
  gastronomy: "Gastronomía",
  outdoor: "Exterior",
  comfort: "Confort",
};

export type PropertyAmenityGroup = {
  category: AmenityCategoryKey;
  items: string[];
};

// Colecciones curadas que alimentan las pestañas de filtrado rápido de
// PropertyDirectory. Una propiedad puede pertenecer a varias.
export type CollectionKey = "casonas-coloniales" | "vinedos-bodegas" | "retiros-nomadas";

export type Property = {
  id: string;
  slug: string;
  name: string;
  description: string;
  accessType: AccessType;
  basePricePerNight: number;
  securityDeposit: number;
  cleaningFee: number;
  maxGuests: number;
  mainImage?: string;
  images: string[];
  locationName: string;
  coordinates: GeoCoordinates;
  ratingsAverage: number;
  ratings: PropertyRatings;
  verificationLevel: VerificationLevel;
  tags: string[];
  amenityGroups: PropertyAmenityGroup[];
  collections: CollectionKey[];
  isFeatured: boolean;
};

// Un código de invitación solo ENCUENTRA una propiedad INVITE_ONLY (revela su
// slug para navegar ahí) — no crea sesión ni sustituye el login real. Si esa
// propiedad exige sesión, el middleware sigue exigiéndola después de canjear
// el código (ver CLAUDE.md).
export type AccessGrant = {
  propertyId: string;
  inviteCode: string;
  isValid: boolean;
};
