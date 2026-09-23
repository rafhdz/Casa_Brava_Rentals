"""
Registro de cobros y estado agregado de la reservación.

`Reservation.payment_status` es un **resumen**: quien manda es el libro de
movimientos (`Payment`). Cada vez que se registra o modifica un movimiento se
vuelve a derivar el estado de la reservación desde cero, para que ambas cosas no
puedan quedar desincronizadas.

La reservación se bloquea con `select_for_update()` mientras se recalcula: dos
cobros que entren a la vez (p. ej. el webhook del proveedor y un registro
manual) leerían el mismo total parcial y podrían dejar la reserva en `parcial`
cuando entre ambos ya la habían saldado.
"""

from decimal import Decimal

from django.db import transaction
from django.db.models import Sum

from pagos.models import Payment, PaymentStatus
from reservaciones.models import Reservation


def _total_cobrado(reservacion):
    agregado = reservacion.payments.filter(status=PaymentStatus.COMPLETADO).aggregate(
        total=Sum("amount")
    )
    return agregado["total"] or Decimal("0.00")


def derivar_estado_de_pago(reservacion):
    """Traduce los movimientos a uno de los estados de cobro.

    `NA` ("No aplica / Exento") es la excepción a la regla "se deriva desde
    cero": una reservación de propietario (`holder`) nace en `na` sin ningún
    movimiento de por medio (ver `reservaciones.services.crear_reservacion`),
    así que "sin nada cobrado" no debe traducirse a `PENDIENTE` como si fuera
    un huésped esperando pagar. Si más adelante sí se le registra un cobro
    real, el estado vuelve a derivarse normalmente a partir de ahí.
    """
    if reservacion.payments.filter(status=PaymentStatus.REEMBOLSADO).exists():
        return PaymentStatus.REEMBOLSADO

    cobrado = _total_cobrado(reservacion)
    if cobrado <= 0:
        if reservacion.payment_status == PaymentStatus.NA:
            return PaymentStatus.NA
        return PaymentStatus.PENDIENTE
    if cobrado >= reservacion.gran_total:
        return PaymentStatus.COMPLETADO
    return PaymentStatus.PARCIAL


@transaction.atomic
def sincronizar_estado_de_pago(reservation_id):
    """Recalcula y guarda `payment_status` bajo bloqueo de la reservación."""
    reservacion = Reservation.objects.select_for_update().get(pk=reservation_id)
    nuevo_estado = derivar_estado_de_pago(reservacion)
    if reservacion.payment_status != nuevo_estado:
        reservacion.payment_status = nuevo_estado
        reservacion.save(update_fields=["payment_status", "updated_at"])
    return reservacion


@transaction.atomic
def registrar_pago(*, reservacion, amount, status=PaymentStatus.COMPLETADO, **extra):
    """
    Asienta un movimiento y actualiza el estado agregado de la reservación.

    Punto de enganche para el webhook de Stripe: hoy el pago se crea como
    `simulado`, y cuando exista el cobro real bastará con llamar aquí desde el
    webhook con el `external_reference` del PaymentIntent confirmado.
    """
    pago = Payment.objects.create(reservation=reservacion, amount=amount, status=status, **extra)
    sincronizar_estado_de_pago(reservacion.pk)
    return pago
