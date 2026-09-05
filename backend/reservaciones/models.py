"""
La reservación (registro maestro) y los bookings de servicios adicionales.

Regla del dominio, heredada tal cual del esquema de Supabase: **primero la
estadía, después los servicios**. Un `SpaBooking`, `FoodBooking` o `WineOrder`
no puede existir suelto — siempre cuelga de una `Reservation` con
`on_delete=models.CASCADE`, porque un servicio contratado sin estadía asociada
no significa nada.

Los catálogos, en cambio, van con `models.PROTECT` (el `on delete restrict` del
esquema original): borrar una masajista o un menú que ya aparece en el historial
de alguien reescribiría ese historial, así que la base lo impide y obliga a
desactivar el catálogo en vez de eliminarlo.
"""

import uuid

from django.db import models

from pagos.models import PaymentStatus
from servicios.models import MealType


class ReservationStatus(models.TextChoices):
    """Equivalente del ENUM `public.reservation_status`."""

    PENDIENTE = "pendiente", "Pendiente"
    CONFIRMADA = "confirmada", "Confirmada"
    CANCELADA = "cancelada", "Cancelada"
    FINALIZADA = "finalizada", "Finalizada"


#: Estados en los que una reservación "ocupa" el calendario y admite servicios.
ESTADOS_ACTIVOS = (ReservationStatus.PENDIENTE, ReservationStatus.CONFIRMADA)


class ReservationQuerySet(models.QuerySet):
    """Atajos de los filtros que toda consulta de reservaciones necesita."""

    def vigentes(self):
        """Excluye las que tienen soft delete. **Toda** lectura que llegue al
        cliente debe pasar por aquí: `deleted_at` no lo filtra nada más."""
        return self.filter(deleted_at__isnull=True)

    def activas(self):
        """Vigentes y en un estado que ocupa el calendario."""
        return self.vigentes().filter(status__in=ESTADOS_ACTIVOS)

    def confirmadas(self):
        return self.vigentes().filter(status=ReservationStatus.CONFIRMADA)


class Reservation(models.Model):
    """Estadía reservada en la casa.

    Tiene dos estados independientes, y no uno derivado del otro:
    `status` describe el ciclo de vida operativo (pendiente → confirmada →
    finalizada, o cancelada) y `payment_status` el del cobro. Están separados
    para poder representar un anticipo (`parcial`) sobre una reserva todavía
    `pendiente` sin acoplar ambos ciclos.

    El borrado es **suave**: `deleted_at` en vez de `DELETE`. Un borrado físico
    se llevaría en cascada los bookings de servicios asociados, que son el
    historial de lo contratado.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    guest = models.ForeignKey(
        "usuarios.Usuario", on_delete=models.PROTECT, related_name="reservations"
    )
    check_in = models.DateField()
    check_out = models.DateField()
    fare_type = models.ForeignKey(
        "propiedades.FareType", on_delete=models.PROTECT, related_name="reservations"
    )
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20, choices=ReservationStatus.choices, default=ReservationStatus.PENDIENTE
    )
    payment_status = models.CharField(
        max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDIENTE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    objects = ReservationQuerySet.as_manager()

    class Meta:
        db_table = "reservations"
        verbose_name = "reservación"
        verbose_name_plural = "reservaciones"
        ordering = ["check_in"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(check_out__gt=models.F("check_in")),
                name="reservations_check_out_after_check_in",
                violation_error_message="La fecha de salida debe ser posterior a la de entrada.",
            )
        ]
        indexes = [
            models.Index(fields=["guest"], name="reservations_guest_id_idx"),
            models.Index(fields=["fare_type"], name="reservations_fare_type_idx"),
            models.Index(fields=["status", "check_in"], name="reservations_status_date_idx"),
        ]

    def __str__(self):
        return f"{self.guest_id} · {self.check_in} → {self.check_out}"

    @property
    def esta_activa(self):
        return self.deleted_at is None and self.status in ESTADOS_ACTIVOS

    @property
    def noches(self):
        return (self.check_out - self.check_in).days

    @property
    def subtotal_servicios(self):
        """Suma de los servicios contratados, a los precios ya guardados.

        No se recalcula contra el catálogo vigente: cada booking guardó el
        precio del momento en que se contrató, y ese es el que se cobra.
        """
        total = sum(b.price_per_hour for b in self.spa_bookings.all())
        total += sum(b.total_price for b in self.food_bookings.all())
        total += sum(o.total_price for o in self.wine_orders.all())
        return total

    @property
    def gran_total(self):
        """Estadía + servicios. Valor derivado, nunca una columna."""
        return self.total_amount + self.subtotal_servicios


class SpaBooking(models.Model):
    """Sesión de spa contratada dentro de una reservación.

    `price_per_hour` es un *snapshot* del precio al momento de contratar, no una
    lectura del catálogo: si la tarifa cambia después, el historial no debe
    cambiar con ella.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reservation = models.ForeignKey(
        Reservation, on_delete=models.CASCADE, related_name="spa_bookings"
    )
    masseuse = models.ForeignKey(
        "proveedores.SpaMasseuse", on_delete=models.PROTECT, related_name="bookings"
    )
    date = models.DateField()
    time = models.TimeField()
    price_per_hour = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "spa_bookings"
        verbose_name = "reserva de spa"
        verbose_name_plural = "reservas de spa"
        ordering = ["date", "time"]
        indexes = [
            models.Index(fields=["reservation"], name="spa_bookings_reservation_idx"),
            models.Index(
                fields=["masseuse", "date", "time"], name="spa_bookings_masseuse_slot_idx"
            ),
        ]

    def __str__(self):
        return f"Spa {self.date} {self.time} — {self.masseuse}"


