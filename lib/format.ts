// Formatea una fecha simulada ISO (ej. "2026-09-04") a un formato corto legible (ej. "04 sept.").
export function formatSimulatedDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

// Formatea un horario de Postgres (columna `time`, ej. "14:00:00") al formato
// de 12 horas que muestra la UI (ej. "2:00 PM"). El valor viene siempre en
// 24h desde spa_availability.available_time, viaja así por el carrito y
// llega así al insert de spa_bookings — la conversión a 12h ocurre solo aquí,
// al mostrarlo.
export function formatTimeSlot(time: string): string {
  const [hoursRaw, minutes] = time.split(":");
  const hours = Number(hoursRaw);
  const meridiem = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hours12}:${minutes} ${meridiem}`;
}

// Convierte un `DecimalField` de DRF (que viaja como string, ej. "4500.00")
// al number con el que opera el frontend. Es el ÚNICO lugar donde se hace esa
// conversión: ver el tipo `Decimal` en lib/api/types.ts para el porqué.
//
// Un valor ilegible cae a 0 en vez de propagar NaN — un NaN se contagia a
// todas las sumas siguientes y termina pintando "$NaN" en la UI sin decir de
// dónde salió.
export function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

// Formatea un monto (number o el string decimal que manda la API) como precio.
export function formatMoney(value: string | number | null | undefined): string {
  return `$${toNumber(value).toFixed(2)}`;
}
