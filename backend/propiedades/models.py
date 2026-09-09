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


class SupplierProfile(models.Model):
    """Datos de negocio de un proveedor (dueño de una o más propiedades).

    1:1 con `Usuario` porque el proveedor sigue siendo una cuenta de sesión
    normal (rol `SUPPLIER`/`holder`); este modelo solo agrega lo que necesita
    para operar como proveedor en el marketplace (cobro vía Stripe Connect,
    comisión de la plataforma).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        "usuarios.Usuario", on_delete=models.CASCADE, related_name="supplier_profile"
    )
    business_name = models.CharField(max_length=255)
    stripe_account_id = models.CharField(max_length=255, blank=True, null=True)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "supplier_profiles"
        verbose_name = "perfil de proveedor"
        verbose_name_plural = "perfiles de proveedor"

    def __str__(self):
        return self.business_name


class PropertyAccessType(models.TextChoices):
    """Controla si una propiedad es reservable por cualquier huésped o solo
    por quienes tengan un `PropertyAccessGrant` explícito."""

    OPEN = "OPEN", "Abierta"
    INVITE_ONLY = "INVITE_ONLY", "Solo por invitación"


class Property(models.Model):
    """Una propiedad rentable dentro del marketplace, propiedad de un proveedor.

    Reemplaza la noción de "una sola casa" de `PropertySettings`: cada
    proveedor puede tener varias. `PropertySettings` no se elimina todavía
    (sigue siendo la fuente de tarifa/depósito para la Casa Brava original)
    hasta que se migre esa lógica a este modelo.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier = models.ForeignKey(
        SupplierProfile, on_delete=models.PROTECT, related_name="properties"
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    description = models.TextField(blank=True, default="")
    access_type = models.CharField(
        max_length=20, choices=PropertyAccessType.choices, default=PropertyAccessType.OPEN
    )
    require_identity_verification = models.BooleanField(default=True)
    base_price_per_night = models.DecimalField(max_digits=10, decimal_places=2)
    security_deposit = models.DecimalField(max_digits=10, decimal_places=2)
    cleaning_fee = models.DecimalField(max_digits=10, decimal_places=2)
    max_guests = models.PositiveIntegerField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "properties"
        verbose_name = "propiedad"
        verbose_name_plural = "propiedades"
        ordering = ["name"]

    def __str__(self):
        return self.name


class PropertyAccessGrant(models.Model):
    """Otorga a un usuario acceso explícito a una propiedad `INVITE_ONLY`."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    property = models.ForeignKey(
        Property, on_delete=models.CASCADE, related_name="access_grants"
    )
    user = models.ForeignKey(
        "usuarios.Usuario", on_delete=models.CASCADE, related_name="property_access_grants"
    )
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "property_access_grants"
        verbose_name = "acceso a propiedad"
        verbose_name_plural = "accesos a propiedad"
        unique_together = ("property", "user")

    def __str__(self):
        return f"{self.user_id} → {self.property_id}"


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
