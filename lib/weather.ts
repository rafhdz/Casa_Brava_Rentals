// Clima en vivo de Parras de la Fuente (Open-Meteo) + cálculo del ciclo
// enológico del mes. Vive en lib/ y no en components/ porque hace I/O real
// (fetch) — lo consume components/ParrasStatusWidget.tsx, un Server Component
// async. A diferencia de lib/mock/marketplace-data.ts, nada de aquí lo
// importa middleware.ts (Edge Runtime), así que sí puede depender de fetch
// con opciones de Node/Next sin restricción.
//
// Es la única llamada saliente del frontend que no es a la API de Django: un
// clima público, de solo lectura, sin datos de negocio ni de sesión — no
// rompe la regla de "el frontend no reimplementa reglas de negocio" (ver
// CLAUDE.md, "Qué es este proyecto"), porque no hay ninguna regla de negocio
// aquí, solo contenido editorial en vivo para el hero de la landing.

export type WeatherIconKey =
  | "sun"
  | "cloud-sun"
  | "cloud"
  | "cloud-fog"
  | "cloud-drizzle"
  | "cloud-rain"
  | "cloud-lightning"
  | "cloud-snow";

export type ParrasWeather = {
  conditionLabel: string;
  icon: WeatherIconKey;
  currentTemp: number;
  minTemp: number;
  maxTemp: number;
  /** false cuando la llamada a Open-Meteo falló y se usó el dato de temporada. */
  isLive: boolean;
};

export type VendimiaPhase = {
  label: string;
  description: string;
};

const PARRAS_LATITUDE = 25.4417;
const PARRAS_LONGITUDE = -102.1831;

const OPEN_METEO_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${PARRAS_LATITUDE}&longitude=${PARRAS_LONGITUDE}` +
  `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;

// Se abandona la petición si Open-Meteo no responde en este tiempo, para que
// el hero nunca quede esperando una red lenta — cae al dato de temporada.
const FETCH_TIMEOUT_MS = 5000;

// Códigos WMO que devuelve `current.weather_code` / `daily`, mapeados a un
// copy en español pensado para huéspedes (no la nomenclatura técnica de la
// OMM) y a la clave de ícono que resuelve ParrasStatusWidget.tsx — el mapeo
// ícono↔clave vive ahí, no aquí, mismo patrón que AMENITY_ICONS en
// PropertyCard.tsx: este archivo no importa lucide-react.
const WEATHER_CODE_MAP: Record<number, { label: string; icon: WeatherIconKey }> = {
  0: { label: "Cielo despejado", icon: "sun" },
  1: { label: "Mayormente despejado", icon: "cloud-sun" },
  2: { label: "Parcialmente nublado", icon: "cloud-sun" },
  3: { label: "Cielo nublado", icon: "cloud" },
  45: { label: "Niebla", icon: "cloud-fog" },
  48: { label: "Niebla con escarcha", icon: "cloud-fog" },
  51: { label: "Llovizna ligera", icon: "cloud-drizzle" },
  53: { label: "Llovizna moderada", icon: "cloud-drizzle" },
  55: { label: "Llovizna densa", icon: "cloud-drizzle" },
  56: { label: "Llovizna helada ligera", icon: "cloud-drizzle" },
  57: { label: "Llovizna helada densa", icon: "cloud-drizzle" },
  61: { label: "Lluvia ligera", icon: "cloud-rain" },
  63: { label: "Lluvia moderada", icon: "cloud-rain" },
  65: { label: "Lluvia intensa", icon: "cloud-rain" },
  66: { label: "Lluvia helada ligera", icon: "cloud-rain" },
  67: { label: "Lluvia helada intensa", icon: "cloud-rain" },
  71: { label: "Nevada ligera", icon: "cloud-snow" },
  73: { label: "Nevada moderada", icon: "cloud-snow" },
  75: { label: "Nevada intensa", icon: "cloud-snow" },
  77: { label: "Granizo fino", icon: "cloud-snow" },
  80: { label: "Chubascos ligeros", icon: "cloud-rain" },
  81: { label: "Chubascos moderados", icon: "cloud-rain" },
  82: { label: "Chubascos violentos", icon: "cloud-rain" },
  85: { label: "Chubascos de nieve ligeros", icon: "cloud-snow" },
  86: { label: "Chubascos de nieve intensos", icon: "cloud-snow" },
  95: { label: "Tormenta eléctrica", icon: "cloud-lightning" },
  96: { label: "Tormenta con granizo ligero", icon: "cloud-lightning" },
  99: { label: "Tormenta con granizo intenso", icon: "cloud-lightning" },
};

