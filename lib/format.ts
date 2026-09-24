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

// Convierte un monto (number o el string decimal de DRF) a centavos enteros.
//
// Toda suma o multiplicación de dinero se hace en centavos, no en pesos con
// decimales: `0.1 + 0.2` no da `0.3` en binario, y el error se acumula al
// sumar cientos de reservaciones. El punto decimal se desplaza en la
// representación textual (`Number("1.005e2") === 100.5`) en vez de multiplicar
// por 100 (`1.005 * 100 === 100.49999…`, que redondearía hacia abajo), y el
// redondeo es "mitad hacia afuera" — el mismo `ROUND_HALF_UP` con el que el
// backend cuantiza sus totales.
export function toCents(value: string | number | null | undefined): number {
  const amount = toNumber(value);
  const shifted = Number(`${amount}e2`);
  const exact = Number.isFinite(shifted) ? shifted : amount * 100;
  return Math.sign(exact) * Math.round(Math.abs(exact));
}

// Monto con exactamente dos decimales, listo para un `DecimalField` de DRF
// (`decimal_places=2`). Un number con más decimales —el resultado de una
// multiplicación por un recargo porcentual, por ejemplo— lo rechaza el
// backend con un 400; mandarlo ya cuantizado como string evita el problema y
// cualquier pérdida de precisión en el `JSON.stringify` de un float.
export function toDecimalString(value: string | number | null | undefined): string {
  return (toCents(value) / 100).toFixed(2);
}

const MONEY_FORMAT = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Formatea un monto (number o el string decimal que manda la API) como precio,
// con separador de miles: `$1,284,500.00`.
export function formatMoney(value: string | number | null | undefined): string {
  return `$${MONEY_FORMAT.format(toCents(value) / 100)}`;
}

const INTEGER_FORMAT = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

// Formatea un conteo con separador de miles, redondeado: `1284.4` → `"1,284"`.
export function formatInteger(value: number): string {
  return INTEGER_FORMAT.format(Number.isFinite(value) ? value : 0);
}

// Formatea una razón (0–1) como porcentaje: `0.625` → `"62.5%"`.
export function formatPercent(ratio: number, fractionDigits = 1): string {
  const safe = Number.isFinite(ratio) ? ratio : 0;
  return `${(safe * 100).toFixed(fractionDigits)}%`;
}
