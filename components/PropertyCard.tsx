import Image from "next/image";
import Link from "next/link";
import { Lock, Users } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { Property } from "@/lib/types/marketplace";

// Placeholder gris (sin next/image) para propiedades sin mainImage — ver
// "Placeholders de imágenes" en CLAUDE.md.
export default function PropertyCard({ property }: { property: Property }) {
  return (
    <Link
      href={`/p/${property.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-200">
        {property.mainImage ? (
          <Image
            src={property.mainImage}
            alt={property.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            Sin fotos todavía
          </div>
        )}
        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
            property.accessType === "OPEN"
              ? "bg-white/90 text-neutral-900"
              : "bg-neutral-900/90 text-white"
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
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="text-base font-semibold text-neutral-900">{property.name}</h3>
        <p className="text-sm text-neutral-500">{property.locationName}</p>
        <div className="mt-1 flex items-center gap-1.5 text-sm text-neutral-600">
          <Users className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Hasta {property.maxGuests} huéspedes
        </div>
        <p className="mt-2 text-sm font-semibold text-neutral-900">
          {formatMoney(property.basePricePerNight)} MXN{" "}
          <span className="font-normal text-neutral-500">/ noche</span>
        </p>
      </div>
    </Link>
  );
}
