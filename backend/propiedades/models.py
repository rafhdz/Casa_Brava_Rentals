"""
La propiedad en sí: su configuración de cobro, los tipos de tarifa, y el
contenido visual del Home (fotos del carrusel, amenidades y las tarjetas de
servicios adicionales).

El sistema modela **una sola casa** — igual que en Supabase, no existe tabla
`properties`. `PropertySettings` es un singleton de hecho: una única fila con la
tarifa por noche y el depósito. Además de ser la fuente de esos dos valores, esa
fila es el punto de serialización del calendario: `reservaciones.services` la
bloquea con `select_for_update()` para que dos reservaciones concurrentes no
puedan solaparse (ver el detalle ahí).
"""

import uuid

from django.db import models


class PropertySettings(models.Model):
    """Fila única con la configuración de cobro de la casa."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nightly_rate = models.DecimalField(max_digits=10, decimal_places=2)
    security_deposit = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "property_settings"
        verbose_name = "configuración de la propiedad"
        verbose_name_plural = "configuración de la propiedad"

    def __str__(self):
        return f"Casa Brava — ${self.nightly_rate}/noche"


class FareType(models.Model):
    """Tipo de tarifa (ej. estándar / flexible) con su recargo porcentual."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150)
    surcharge_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    class Meta:
        db_table = "fare_types"
        verbose_name = "tipo de tarifa"
        verbose_name_plural = "tipos de tarifa"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} (+{self.surcharge_percentage}%)"


class PropertyPhoto(models.Model):
    """Foto del carrusel del Home.

    `sort_order` preserva el recorrido curado por la casa (jardín →
    estacionamiento → entradas → habitaciones…); sin él, el orden de las filas
    no está garantizado por la base de datos.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    url = models.TextField()
    label = models.TextField()
    sort_order = models.IntegerField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "property_photos"
        verbose_name = "foto de la propiedad"
        verbose_name_plural = "fotos de la propiedad"
        ordering = ["sort_order"]

    def __str__(self):
        return self.label


class AmenityCategory(models.Model):
    """Agrupador de amenidades (Baño, Cocina, Exteriores…)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.TextField()
    sort_order = models.IntegerField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "amenity_categories"
        verbose_name = "categoría de amenidades"
        verbose_name_plural = "categorías de amenidades"
        ordering = ["sort_order"]

    def __str__(self):
        return self.name


class Amenity(models.Model):
    """Amenidad individual, con su ícono curado (`icon_url`)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(
        AmenityCategory, on_delete=models.CASCADE, related_name="amenities"
    )
    name = models.TextField()
    icon_url = models.TextField()
    sort_order = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "amenities"
        verbose_name = "amenidad"
        verbose_name_plural = "amenidades"
        ordering = ["category__sort_order", "sort_order"]
        indexes = [models.Index(fields=["category", "sort_order"], name="amenities_category_sort_idx")]

    def __str__(self):
        return self.name


class AdditionalServiceInfo(models.Model):
    """
    Tarjeta de servicio adicional del Home.

    El `id` es texto y no UUID a propósito: coincide con la carpeta de ruta del
    frontend (`/servicios/<id>`), así que el conjunto de valores válidos está
    cerrado por un check constraint — no se puede publicar una tarjeta que
    enlace a una página que no existe.
    """

    class Slug(models.TextChoices):
        SPA = "spa", "Spa y masajes"
        COMIDA = "comida", "Comida"
        VINOS = "vinos", "Vinos"

    id = models.CharField(primary_key=True, max_length=20, choices=Slug.choices)
    title = models.TextField()
    description = models.TextField()
    image_url = models.TextField()
    price_hint = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "additional_services_info"
        verbose_name = "información de servicio adicional"
        verbose_name_plural = "información de servicios adicionales"
        ordering = ["id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(id__in=["spa", "comida", "vinos"]),
                name="additional_services_info_id_check",
            )
        ]

    def __str__(self):
        return self.title
