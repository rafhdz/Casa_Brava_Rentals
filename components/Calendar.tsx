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
// Nota sobre `range_middle`: en modo "range", react-day-picker marca los días del medio
// con `selected: true` Y `range_middle: true` al mismo tiempo, así que ambas clases
// (`selected` y `range_middle`) terminan en el mismo <td>. El orden en el que Tailwind
// genera esas clases en el CSS final (no el orden en el atributo `class`) decide cuál
// gana, así que sin `!important` los días del medio podían salir redondeados y negros
// como si fueran el inicio/fin del rango. `!rounded-none`/`!bg-*`/`!text-*` fuerzan a
// `range_middle` a ganar siempre sobre `selected` para que el rango se vea como una
// barra continua con las puntas redondeadas solo en range_start/range_end.
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
  weekday: "w-9 pb-2 text-center text-xs font-medium text-neutral-400",
  week: "",
  day: "h-9 w-9 p-0 text-center align-middle text-sm text-neutral-700",
  day_button:
    "flex h-9 w-9 items-center justify-center rounded-full font-medium transition-all duration-200 ease-in-out hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
  selected: "rounded-full bg-neutral-900 text-white",
  range_start: "rounded-l-full bg-neutral-900 text-white",
  range_end: "rounded-r-full bg-neutral-900 text-white",
  range_middle: "!rounded-none !bg-neutral-100 !text-neutral-900",
  today: "font-semibold",
  outside: "text-neutral-300",
  disabled: "text-neutral-300",
  hidden: "invisible",
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
