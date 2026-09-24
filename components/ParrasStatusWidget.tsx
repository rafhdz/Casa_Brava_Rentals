import type { LucideIcon } from "lucide-react";
import {
  Church,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Flame,
  Grape,
  Scissors,
  Sparkles,
  Sun,
  Utensils,
  Wine,
} from "lucide-react";
import { getParrasWeather } from "@/lib/weather";
import type { WeatherIconKey } from "@/lib/weather";
import { getParrasMonthlyEvent } from "@/lib/parras-events";
import type { ParrasEventIconKey } from "@/lib/parras-events";

// Mapeo clave de ícono → componente de lucide-react. Vive aquí y no en
// lib/weather.ts, mismo patrón que AMENITY_ICONS en PropertyCard.tsx: ese
// archivo hace fetch y no debe depender de lucide-react.
const WEATHER_ICONS: Record<WeatherIconKey, LucideIcon> = {
  sun: Sun,
  "cloud-sun": CloudSun,
  cloud: Cloud,
  "cloud-fog": CloudFog,
  "cloud-drizzle": CloudDrizzle,
  "cloud-rain": CloudRain,
  "cloud-lightning": CloudLightning,
  "cloud-snow": CloudSnow,
};

// Mismo patrón para el catálogo mensual de lib/parras-events.ts: ese archivo
// tampoco depende de lucide-react.
const EVENT_ICONS: Record<ParrasEventIconKey, LucideIcon> = {
  scissors: Scissors,
  sparkles: Sparkles,
  sun: Sun,
  church: Church,
  flame: Flame,
  grape: Grape,
  wine: Wine,
  utensils: Utensils,
};

// Tarjeta "Parras de la Fuente, hoy" del hero de la landing (app/page.tsx).
// Server Component async: hace su propio fetch a Open-Meteo (vía
// lib/weather.ts, con caché ISR de 1 hora y fallback estacional silencioso)
// en vez de recibir los datos por props — no hay ningún estado de cliente que
// justifique el patrón "page fetch, form interactúa" de CLAUDE.md, así que
// vive autocontenido, igual que checkTenantZeroChannel() en
// app/supplier/page.tsx. Puede montarse dentro de cualquier Server Component
// sin que el padre necesite volverse async ni pasarle props.
//
// Dos filas, dos fuentes distintas: la primera (clima) es en vivo, vía
// getParrasWeather(); la segunda (evento/ciclo del mes) es contenido
// editorial puro y sincrónico, resuelto con getParrasMonthlyEvent() contra
// el catálogo de 12 meses de lib/parras-events.ts, indexado por
// `new Date().getMonth()` — no depende de ningún fetch ni puede fallar.
export default async function ParrasStatusWidget() {
  const weather = await getParrasWeather();
  const monthlyEvent = getParrasMonthlyEvent();
  const WeatherIcon = WEATHER_ICONS[weather.icon];
  const EventIcon = EVENT_ICONS[monthlyEvent.icon];

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm [animation:fade-in_400ms_ease-in-out]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Parras de la Fuente, hoy</p>
        {weather.isLive ? (
          <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            En vivo
          </span>
        ) : (
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
            Dato de temporada
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
          <WeatherIcon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-neutral-900">
            {weather.currentTemp}°C · {weather.conditionLabel}
          </p>
          <p className="text-xs text-neutral-500">
            Mínima {weather.minTemp}°C — máxima {weather.maxTemp}°C hoy
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-neutral-100 pt-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
          <EventIcon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        </span>
        <div>
          <p className="text-sm font-semibold text-neutral-900">{monthlyEvent.title}</p>
          <p className="text-xs text-neutral-500">{monthlyEvent.detail}</p>
        </div>
      </div>
    </div>
  );
}
