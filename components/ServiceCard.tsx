import Image from "next/image";
import Link from "next/link";
import type { AdditionalServiceInfo } from "@/lib/api/types";

// El `id` de cada servicio ("spa" | "comida" | "vinos") coincide con la
// carpeta de ruta bajo app/p/[slug]/servicios/ — el backend lo garantiza con
// un check constraint, así que este enlace nunca puede apuntar a una página
// inexistente. `basePath` lo resuelve quien llama (hoy siempre
// `/p/${TENANT_ZERO_SLUG}`, ya que este contenido sale del backend real y
// solo existe para Casa Brava).
export type AdditionalService = AdditionalServiceInfo;

export default function ServiceCard({
  service,
  basePath,
}: {
  service: AdditionalService;
  basePath: string;
}) {
  return (
    <div className="group flex flex-col rounded-2xl border border-neutral-200 bg-white p-5 transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg">
      <div className="relative mb-4 h-48 overflow-hidden rounded-xl bg-neutral-100">
        <Image
          src={service.image_url}
          alt={service.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-neutral-900/0 transition-colors duration-300 ease-in-out group-hover:bg-neutral-900/10" />
      </div>
      <h3 className="text-base font-semibold text-neutral-900">{service.title}</h3>
      <p className="mt-1 flex-1 text-sm text-neutral-500">{service.description}</p>
      <p className="mt-3 text-sm font-medium text-neutral-900">{service.price_hint}</p>
      <Link
        href={`${basePath}/servicios/${service.id}`}
        className="mt-4 inline-flex items-center justify-center rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:bg-neutral-700 active:scale-95"
      >
        Reservar
      </Link>
    </div>
  );
}
