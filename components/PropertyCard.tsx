"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Flame, Lock, MapPin, ShieldCheck, Sparkles, Star, Trees, UtensilsCrossed, Users, Wifi, Wine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatMoney } from "@/lib/format";
import { AMENITY_CATEGORY_LABELS } from "@/lib/types/marketplace";
import type { AmenityCategoryKey, Property } from "@/lib/types/marketplace";

const AMENITY_ICONS: Record<AmenityCategoryKey, LucideIcon> = {
  connectivity: Wifi,
  wine: Wine,
  wellness: Sparkles,
  gastronomy: UtensilsCrossed,
  outdoor: Trees,
  comfort: Flame,
};

// Cadencia del carrusel que se activa al pasar el mouse sobre la tarjeta —
// ver "carrusel de fotos interno en hover" en el rediseño de la landing.
const HOVER_ROTATE_INTERVAL_MS = 1100;

export default function PropertyCard({ property }: { property: Property }) {
  const gallery = property.images.length > 0 ? property.images : property.mainImage ? [property.mainImage] : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (!isHovering || gallery.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % gallery.length);
    }, HOVER_ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isHovering, gallery.length]);

  function handleMouseLeave() {
    setIsHovering(false);
    setActiveIndex(0);
  }

  const currentImage = gallery[activeIndex];
  const featuredAmenities = property.amenityGroups.slice(0, 3);

  return (
    <Link
      href={`/p/${property.slug}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleMouseLeave}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-200">
        {currentImage ? (
          <Image
            key={currentImage}
            src={currentImage}
            alt={property.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 ease-in-out [animation:fade-in_400ms_ease-in-out] group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            Sin fotos todavía
          </div>
        )}

        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
            property.accessType === "OPEN"
              ? "bg-neutral-100/95 text-neutral-600"
              : "bg-neutral-900/95 text-amber-300 ring-1 ring-amber-400/50"
          }`}
        >
          {property.accessType === "OPEN" ? (
            "Acceso abierto"
          ) : (
            <>
              <Lock className="h-3 w-3" strokeWidth={2} aria-hidden />
              Exclusivo por invitación
            </>
          )}
        </span>

        {gallery.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
            {gallery.map((image, index) => (
              <span
                key={image}
                className={`h-1.5 w-1.5 rounded-full transition-colors duration-200 ${
                  index === activeIndex ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-1.5">
          {property.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
              {tag}
            </span>
          ))}
        </div>

        <div>
          <h3 className="text-base font-semibold text-neutral-900">{property.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
            {property.locationName}
          </p>
        </div>

        <div className="flex items-center justify-between text-sm text-neutral-600">
          <span className="flex items-center gap-1.5">
            <Users className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Hasta {property.maxGuests} huéspedes
          </span>
          <span className="flex items-center gap-1 font-medium text-neutral-900">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={1.5} aria-hidden />
            {property.ratingsAverage.toFixed(1)}
          </span>
        </div>

        {featuredAmenities.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-neutral-100 pt-2 text-xs text-neutral-500">
            {featuredAmenities.map((group) => {
              const Icon = AMENITY_ICONS[group.category];
              return (
                <span key={group.category} className="flex items-center gap-1">
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                  {AMENITY_CATEGORY_LABELS[group.category]}
                </span>
              );
            })}
          </div>
        )}

        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <p className="text-sm font-semibold text-neutral-900">
              {formatMoney(property.basePricePerNight)} MXN <span className="font-normal text-neutral-500">/ noche</span>
            </p>
            <p className="text-[11px] text-neutral-400">Precio final, sin cargos ocultos</p>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-neutral-400">
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            Verificación Nivel {property.verificationLevel}
          </span>
        </div>
      </div>
    </Link>
  );
}
