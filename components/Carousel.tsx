"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import type { Photo } from "@/lib/mock-data";

const AUTO_ROTATE_INTERVAL_MS = 4000;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.5;
const WHEEL_ZOOM_STEP = 0.15;
const DOUBLE_CLICK_ZOOM = 2.5;

function clampZoom(value: number) {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
}

function originFromPoint(clientX: number, clientY: number, target: Element) {
  const rect = target.getBoundingClientRect();
  const xPercent = ((clientX - rect.left) / rect.width) * 100;
  const yPercent = ((clientY - rect.top) / rect.height) * 100;
  return `${xPercent}% ${yPercent}%`;
}

export default function Carousel({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [transformOrigin, setTransformOrigin] = useState("50% 50%");
  const [isPanning, setIsPanning] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  // Cambiar de foto (manual o automático) siempre reinicia el zoom y el punto de
  // paneo, en vez de un useEffect separado que dispararía react-hooks/set-state-in-effect (ver CLAUDE.md).
  function goTo(newIndex: number) {
    setIndex((newIndex + photos.length) % photos.length);
    setZoom(1);
    setTransformOrigin("50% 50%");
  }

  function zoomIn() {
    setZoom((z) => clampZoom(z + ZOOM_STEP));
  }

  function zoomOut() {
    setZoom((z) => clampZoom(z - ZOOM_STEP));
  }

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    if (zoom <= 1) return;
    setTransformOrigin(originFromPoint(e.clientX, e.clientY, e.currentTarget));
  }

  // Doble clic alterna entre zoom normal y un acercamiento rápido centrado en el
  // punto donde se hizo clic, para una vista rápida sin depender de los botones.
  function handleDoubleClick(e: MouseEvent<HTMLDivElement>) {
    if (zoom > 1) {
      setZoom(1);
      setTransformOrigin("50% 50%");
      return;
    }
    setTransformOrigin(originFromPoint(e.clientX, e.clientY, e.currentTarget));
    setZoom(DOUBLE_CLICK_ZOOM);
  }

  // Los controles flotantes viven dentro del contenedor que escucha onMouseMove para el
  // paneo; sin detener la propagación aquí, interactuar con ellos también movería o
  // haría zoom sobre la imagen debajo y hace casi imposible atinarle a los controles.
  function stopBubbling(e: MouseEvent<HTMLElement>) {
    e.stopPropagation();
  }

  // Rueda del mouse controla el zoom con el cursor sobre la imagen. Se usa un listener
  // nativo (no onWheel de React) con { passive: false } porque React trata los eventos
  // wheel como pasivos por defecto y no permite preventDefault() ahí; lo necesitamos para
  // bloquear el scroll de la página mientras se hace zoom sobre la foto.
  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;

    function handleWheel(e: WheelEvent) {
      if (!node) return;
      e.preventDefault();
      setTransformOrigin(originFromPoint(e.clientX, e.clientY, node));
      setZoom((z) => clampZoom(z + (e.deltaY > 0 ? -WHEEL_ZOOM_STEP : WHEEL_ZOOM_STEP)));
    }

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, []);

  // Si se suelta el botón del mouse fuera del contenedor, el cursor de "grabbing"
  // se quedaría atorado sin este listener global.
  useEffect(() => {
    if (!isPanning) return;
    function stopPanning() {
      setIsPanning(false);
    }
    window.addEventListener("mouseup", stopPanning);
    return () => window.removeEventListener("mouseup", stopPanning);
  }, [isPanning]);

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
  const isZoomed = zoom > 1;
  const cursorClass = isZoomed ? (isPanning ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in";

  return (
    <div
      className="w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        ref={frameRef}
        className={`relative h-64 w-full select-none overflow-hidden rounded-2xl bg-white sm:h-80 md:h-96 ${cursorClass}`}
        onMouseMove={handleMouseMove}
        onMouseDown={() => isZoomed && setIsPanning(true)}
        onMouseUp={() => setIsPanning(false)}
        onMouseLeave={() => {
          setTransformOrigin("50% 50%");
          setIsPanning(false);
        }}
        onDoubleClick={handleDoubleClick}
      >
        <Image
          key={current.id}
          src={current.url}
          alt={current.label}
          fill
          priority={index === 0}
          sizes="(min-width: 768px) 700px, 100vw"
          style={{ transform: `scale(${zoom})`, transformOrigin }}
          className="object-contain transition-transform duration-200 ease-out [animation:fade-in_700ms_ease-in-out]"
        />

        <button
          type="button"
          onClick={() => goTo(index - 1)}
          onMouseDown={stopBubbling}
          aria-label="Foto anterior"
          className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow transition-all duration-200 ease-in-out hover:scale-110 hover:bg-white active:scale-95"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          onMouseDown={stopBubbling}
          aria-label="Foto siguiente"
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-700 shadow transition-all duration-200 ease-in-out hover:scale-110 hover:bg-white active:scale-95"
        >
          <ChevronRight className="h-5 w-5" strokeWidth={2} aria-hidden />
        </button>

        <div
          className="absolute right-3 top-3 z-10 flex cursor-default flex-col gap-2 pointer-events-auto"
          onMouseMove={stopBubbling}
          onMouseEnter={stopBubbling}
          onMouseDown={stopBubbling}
          onDoubleClick={stopBubbling}
        >
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= ZOOM_MAX}
            aria-label="Acercar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900/70 text-white shadow transition-all duration-200 ease-in-out hover:scale-110 hover:bg-neutral-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            <ZoomIn className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= ZOOM_MIN}
            aria-label="Alejar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900/70 text-white shadow transition-all duration-200 ease-in-out hover:scale-110 hover:bg-neutral-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          >
            <ZoomOut className="h-4 w-4" strokeWidth={2} aria-hidden />
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
            className={`h-2 w-2 rounded-full transition-all duration-200 ease-in-out hover:scale-125 ${
              i === index ? "bg-neutral-900" : "bg-neutral-300 hover:bg-neutral-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
