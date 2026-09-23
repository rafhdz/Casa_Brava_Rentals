// Datos mock del directorio territorial (Parras Home Hub). Frontera dura con
// lib/api/: nada de aquí llama a serverFetch/serverFetchAll ni a los Server
// Actions de app/actions/checkout.ts. Las 3 propiedades ficticias no existen
// en Django — tratarlas como si tuvieran un backend real (mandar su `id` a
// checkoutStay, por ejemplo) produciría un 404/400 real o, peor, crearía una
// reservación a nombre de una propiedad que no existe ahí. Ver CLAUDE.md,
// sección "Arquitectura multi-tenant", para el porqué completo.
//
// Este archivo también se importa desde middleware.ts (Edge Runtime): no
// agregar aquí ningún import de Node (`fs`, `path`), de `next/headers` ni de
// lib/api/server.ts, ni de lucide-react (el mapeo ícono↔categoría vive en el
// componente que lo consume). Debe seguir siendo JS/TS puro.

import type { AccessGrant, CollectionKey, Property, PropertyRatings } from "@/lib/types/marketplace";

// Única propiedad respaldada por el backend real (Django). Sirve de bisagra
// entre lo mock (este archivo) y lo real (lib/api/, app/actions/checkout.ts):
// cualquier redirect que hoy apuntaba a "/" (home del huésped) pasa a apuntar
// a `/p/${TENANT_ZERO_SLUG}`.
export const TENANT_ZERO_SLUG = "casa-brava";

// Metadatos de las colecciones curadas que alimentan las pestañas de
// PropertyDirectory. El filtrado en sí vive en el componente (es lógica de
// presentación, no dato); aquí solo se nombra y describe cada colección.
export const COLLECTIONS: { key: CollectionKey; label: string; description: string }[] = [
  {
    key: "casonas-coloniales",
    label: "Casonas Coloniales",
    description: "Cascos históricos restaurados en el corazón de Parras.",
  },
  {
    key: "vinedos-bodegas",
    label: "Viñedos & Bodegas",
    description: "Propiedades con cava propia o viñedo en el mismo predio.",
  },
  {
    key: "retiros-nomadas",
    label: "Retiros de Media Semana / Nómadas Digitales",
    description: "Conectividad de alta velocidad para trabajar y quedarse unos días más.",
  },
];

