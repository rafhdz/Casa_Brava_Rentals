"use client";

import { useMemo, useState } from "react";
import MarketplaceSearchBar, { type SearchCriteria } from "@/components/MarketplaceSearchBar";
import PropertyCard from "@/components/PropertyCard";
import { COLLECTIONS } from "@/lib/mock/marketplace-data";
import type { CollectionKey, Property } from "@/lib/types/marketplace";

type CollectionFilter = CollectionKey | "todas";

function tabClassName(isActive: boolean): string {
  return `shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "border-neutral-900 bg-neutral-900 text-white"
      : "border-neutral-300 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900"
  }`;
}

// Dueño del estado interactivo de la landing (patrón "page fetch, form
// interactúa" de CLAUDE.md, adaptado a datos mock: app/page.tsx pasa
// PROPERTIES por prop en vez de hacer un fetch de servidor). También aloja las
// pestañas de "Curated Collections": el filtro por colección vive aquí, junto
// al filtro por capacidad, porque ambos deciden qué tarjetas se muestran en la
// misma grilla.
export default function PropertyDirectory({ properties }: { properties: Property[] }) {
  const [minGuests, setMinGuests] = useState(0);
  const [activeCollection, setActiveCollection] = useState<CollectionFilter>("todas");

  function handleSearch(criteria: SearchCriteria) {
    // No hay disponibilidad mock por propiedad, así que la búsqueda solo
    // filtra por capacidad — ver la nota en MarketplaceSearchBar.tsx.
    setMinGuests(criteria.guests.adults + criteria.guests.children);
  }

  const visibleProperties = useMemo(() => {
    const byGuests = properties.filter((property) => property.maxGuests >= minGuests);
    const byCollection =
      activeCollection === "todas"
        ? byGuests
        : byGuests.filter((property) => property.collections.includes(activeCollection));
    return [...byCollection].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
  }, [properties, minGuests, activeCollection]);

  const activeCollectionLabel = COLLECTIONS.find((collection) => collection.key === activeCollection)?.label;

  return (
    <div className="flex flex-col gap-8">
      <MarketplaceSearchBar onSearch={handleSearch} />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <button type="button" onClick={() => setActiveCollection("todas")} className={tabClassName(activeCollection === "todas")}>
          Todas las propiedades
        </button>
        {COLLECTIONS.map((collection) => (
          <button
            key={collection.key}
            type="button"
            onClick={() => setActiveCollection(collection.key)}
            className={tabClassName(activeCollection === collection.key)}
          >
            {collection.label}
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-neutral-900">
            {activeCollectionLabel ?? "Popular en Parras Home Hub"}
          </h3>
          {minGuests > 1 && (
            <p className="text-sm text-neutral-500">Mostrando propiedades para {minGuests}+ huéspedes</p>
          )}
        </div>

        {visibleProperties.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-500">
            Ninguna propiedad listada tiene capacidad para ese número de huéspedes todavía.
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
