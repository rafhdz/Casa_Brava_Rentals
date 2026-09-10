import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Users } from "lucide-react";
import { publicFetchAll } from "@/lib/api/server";
import { formatMoney } from "@/lib/format";
import { getPropertyBySlug, TENANT_ZERO_SLUG } from "@/lib/mock/marketplace-data";
import Carousel from "@/components/Carousel";
import AmenitiesList from "@/components/AmenitiesList";
import ServiceCard from "@/components/ServiceCard";
import type { AdditionalServiceInfo, AmenityCategory, PropertyPhoto } from "@/lib/api/types";

/**
 * Fachada de una propiedad. Bifurca por slug (ver CLAUDE.md, "Arquitectura
 * multi-tenant"):
 *  - `casa-brava` (Tenant 0): fachada real, con el mismo fetch al backend que
 *    tenía el antiguo app/page.tsx — solo se movió de ubicación.
 *  - cualquier otro slug: fachada mock a partir de lib/mock/marketplace-data.ts,
 *    sin ningún fetch al backend (esas propiedades no existen en Django).
 */
export default async function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);

  if (!property) notFound();

  if (slug === TENANT_ZERO_SLUG) {
    return <CasaBravaFacade basePath={`/p/${slug}`} />;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-neutral-200">
        {property.mainImage ? (
          <Image
            src={property.mainImage}
            alt={property.name}
            fill
            sizes="(max-width: 1024px) 100vw, 1024px"
            priority
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
            Sin fotos todavía
          </div>
        )}
      </div>

      <section className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">{property.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">{property.locationName}</p>
          <div className="mt-2 flex items-center gap-1.5 text-sm text-neutral-600">
            <Users className="h-4 w-4" strokeWidth={1.75} aria-hidden />
            Hasta {property.maxGuests} huéspedes
          </div>
        </div>
        <Link
          href={`/p/${slug}/reservar`}
          className="rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
        >
          Reservar ahora
        </Link>
      </section>

      <section>
        <p className="text-sm leading-relaxed text-neutral-600">{property.description}</p>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <p className="text-sm font-medium text-neutral-900">
          Desde {formatMoney(property.basePricePerNight)} MXN por noche
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Depósito de garantía {formatMoney(property.securityDeposit)} MXN · Limpieza{" "}
          {formatMoney(property.cleaningFee)} MXN
        </p>
      </section>
    </div>
  );
}

/**
 * Contenido real de la antigua app/page.tsx, movido tal cual bajo
 * /p/casa-brava. Sigue siendo el único que llama a publicFetchAll: las 3
 * propiedades mock no tienen fotos/amenidades/servicios en el backend.
 */
async function CasaBravaFacade({ basePath }: { basePath: string }) {
  const [photos, categories, services] = await Promise.all([
    publicFetchAll<PropertyPhoto>("/api/propiedades/fotos/"),
    publicFetchAll<AmenityCategory>("/api/propiedades/amenidades/categorias/"),
    publicFetchAll<AdditionalServiceInfo>("/api/propiedades/servicios-info/"),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-10 sm:px-6">
      <section>
        <Carousel photos={photos} />
      </section>

      <section className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900 sm:text-3xl">
            Casa Brava
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Casa de 7 habitaciones en el corazón de Parras de la Fuente, ideal
            para grupos y parejas.
          </p>
        </div>
        <Link
          href={`${basePath}/reservar`}
          className="rounded-full bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
        >
          Reservar ahora
        </Link>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-neutral-900">
          Amenidades de la casa
        </h2>
        <div className="mt-4">
          <AmenitiesList categories={categories} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-neutral-900">
          Servicios adicionales
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} basePath={basePath} />
          ))}
        </div>
      </section>
    </div>
  );
}
