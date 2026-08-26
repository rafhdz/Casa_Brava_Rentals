"use client";

import { useState } from "react";
import type { Photo } from "@/lib/mock-data";

export default function Carousel({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState(0);

  function goTo(newIndex: number) {
    setIndex((newIndex + photos.length) % photos.length);
  }

  const current = photos[index];

  return (
    <div className="w-full">
      <div className="relative flex h-56 w-full items-center justify-center rounded-2xl bg-neutral-200 sm:h-80 md:h-[26rem]">
        <span className="text-lg font-medium text-neutral-500">{current.label}</span>

        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label="Foto anterior"
          className="absolute left-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow hover:bg-white"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label="Foto siguiente"
          className="absolute right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow hover:bg-white"
        >
          ›
        </button>
      </div>

      <div className="mt-3 flex justify-center gap-2">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            type="button"
            aria-label={`Ir a ${photo.label}`}
            onClick={() => goTo(i)}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === index ? "bg-neutral-900" : "bg-neutral-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
