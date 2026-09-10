// Contratos del marketplace territorial (Parras Home Hub). Deliberadamente
// separados de lib/api/types.ts: esos tipos describen lo que devuelve Django
// para Casa Brava (Tenant 0); estos describen el directorio de propiedades,
// que hoy es 100% mock (ver lib/mock/marketplace-data.ts) porque el backend
// sigue siendo de una sola propiedad. No convertir uno en otro ni mezclarlos
// en el mismo componente — ver CLAUDE.md, sección "Arquitectura multi-tenant".

export type AccessType = "OPEN" | "INVITE_ONLY";

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
  ratingsAverage: number;
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