class FoodBooking(models.Model):
    """Servicio de cocina contratado para un día y tiempo de comida."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reservation = models.ForeignKey(
        Reservation, on_delete=models.CASCADE, related_name="food_bookings"
    )
    date = models.DateField()
    meal_type = models.CharField(max_length=20, choices=MealType.choices)
    menu = models.ForeignKey(
        "servicios.FoodMenu", on_delete=models.PROTECT, related_name="bookings"
    )
    guests_count = models.PositiveIntegerField()
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "food_bookings"
        verbose_name = "reserva de comida"
        verbose_name_plural = "reservas de comida"
        ordering = ["date"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(guests_count__gt=0),
                name="food_bookings_guests_count_positive",
                violation_error_message="El número de comensales debe ser mayor a cero.",
            )
        ]
        indexes = [
            models.Index(fields=["reservation"], name="food_bookings_reservation_idx"),
            models.Index(fields=["menu"], name="food_bookings_menu_idx"),
        ]

    def __str__(self):
        return f"{self.meal_type} {self.date} — {self.menu}"


class WineOrder(models.Model):
    """Pedido de vinos de una reservación. Su desglose vive en `items`."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reservation = models.ForeignKey(
        Reservation, on_delete=models.CASCADE, related_name="wine_orders"
    )
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "wine_orders"
        verbose_name = "pedido de vinos"
        verbose_name_plural = "pedidos de vinos"
        indexes = [models.Index(fields=["reservation"], name="wine_orders_reservation_idx")]

    def __str__(self):
        return f"Pedido de vinos ${self.total_price}"


class WineOrderItem(models.Model):
    """
    Una línea del pedido: **o** una botella individual **o** un paquete, nunca
    ambos ni ninguno (check constraint `wine_order_items_exactly_one_product`).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wine_order = models.ForeignKey(WineOrder, on_delete=models.CASCADE, related_name="items")
    wine = models.ForeignKey(
        "servicios.Wine",
        on_delete=models.PROTECT,
        related_name="order_items",
        blank=True,
        null=True,
    )
    wine_package = models.ForeignKey(
        "servicios.WinePackage",
        on_delete=models.PROTECT,
        related_name="order_items",
        blank=True,
        null=True,
    )
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "wine_order_items"
        verbose_name = "línea de pedido de vinos"
        verbose_name_plural = "líneas de pedido de vinos"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(quantity__gt=0),
                name="wine_order_items_quantity_positive",
                violation_error_message="La cantidad debe ser mayor a cero.",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(wine__isnull=False, wine_package__isnull=True)
                    | models.Q(wine__isnull=True, wine_package__isnull=False)
                ),
                name="wine_order_items_exactly_one_product",
                violation_error_message="Cada línea debe referir una botella o un paquete, no ambos.",
            ),
        ]
        indexes = [models.Index(fields=["wine_order"], name="wine_order_items_order_idx")]

    def __str__(self):
        producto = self.wine or self.wine_package
        return f"{self.quantity} × {producto}"
