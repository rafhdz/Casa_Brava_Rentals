"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/mock-data";

const AUTO_ROTATE_INTERVAL_MS = 4000;

export default function Carousel({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  function goTo(newIndex: number) {
    setIndex((newIndex + photos.length) % photos.length);
  }

  // Auto-avance cada 4s; se reinicia con cada cambio de foto (manual o automático),
  // así una interacción manual pausa temporalmente el avance automático.
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % photos.length);
    }, AUTO_ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isPaused, index, photos.length]);

  const current = photos[index];

  return (
    <div
      className="w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative h-64 w-full overflow-hidden rounded-2xl bg-white sm:h-80 md:h-96">
        <Image
          key={current.id}
          src={current.url}
          alt={current.label}
          fill
          priority={index === 0}
          sizes="(min-width: 768px) 700px, 100vw"
          className="object-contain [animation:fade-in_700ms_ease-in-out]"
        />

        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label="Foto anterior"
          className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow hover:bg-white"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label="Foto siguiente"
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow hover:bg-white"
        >
          ›
        </button>
      </div>

      <p className="mt-3 text-center text-sm font-medium text-neutral-700">{current.label}</p>

      <div className="mt-2 flex justify-center gap-2">
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
