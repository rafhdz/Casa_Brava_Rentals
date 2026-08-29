"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Image from "next/image";
import type { Photo } from "@/lib/mock-data";

const AUTO_ROTATE_INTERVAL_MS = 4000;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.5;

export default function Carousel({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [transformOrigin, setTransformOrigin] = useState("50% 50%");

  // Cambiar de foto (manual o automático) siempre reinicia el zoom y el punto de
  // paneo, en vez de un useEffect separado que dispararía react-hooks/set-state-in-effect (ver CLAUDE.md).
  function goTo(newIndex: number) {
    setIndex((newIndex + photos.length) % photos.length);
    setZoom(1);
    setTransformOrigin("50% 50%");
  }

  function zoomIn() {
    setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP));
  }

  function zoomOut() {
    setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP));
  }

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (zoom <= 1) return;
    const { offsetX, offsetY } = e.nativeEvent;
    const { offsetWidth, offsetHeight } = e.currentTarget;
    const xPercent = (offsetX / offsetWidth) * 100;
    const yPercent = (offsetY / offsetHeight) * 100;
    setTransformOrigin(`${xPercent}% ${yPercent}%`);
  }

  // Auto-avance cada 4s; se reinicia con cada cambio de foto (manual o automático),
  // así una interacción manual pausa temporalmente el avance automático.
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % photos.length);
      setZoom(1);
      setTransformOrigin("50% 50%");
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
      <div
        className={`relative h-64 w-full overflow-hidden rounded-2xl bg-white sm:h-80 md:h-96 ${
          zoom > 1 ? "cursor-crosshair" : ""
        }`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTransformOrigin("50% 50%")}
      >
        <Image
          key={current.id}
          src={current.url}
          alt={current.label}
          fill
          priority={index === 0}
          sizes="(min-width: 768px) 700px, 100vw"
          style={{ transform: `scale(${zoom})`, transformOrigin }}
          className="object-contain transition-transform duration-300 ease-in-out [animation:fade-in_700ms_ease-in-out]"
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

        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX}
            aria-label="Acercar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900/70 text-lg font-medium text-white shadow transition-colors hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
            aria-label="Alejar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900/70 text-lg font-medium text-white shadow transition-colors hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
        </div>
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
