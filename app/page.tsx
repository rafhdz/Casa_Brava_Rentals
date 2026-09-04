import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Carousel from "@/components/Carousel";
import AmenitiesList from "@/components/AmenitiesList";
import ServiceCard from "@/components/ServiceCard";

export default async function HomePage() {
  const supabase = await createClient();

  // Ordenar por `id` en additional_services_info reproduce a propósito el
  // orden curado que tenía el arreglo ADDITIONAL_SERVICES del mock
  // ("comida" < "spa" < "vinos" alfabéticamente) — no hay columna de orden
  // para esta tabla en el esquema (a diferencia de property_photos y
  // amenity_categories/amenities, que sí la necesitan para preservar un
  // recorrido curado más largo).
  const [{ data: photos }, { data: categories }, { data: services }] = await Promise.all([
    supabase.from("property_photos").select("id, url, label").order("sort_order", { ascending: true }),
    supabase
      .from("amenity_categories")
      .select("id, name, amenities(id, name, icon_url)")
      .order("sort_order", { ascending: true })
      .order("sort_order", { foreignTable: "amenities", ascending: true }),
    supabase
      .from("additional_services_info")
      .select("id, title, description, image_url, price_hint")
      .order("id", { ascending: true }),
  ]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-14 px-4 py-10 sm:px-6">
      <section>
        <Carousel photos={photos ?? []} />
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
          <AmenitiesList categories={categories ?? []} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-neutral-900">
          Servicios adicionales
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(services ?? []).map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </section>
    </div>
  );
}