const UNKNOWN_CODE_FALLBACK = { label: "Clima variable", icon: "cloud-sun" as WeatherIconKey };

// Rangos de temperatura típicos de Parras de la Fuente por temporada, usados
// únicamente si Open-Meteo no responde a tiempo (timeout) o devuelve un
// payload inesperado — ver "Manejo de Fallbacks". Nunca se lanza un error
// hacia el caller: getParrasWeather() siempre resuelve con datos mostrables.
function getSeasonalFallback(monthIndex: number): ParrasWeather {
  if (monthIndex >= 5 && monthIndex <= 8) {
    return {
      conditionLabel: "Verano cálido de temporada",
      icon: "sun",
      currentTemp: 29,
      minTemp: 24,
      maxTemp: 34,
      isLive: false,
    };
  }
  if (monthIndex >= 11 || monthIndex <= 1) {
    return {
      conditionLabel: "Invierno fresco de temporada",
      icon: "cloud-sun",
      currentTemp: 11,
      minTemp: 4,
      maxTemp: 18,
      isLive: false,
    };
  }
  return {
    conditionLabel: "Clima templado de temporada",
    icon: "cloud-sun",
    currentTemp: 20,
    minTemp: 14,
    maxTemp: 26,
    isLive: false,
  };
}

type OpenMeteoResponse = {
  current?: { temperature_2m?: number; weather_code?: number };
  daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] };
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// Fetch a Open-Meteo con caché ISR de 1 hora. Nunca lanza: cualquier fallo de
// red, timeout o payload inesperado cae al dato de temporada de
// getSeasonalFallback(), para que el hero de la landing nunca se rompa por un
// tercero caído.
export async function getParrasWeather(): Promise<ParrasWeather> {
  const monthIndex = new Date().getMonth();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(OPEN_METEO_URL, {
      next: { revalidate: 3600 },
      signal: controller.signal,
    });

    if (!response.ok) {
      return getSeasonalFallback(monthIndex);
    }

    const data = (await response.json()) as OpenMeteoResponse;
    const currentTemp = data.current?.temperature_2m;
    const weatherCode = data.current?.weather_code;
    const maxTemp = data.daily?.temperature_2m_max?.[0];
    const minTemp = data.daily?.temperature_2m_min?.[0];

    if (
      !isFiniteNumber(currentTemp) ||
      !isFiniteNumber(weatherCode) ||
      !isFiniteNumber(maxTemp) ||
      !isFiniteNumber(minTemp)
    ) {
      return getSeasonalFallback(monthIndex);
    }

    const mapped = WEATHER_CODE_MAP[weatherCode] ?? UNKNOWN_CODE_FALLBACK;

    return {
      conditionLabel: mapped.label,
      icon: mapped.icon,
      currentTemp: Math.round(currentTemp),
      minTemp: Math.round(minTemp),
      maxTemp: Math.round(maxTemp),
      isLive: true,
    };
  } catch {
    // Red caída, timeout (AbortError) o JSON inválido: mismo desenlace.
    return getSeasonalFallback(monthIndex);
  } finally {
    clearTimeout(timeoutId);
  }
}

// Fase del ciclo enológico según el mes del sistema (0 = enero). Pura y
// sincrónica a propósito: no depende de Open-Meteo ni de ningún fetch, así
// que nunca falla ni necesita fallback.
export function getVendimiaPhase(monthIndex: number = new Date().getMonth()): VendimiaPhase {
  if (monthIndex >= 6 && monthIndex <= 8) {
    return {
      label: "Vendimia en curso",
      description: "Julio–septiembre: cosecha activa y fiestas del vino en los viñedos de Parras.",
    };
  }
  if (monthIndex >= 9 || monthIndex <= 1) {
    return {
      label: "Maduración y poda",
      description: "Octubre–febrero: reposo de las vides y catas de barrica en las bodegas.",
    };
  }
  return {
    label: "Brotación y floración",
    description: "Marzo–junio: viñedos verdes y clima primaveral en el valle.",
  };
}
