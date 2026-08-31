"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { es } from "react-day-picker/locale";

// Mapea las clases de cada pieza interna de DayPicker (ver UI/DayFlag/SelectionState en
// react-day-picker) a Tailwind, en vez de importar su CSS por defecto — así se mantiene
// "headless" y con la paleta neutral del proyecto (ver CLAUDE.md).
//
// Nota de estructura: los modificadores (selected/today/outside/disabled/range_*) se
// aplican a la celda `day` (un <td>), no al `day_button` (el <button> de adentro). Por
// eso `day_button` no define color de texto propio: lo hereda del `<td>` vía la cascada
// normal de CSS (el preflight de Tailwind ya pone `button { color: inherit }`), y así
// "day" fija el color por defecto mientras selected/outside/disabled lo sobreescriben
// un nivel arriba.
//
// Nota sobre cascada/`!important`: react-day-picker puede activar varios modificadores a
// la vez sobre la misma celda (ver `getClassNamesForModifiers` en su código fuente), y
// todas esas clases terminan en el mismo `class="..."` del <td>. Cuando dos de esas
// clases fijan la MISMA propiedad CSS con la MISMA especificidad (ej. `text-neutral-700`
// de `day` vs `text-neutral-300` de `outside`/`disabled`; o `bg-neutral-900` de `selected`
// vs `bg-neutral-100` de `range_middle`), gana la que Tailwind coloca más tarde en su hoja
// de estilos generada — un orden interno de Tailwind, NO el orden en que aparecen las
// clases en este objeto ni en el atributo `class` del elemento. Se verificó en este build
// que ese orden interno NO favorece a la clase "más específica" semánticamente (p.ej.
// `text-neutral-700`, declarada en `day`, le ganaba a `text-neutral-300` de `disabled`,
// dejando los días deshabilitados con el mismo color que los habilitados). Por eso,
// cualquier clase pensada para sobreescribir el color/fondo/radio por defecto de `day`
// (outside, disabled, range_start/range_end/range_middle) usa `!important` en TODAS sus
// propiedades (radio, bg y texto), no solo en la que a simple vista parece necesitarlo.
// range_start/range_end además fuerzan el lado contrario a `-none` (no solo el lado propio
// a `-full`) porque, al estar en modo range, react-day-picker también marca esos días con
// `selected: true` simultáneamente, y `rounded-full` (de selected) puede ganar justo en
// las esquinas que `rounded-l-full`/`rounded-r-full` no tocan si no se fuerza lo contrario.
// El bg/texto de range_start/range_end también necesitan `!important`: si el check-in o
// check-out cae justo en un día "outside" (relleno del mes siguiente/anterior, visible
// cerca de los bordes del grid), esa celda es `range_start`/`range_end` Y `outside` a la
// vez, y sin forzarlo el `!text-neutral-300` de `outside` le ganaba al `text-white` del
// extremo del rango — dejando el número casi invisible sobre el fondo oscuro.
const CALENDAR_CLASS_NAMES = {
  months: "relative flex flex-col gap-4 sm:flex-row",
  month: "flex flex-col gap-3",
  nav: "absolute inset-x-0 top-0 z-10 flex items-center justify-between",
  button_previous:
    "flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 transition-colors duration-200 ease-in-out hover:bg-neutral-100 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-30",
  button_next:
    "flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 transition-colors duration-200 ease-in-out hover:bg-neutral-100 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-30",
  month_caption: "flex h-7 items-center justify-center",
  caption_label: "text-sm font-semibold capitalize text-neutral-900",
  month_grid: "mt-1 w-full border-collapse",
  weekdays: "",
  weekday: "w-10 pb-2 text-center text-xs font-medium text-neutral-500",
  week: "",
  day: "h-10 w-10 p-0 text-center align-middle text-sm text-neutral-700",
  day_button:
    "flex h-10 w-10 items-center justify-center rounded-full font-medium cursor-pointer transition-all duration-200 ease-in-out hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
  selected: "rounded-full bg-neutral-900 text-white",
  range_start: "!rounded-l-full !rounded-r-none !bg-neutral-900 !text-white",
  range_end: "!rounded-r-full !rounded-l-none !bg-neutral-900 !text-white",
  range_middle: "!rounded-none !bg-neutral-100 !text-neutral-900",
  today: "font-semibold",
  outside: "!text-neutral-300",
  disabled: "!text-neutral-300",
  hidden: "invisible",
};

// Clases opcionales para dar feedback visual de disponibilidad día por día (prop
// `modifiers`/`modifiersClassNames` de react-day-picker), pensadas para pasarse por
// instancia de <Calendar> — no se aplican por defecto para no afectar a quien no las pida
// (ej. DateRangeSelector). Se centralizan aquí para reutilizarse en cualquier calendario
// del proyecto que necesite este patrón (hoy: SpaBookingForm como prueba de concepto; a
// futuro: FoodBookingForm y la disponibilidad de la casa).
//
// La clave `disabled` es intencional: en vez de inventar un modificador custom paralelo
// (ej. "unavailable") que compita por las mismas propiedades CSS que el `disabled` nativo
// en la misma celda (ver nota de cascada arriba), se sobreescribe directamente el
// `modifiersClassNames.disabled` de esta instancia — react-day-picker usa ese valor en
// vez de `classNames.disabled` (ver `getClassNamesForModifiers`), así que no hay dos
// clases compitiendo por el mismo color/fondo. Basta con pasar el `disabled` nativo de
// siempre (ej. `disabled={(date) => !isDayAvailable(date)}`) para que estas clases se
// apliquen a esos mismos días.
//
// El punto verde bajo el número de los días disponibles usa un pseudo-elemento `after:`
// con `content-['']` (sin esto Tailwind no genera la caja del pseudo-elemento); al estar
// en `absolute` dentro de la celda `relative`, pinta por encima del botón aunque aparezca
// antes que él en el DOM, porque un elemento posicionado siempre se apila sobre contenido
// estático del mismo nivel.
export const AVAILABILITY_MODIFIERS_CLASS_NAMES = {
  available:
    "relative !bg-emerald-50 !text-emerald-900 after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-emerald-500",
  disabled: "!text-red-300 !bg-red-50/50 line-through cursor-not-allowed",
};

function CalendarChevron({
  orientation,
  className,
}: {
  orientation?: "up" | "down" | "left" | "right";
  className?: string;
}) {
  const Icon = orientation === "right" ? ChevronRight : ChevronLeft;
  return <Icon className={className ?? "h-4 w-4"} strokeWidth={2} aria-hidden />;
}

export default function Calendar(props: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays
      {...props}
      locale={es}
      classNames={CALENDAR_CLASS_NAMES}
      components={{ Chevron: CalendarChevron }}
    />
  );
}
