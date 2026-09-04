"""
Catálogos de los servicios adicionales (spa, comida, vinos) y su disponibilidad.

Separación importante que viene del esquema original: el **catálogo** dice qué
se ofrece y a qué precio; la **disponibilidad** dice cuándo puede contratarse; y
el **booking** (app `reservaciones`) dice quién lo contrató. Las tres cosas son
tablas distintas y no deben fusionarse.

Spa y comida se modelan distinto a propósito:

* `SpaAvailability` es **una fila por bloque de hora** (masajista + día + hora),
  con bandera `is_booked`. Eso le da identidad propia a cada bloque, que es lo
  que permite bloquearlo individualmente con `select_for_update()` y evitar que
  dos huéspedes tomen el mismo horario.
* `FoodAvailability` es solo la lista de días habilitados, sin bandera de
  ocupado: la cocina se oferta por día completo y no compite entre huéspedes
  (varios pueden pedir Desayuno y Cena el mismo día).
"""

import uuid

from django.db import models


class MealType(models.TextChoices):
    """Equivalente del ENUM `public.meal_type`."""

    DESAYUNO = "Desayuno", "Desayuno"
    ALMUERZO = "Almuerzo", "Almuerzo"
    CENA = "Cena", "Cena"


class FoodMenu(models.Model):
    """Menú contratable, con precio por persona."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meal_type = models.CharField(max_length=20, choices=MealType.choices)
    name = models.CharField(max_length=150)
    price_per_person = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "food_menus"
        verbose_name = "menú"
        verbose_name_plural = "menús"
        ordering = ["meal_type", "name"]

    def __str__(self):
        return f"{self.meal_type} — {self.name}"


class Wine(models.Model):
    """Botella individual del catálogo de vinos."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    type = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)

    class Meta:
        db_table = "wines"
        verbose_name = "vino"
        verbose_name_plural = "vinos"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.type})"


class WinePackage(models.Model):
    """Paquete de vinos con precio propio (no la suma de sus botellas)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "wine_packages"
        verbose_name = "paquete de vinos"
        verbose_name_plural = "paquetes de vinos"
        ordering = ["name"]

    def __str__(self):
        return self.name


class SpaAvailability(models.Model):
    """
    Un bloque de hora ofertado por una masajista en un día concreto.

    `is_booked` es una bandera **derivada**: la mantienen exclusivamente los
    servicios transaccionales de `reservaciones.services` (reservar / liberar /
    re-adquirir), nunca una escritura suelta desde una vista o el admin. Existe
    para que el formulario del huésped sepa que un bloque ya está tomado sin
    necesidad de leer los bookings de otros huéspedes.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    masseuse = models.ForeignKey(
        "proveedores.SpaMasseuse", on_delete=models.CASCADE, related_name="availability"
    )
    available_date = models.DateField()
    available_time = models.TimeField()
    is_booked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "spa_availability"
        verbose_name = "disponibilidad de spa"
        verbose_name_plural = "disponibilidad de spa"
        ordering = ["available_date", "available_time"]
        constraints = [
            models.UniqueConstraint(
                fields=["masseuse", "available_date", "available_time"],
                name="spa_availability_unique_slot",
            )
        ]
        indexes = [
            models.Index(
                fields=["masseuse", "available_date"],
                name="spa_avail_masseuse_date_idx",
            )
        ]

    def __str__(self):
        return f"{self.masseuse} — {self.available_date} {self.available_time}"


class FoodAvailability(models.Model):
    """Día habilitado para el servicio de cocina."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    available_date = models.DateField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "food_availability"
        verbose_name = "disponibilidad de comida"
        verbose_name_plural = "disponibilidad de comida"
        ordering = ["available_date"]

    def __str__(self):
        return str(self.available_date)