// Redondea el promedio a 1 decimal para que `ratingsAverage` (mostrado en
// PropertyCard) nunca se desincronice a mano del desglose por rubro.
function averageRating(ratings: PropertyRatings): number {
  const values = Object.values(ratings);
  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

const CASA_BRAVA_RATINGS: PropertyRatings = { cleanliness: 4.9, location: 4.8, comfort: 4.9, connectivity: 4.6 };
const HACIENDA_SAN_LORENZO_RATINGS: PropertyRatings = { cleanliness: 4.8, location: 4.9, comfort: 4.9, connectivity: 4.5 };
const QUINTA_LOS_NOGALES_RATINGS: PropertyRatings = { cleanliness: 4.7, location: 4.5, comfort: 4.8, connectivity: 4.9 };
const LOFT_SANTO_MADERO_RATINGS: PropertyRatings = { cleanliness: 4.8, location: 4.9, comfort: 4.6, connectivity: 4.8 };

export const PROPERTIES: Property[] = [
  {
    id: "prop-casa-brava",
    slug: TENANT_ZERO_SLUG,
    name: "Casa Brava",
    description:
      "Reserva histórica del casco antiguo de Parras, con cava subterránea propia y jardines centenarios. Acceso exclusivo por invitación para grupos y familias que buscan privacidad absoluta.",
    accessType: "INVITE_ONLY",
    basePricePerNight: 4500,
    securityDeposit: 3000,
    cleaningFee: 500,
    maxGuests: 10,
    mainImage: "/images/de_la_terraza_1.jpeg",
    images: ["/images/de_la_terraza_1.jpeg", "/images/principal_1.jpeg", "/images/jardin_1.jpeg", "/images/amarillo_1.jpeg"],
    locationName: "Centro Histórico, Parras de la Fuente",
    coordinates: { lat: 25.4372, lng: -102.1782 },
    ratings: CASA_BRAVA_RATINGS,
    ratingsAverage: averageRating(CASA_BRAVA_RATINGS),
    verificationLevel: "C",
    tags: ["Reserva Histórica", "Cava Subterránea", "Exclusivo por Invitación"],
    amenityGroups: [
      { category: "wine", items: ["Cava subterránea con más de 200 etiquetas", "Cata guiada a solicitud"] },
      { category: "outdoor", items: ["Jardín central con fuente colonial", "Terraza techada para eventos"] },
      { category: "comfort", items: ["Chimenea de piedra en sala principal", "7 habitaciones climatizadas"] },
      { category: "connectivity", items: ["Internet de alta velocidad", "Smart TV en áreas comunes"] },
    ],
    collections: ["casonas-coloniales", "vinedos-bodegas"],
    isFeatured: true,
  },
  {
    id: "prop-hacienda-san-lorenzo",
    slug: "hacienda-san-lorenzo",
    name: "Hacienda San Lorenzo Reserve",
    description:
      "Casco de hacienda del siglo XVIII restaurado, con viñedo propio y alberca termal alimentada por manantial natural. Arquerías de cantera y salón de barricas para catas privadas.",
    accessType: "OPEN",
    basePricePerNight: 14500,
    securityDeposit: 5000,
    cleaningFee: 900,
    maxGuests: 12,
    mainImage: "/images/jardin_2.jpeg",
    images: [
      "/images/jardin_2.jpeg",
      "/images/terraza_1.jpeg",
      "/images/de_la_fuente_1.jpeg",
      "/images/jardin_3.jpeg",
      "/images/terraza_2.jpeg",
    ],
    locationName: "Valle de Parras, Coahuila",
    coordinates: { lat: 25.4506, lng: -102.169 },
    ratings: HACIENDA_SAN_LORENZO_RATINGS,
    ratingsAverage: averageRating(HACIENDA_SAN_LORENZO_RATINGS),
    verificationLevel: "C",
    tags: ["Viñedo Propio", "Arquitectura Siglo XVIII", "Alberca Termal"],
    amenityGroups: [
      { category: "wine", items: ["Viñedo propio de 3 hectáreas", "Sala de barricas para catas privadas"] },
      { category: "wellness", items: ["Alberca termal climatizada todo el año", "Circuito de spa botánico"] },
      { category: "outdoor", items: ["Arquerías de cantera del siglo XVIII", "Huerto de olivos centenarios"] },
      { category: "connectivity", items: ["Wifi de fibra óptica en toda la propiedad"] },
    ],
    collections: ["casonas-coloniales", "vinedos-bodegas"],
    isFeatured: true,
  },
  {
    id: "prop-quinta-los-nogales",
    slug: "quinta-los-nogales",
    name: "Quinta Los Nogales",
    description:
      "Quinta campestre bajo un huerto de nogales de cuarenta años, pensada para retiros ejecutivos y estancias de trabajo remoto. Internet satelital Starlink y chimenea de cantera para las noches frescas de la sierra.",
    accessType: "OPEN",
    basePricePerNight: 9200,
    securityDeposit: 3000,
    cleaningFee: 650,
    maxGuests: 8,
    mainImage: "/images/amarillo_2.jpeg",
    images: ["/images/amarillo_2.jpeg", "/images/sala_tv_1.jpeg", "/images/del_mezzanine_1.jpeg", "/images/amarillo_3.jpeg"],
    locationName: "Ejido Santa María, Parras de la Fuente",
    coordinates: { lat: 25.429, lng: -102.1865 },
    ratings: QUINTA_LOS_NOGALES_RATINGS,
    ratingsAverage: averageRating(QUINTA_LOS_NOGALES_RATINGS),
    verificationLevel: "C",
    tags: ["Huerto de Nogales", "Workation / Starlink", "Chimenea de Cantera"],
    amenityGroups: [
      { category: "connectivity", items: ["Internet satelital Starlink", "Escritorios ergonómicos para trabajo remoto"] },
      { category: "outdoor", items: ["Huerto de nogales de 40 años", "Asador de leña bajo pérgola"] },
      { category: "comfort", items: ["Chimenea de cantera en sala principal", "Calefacción de piso en habitaciones"] },
    ],
    collections: ["retiros-nomadas"],
    isFeatured: false,
  },
  {
    id: "prop-loft-santo-madero",
    slug: "loft-santo-madero",
    name: "Loft Boutique Callejón del Santo Madero",
    description:
      "Loft contemporáneo de dos niveles sobre un callejón empedrado del centro, con vista panorámica a los campanarios de Parras y una cava privada climatizada. Ideal para una pareja o una estancia corta de trabajo remoto.",
    accessType: "OPEN",
    basePricePerNight: 4800,
    securityDeposit: 1500,
    cleaningFee: 400,
    maxGuests: 4,
    mainImage: "/images/de_mane_1.jpeg",
    images: ["/images/de_mane_1.jpeg", "/images/de_mane_2.jpeg", "/images/ent_principal_lat_1.jpeg", "/images/de_mane_3.jpeg"],
    locationName: "Callejón del Santo Madero, Centro de Parras",
    coordinates: { lat: 25.4381, lng: -102.1775 },
    ratings: LOFT_SANTO_MADERO_RATINGS,
    ratingsAverage: averageRating(LOFT_SANTO_MADERO_RATINGS),
    verificationLevel: "C",
    tags: ["Vista Panorámica", "Diseño Contemporáneo", "Cava Privada"],
    amenityGroups: [
      { category: "wine", items: ["Cava privada climatizada para 60 botellas"] },
      { category: "connectivity", items: ["Internet de fibra de alta velocidad", "Estación de trabajo con monitor externo"] },
      { category: "comfort", items: ["Vista panorámica al centro histórico", "Diseño interior contemporáneo minimalista"] },
    ],
    collections: ["vinedos-bodegas", "retiros-nomadas"],
    isFeatured: false,
  },
];

// Códigos de invitación de demostración para Casa Brava. En un backend real
// estos se emitirían por propiedad y con expiración; aquí basta un arreglo
// plano para probar el flujo de canje.
export const ACCESS_GRANTS: AccessGrant[] = [
  { propertyId: "prop-casa-brava", inviteCode: "BRAVA2026", isValid: true },
  { propertyId: "prop-casa-brava", inviteCode: "FAMILIA-RUIZ", isValid: true },
  { propertyId: "prop-casa-brava", inviteCode: "CODIGO-EXPIRADO", isValid: false },
];

export function getPropertyBySlug(slug: string): Property | undefined {
  return PROPERTIES.find((property) => property.slug === slug);
}

// Usado por middleware.ts para decidir si `/p/<slug>/**` exige sesión. Un
// slug que no existe en PROPERTIES no se considera protegido aquí — la
// propia página responde con notFound(), no el middleware.
export function isInviteOnlyBySlug(slug: string): boolean {
  return getPropertyBySlug(slug)?.accessType === "INVITE_ONLY";
}

// Canjea un código de invitación: si coincide con un AccessGrant vigente,
// devuelve la propiedad a la que da acceso (para navegar a `/p/<slug>`) — NO
// crea sesión. Si esa propiedad exige login, el middleware lo sigue exigiendo
// después de este canje (ver lib/types/marketplace.ts).
export function validateInviteCode(code: string): Property | null {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const grant = ACCESS_GRANTS.find(
    (candidate) => candidate.isValid && candidate.inviteCode.toUpperCase() === normalized
  );
  if (!grant) return null;

  return PROPERTIES.find((property) => property.id === grant.propertyId) ?? null;
}
