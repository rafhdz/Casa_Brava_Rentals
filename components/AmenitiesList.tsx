import type { Amenity } from "@/lib/mock-data";

export default function AmenitiesList({ amenities }: { amenities: Amenity[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {amenities.map((amenity) => (
        <li
          key={amenity.id}
          className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3"
        >
          <span className="text-xl" aria-hidden>
            {amenity.icon}
          </span>
          <span className="text-sm font-medium text-neutral-700">{amenity.label}</span>
        </li>
      ))}
    </ul>
  );
}
