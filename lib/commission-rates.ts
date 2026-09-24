// Tasas de comisión del modelo de negocio de Parras Home Hub.
//
// Las comparten el Panel de Control PHH (`/admin`, take-rate proyectado sobre
// el GMV real) y el simulador de Revenue Management del portal de anfitrión
// (`/supplier`, ahorro frente a Airbnb). Se declaran una sola vez aquí para
// que ambos paneles no puedan contar historias distintas.

/**
 * Comisión de PHH sobre el hospedaje: 10 %.
 *
 * Espejo del default de `SupplierProfile.commission_rate` (10.00) en el
 * backend. Ese campo todavía no se expone por la API ni se asienta en
 * `Reservation.platform_fee` (queda en 0 — ver backend/README.md), así que
 * hoy es una **proyección**. El día que el backend liquide comisiones, el
 * take-rate se lee de ahí en vez de calcularse con esta constante.
 */
export const PHH_COMMISSION_RATE = 0.1;

/**
 * Referencia de mercado para la comparación del simulador: comisión de
 * anfitrión de Airbnb en su esquema de cobro solo al anfitrión (16 %).
 */
export const AIRBNB_HOST_FEE_RATE = 0.16;

/** Comisión en centavos, redondeada al centavo. */
export function commissionCents(amountCents: number, rate: number): number {
  return Math.round(amountCents * rate);
}
