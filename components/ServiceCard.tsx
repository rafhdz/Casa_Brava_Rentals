import type { AdditionalService } from "@/lib/mock-data";

export default function ServiceCard({ service }: { service: AdditionalService }) {
  return (
    <div className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex h-32 items-center justify-center rounded-xl bg-neutral-100 text-sm font-medium text-neutral-400">
        Imagen: {service.title}
      </div>
      <h3 className="text-base font-semibold text-neutral-900">{service.title}</h3>
      <p className="mt-1 flex-1 text-sm text-neutral-500">{service.description}</p>
      <p className="mt-3 text-sm font-medium text-neutral-900">{service.priceLabel}</p>
    </div>
  );
}
