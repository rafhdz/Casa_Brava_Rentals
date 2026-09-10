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
// lib/api/server.ts. Debe seguir siendo JS/TS puro.

import type { AccessGrant, Property } from "@/lib/types/marketplace";

// Única propiedad respaldada por el backend real (Django). Sirve de bisagra
// entre lo mock (este archivo) y lo real (lib/api/, app/actions/checkout.ts):
// cualquier redirect que hoy apuntaba a "/" (home del huésped) pasa a apuntar
// a `/p/${TENANT_ZERO_SLUG}`.
export const TENANT_ZERO_SLUG = "casa-brava";

export const PROPERTIES: Property[] = [
  {
    id: "prop-casa-brava",
    slug: TENANT_ZERO_SLUG,
    name: "Casa Brava",
    description:
      "Casa de 7 habitaciones en el corazón de Parras de la Fuente, ideal para grupos y parejas. Acceso exclusivo por invitación.",
    accessType: "INVITE_ONLY",
    basePricePerNight: 4500,
    securityDeposit: 3000,
    cleaningFee: 500,
    maxGuests: 14,
    mainImage: "/images/de_la_terraza_1.jpeg",
    images: ["/images/de_la_terraza_1.jpeg", "/images/de_la_terraza_2.jpeg", "/images/amarillo_1.jpeg"],
    locationName: "Parras de la Fuente, Coahuila",
    ratingsAverage: 4.9,
    isFeatured: true,
  },
  {
    id: "prop-villa-del-vinedo",
    slug: "villa-del-vinedo",
    name: "Villa del Viñedo",
    description:
      "Villa boutique rodeada de vides, a minutos del centro histórico. Alberca privada y terraza con vista a la sierra.",
    accessType: "OPEN",
    basePricePerNight: 2200,
    securityDeposit: 1000,
    cleaningFee: 300,
    maxGuests: 8,
    images: [],
    locationName: "Parras de la Fuente, Coahuila",
    ratingsAverage: 4.6,
    isFeatured: true,
  },
  {
    id: "prop-casa-de-la-sierra",
    slug: "casa-de-la-sierra",
    name: "Casa de la Sierra",
    description:
      "Casa de campo tradicional al pie de la sierra, perfecta para una escapada tranquila en pareja o familia pequeña.",
    accessType: "OPEN",
    basePricePerNight: 1500,
    securityDeposit: 800,
    cleaningFee: 250,
    maxGuests: 6,
    images: [],
    locationName: "Parras de la Fuente, Coahuila",
    ratingsAverage: 4.4,
    isFeatured: false,
  },
  {
    id: "prop-loft-boutique-centro",
    slug: "loft-boutique-centro",
    name: "Loft Boutique Centro",
    description:
      "Loft moderno a pasos de la plaza principal, ideal para una pareja que quiere caminar entre bodegas y cafés.",
    accessType: "OPEN",
    basePricePerNight: 950,
    securityDeposit: 500,
    cleaningFee: 150,
    maxGuests: 3,
    images: [],
    locationName: "Centro de Parras, Coahuila",
    ratingsAverage: 4.7,
    isFeatured: false,
  },
];

// Códigos de invitación de demostración para Casa Brava. En un backend real
// estos se emitirían por propiedad y con expiración; aquí basta un arreglo
// plano para probar el flujo de canje.
export const ACCESS_GRANTS: AccessGrant[] = [
  { propertyId: "prop-casa-brava", inviteCode: "CASABRAVA2026", isValid: true },
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
