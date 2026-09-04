import type { Tables } from "@/lib/database.types";

export type Amenity = Pick<Tables<"amenities">, "id" | "name" | "icon_url">;
export type AmenityCategory = Pick<Tables<"amenity_categories">, "id" | "name"> & {
  amenities: Amenity[];
};

export default function AmenitiesList({ categories }: { categories: AmenityCategory[] }) {
  return (
    <div className="flex flex-col gap-8">
      {categories.map((category) => (
        <div key={category.id}>
          <h3 className="text-sm font-semibold text-neutral-900">{category.name}</h3>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {category.amenities.map((amenity) => (
              <li
                key={amenity.id}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático de public/, no requiere el optimizador de next/image */}
                <img src={amenity.icon_url} alt="" aria-hidden className="h-5 w-5 shrink-0 opacity-80" />
                <span className="text-sm font-medium text-neutral-700">{amenity.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
