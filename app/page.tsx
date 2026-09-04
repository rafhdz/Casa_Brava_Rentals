import Link from "next/link";
import { publicFetchAll } from "@/lib/api/server";
import Carousel from "@/components/Carousel";
import AmenitiesList from "@/components/AmenitiesList";
import ServiceCard from "@/components/ServiceCard";
import type { AdditionalServiceInfo, AmenityCategory, PropertyPhoto } from "@/lib/api/types";

// El contenido del Home (fotos, amenidades y tarjetas de servicios) es de
// lectura pública en el backend, así que se pide con `publicFetchAll`: manda
// el token si hay sesión, pero no la exige. Los tres endpoints declaran
// `pagination_class = None` y devuelven arreglos planos, ya ordenados por el
// `sort_order` que preserva el recorrido curado de la casa — el frontend no
// reordena nada.
export default async function HomePage() {
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
          href="/reservar"
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
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </section>
    </div>
  );
}
