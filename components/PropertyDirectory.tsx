"use client";

import { useMemo, useState } from "react";
import MarketplaceSearchBar, { type SearchCriteria } from "@/components/MarketplaceSearchBar";
import PropertyCard from "@/components/PropertyCard";
import type { Property } from "@/lib/types/marketplace";

// Dueño del estado interactivo de la landing (patrón "page fetch, form
// interactúa" de CLAUDE.md, adaptado a datos mock: app/page.tsx pasa
// PROPERTIES por prop en vez de hacer un fetch de servidor).
export default function PropertyDirectory({ properties }: { properties: Property[] }) {
  const [minGuests, setMinGuests] = useState(0);

  function handleSearch(criteria: SearchCriteria) {
    // No hay disponibilidad mock por propiedad, así que la búsqueda solo
    // filtra por capacidad — ver la nota en MarketplaceSearchBar.tsx.
    setMinGuests(criteria.guests.adults + criteria.guests.children);
  }

  const visibleProperties = useMemo(() => {
    const filtered = properties.filter((property) => property.maxGuests >= minGuests);
    return [...filtered].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  }, [properties, minGuests]);

  return (
    <div className="flex flex-col gap-8">
      <MarketplaceSearchBar onSearch={handleSearch} />

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900">Popular en PHH</h2>
          {minGuests > 1 && (
            <p className="text-sm text-neutral-500">
              Mostrando propiedades para {minGuests}+ huéspedes
            </p>
          )}
        </div>

        {visibleProperties.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-500">
            Ninguna propiedad listada tiene capacidad para ese número de
            huéspedes todavía.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
