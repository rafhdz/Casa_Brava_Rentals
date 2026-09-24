"""
Estado y registro de los cobros.

`PaymentStatus` vive aquí —y `reservaciones.Reservation` lo importa— para que el
vocabulario del cobro sea propiedad de este módulo: cuando se conecte Stripe, el
webhook que mueve una reservación a `completado` se implementa en esta app sin
tocar `reservaciones`.

`Payment` es el único modelo que **no** existía en Supabase. Allá el cobro era
una sola columna (`reservations.payment_status`), suficiente mientras el pago
estuviera simulado, pero incapaz de registrar un anticipo, un segundo cargo o un
reembolso parcial — justo los casos que el estado `parcial` ya contempla. Es un
libro de movimientos: la reservación conserva su estado agregado y esta tabla
guarda cada movimiento que lo produjo.
"""

import uuid

from django.db import models


class PaymentStatus(models.TextChoices):
    """Equivalente del ENUM `public.payment_status_type`, más `NO_APLICA`.

    `NO_APLICA` ("na") no existía en Supabase: marca una estancia **exenta de
    cobro** — la de un propietario (rol `holder`) en su propia casa. No es un
    estado al que se llegue por movimientos (`pagos.services` nunca lo
    deriva): lo declara el admin sobre la reservación, y solo es válido si el
    huésped es `holder` (ver `reservaciones.services._validar_exencion`). Por
    lo mismo, un `Payment` individual nunca puede llevarlo.
    """

    PENDIENTE = "pendiente", "Pendiente"
    PARCIAL = "parcial", "Parcial"
    COMPLETADO = "completado", "Completado"
    REEMBOLSADO = "reembolsado", "Reembolsado"
    NO_APLICA = "na", "No aplica"


class PaymentProvider(models.TextChoices):
    SIMULADO = "simulado", "Simulado"
    STRIPE = "stripe", "Stripe"


class Payment(models.Model):
    """Un movimiento de cobro (o reembolso) contra una reservación."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reservation = models.ForeignKey(
        "reservaciones.Reservation", on_delete=models.CASCADE, related_name="payments"
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDIENTE
    )
    provider = models.CharField(
        max_length=20, choices=PaymentProvider.choices, default=PaymentProvider.SIMULADO
    )
    # Id del PaymentIntent / cargo en el proveedor externo. Vacío mientras el
    # cobro siga simulado.
    external_reference = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments"
        verbose_name = "pago"
        verbose_name_plural = "pagos"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["reservation"], name="payments_reservation_idx")]

    def __str__(self):
        return f"{self.get_status_display()} — ${self.amount}"
