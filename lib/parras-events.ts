// Catálogo editorial de los 12 meses del calendario enológico y festivo de
// Parras de la Fuente, usado por la segunda fila de
// components/ParrasStatusWidget.tsx. Vive aparte de lib/weather.ts porque no
// hace ningún I/O — es contenido curado y estático, calculado de forma pura
// a partir de `new Date().getMonth()` (0 = enero), a diferencia de la
// primera fila (clima), que sí depende de una llamada a Open-Meteo. Mismo
// patrón que WEATHER_ICONS en ParrasStatusWidget.tsx: este archivo declara
// solo la clave del ícono, no importa lucide-react, para no acoplar
// contenido a una librería de presentación.

export type ParrasEventIconKey =
  | "scissors"
  | "sparkles"
  | "sun"
  | "church"
  | "flame"
  | "grape"
  | "wine"
  | "utensils";

export type ParrasMonthlyEvent = {
  title: string;
  detail: string;
  icon: ParrasEventIconKey;
};

const PARRAS_MONTHLY_EVENTS: Record<number, ParrasMonthlyEvent> = {
  0: {
    title: "Poda de invierno",
    detail: "Enero–febrero: reposo vegetativo en viñedos y catas de guarda.",
    icon: "scissors",
  },
  1: {
    title: "Aniversario de fundación",
    detail: "18 de febrero: festejos históricos y callejoneadas coloniales.",
    icon: "sparkles",
  },
  2: {
    title: "Brotación de la vid",
    detail: "Marzo–abril: inicio del ciclo agrícola y primeros brotes en las parras.",
    icon: "sun",
  },
  3: {
    title: "Semana Santa",
    detail: "Tradicional procesión nocturna al Santo Madero en el Sombreretillo.",
    icon: "church",
  },
  4: {
    title: "Fiesta de la Santa Cruz",
    detail: "3 de mayo: danza tradicional de matachines y festejos patronales.",
    icon: "flame",
  },
  5: {
    title: "Floración y envero",
    detail: "Junio: floración en los viñedos y transformación del fruto.",
    icon: "grape",
  },
  6: {
    title: "Apertura de vendimias",
    detail: "Julio: primeras cosechas de uvas blancas y bendición de la molienda.",
    icon: "grape",
  },
  7: {
    title: "Gran Fiesta de la Vendimia",
    detail: "Agosto: pisado tradicional de la uva, feria y cenas maridaje.",
    icon: "wine",
  },
  8: {
    title: "Cierre de vendimias",
    detail: "Septiembre: maduración de variedades tintas y fiestas patrias en el valle.",
    icon: "grape",
  },
  9: {
    title: "Festival del Dulce y la Nuez",
    detail: "Octubre: cosecha en nogaleras centenarias y dulcería artesanal.",
    icon: "utensils",
  },
  10: {
    title: "Día de Muertos y Misticismo",
    detail: "Noviembre: callejoneadas de leyendas y casonas coloniales iluminadas.",
    icon: "sparkles",
  },
  11: {
    title: "Vinos de guarda e invierno",
    detail: "Diciembre: noches de cava, encendido navideño y maridajes de temporada.",
    icon: "wine",
  },
};

// Pura y sincrónica: no depende de ningún fetch, así que nunca falla ni
// necesita fallback (a diferencia de getParrasWeather() en lib/weather.ts).
export function getParrasMonthlyEvent(monthIndex: number = new Date().getMonth()): ParrasMonthlyEvent {
  return PARRAS_MONTHLY_EVENTS[monthIndex];
}
