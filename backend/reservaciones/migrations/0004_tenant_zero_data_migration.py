"""Migración de datos "Tenant 0": convierte la Casa Brava original (hasta
ahora una sola casa implícita) en la primera fila real de `propiedades.Property`,
propiedad de un `SupplierProfile` creado a partir del admin existente, y
reasigna a ella todas las reservaciones que ya existían antes del modelo
multi-tenant.

Debe correr **después** de que `property` exista como columna nullable en
`reservations` (migración 0003) y **antes** de que se vuelva NOT NULL
(migración 0005) — por eso queda como paso intermedio propio.
"""

import uuid
from decimal import Decimal

from django.db import migrations

ADMIN_EMAIL = "admin@test.com"
DEMO_GUEST_EMAILS = ["maria.gomez@example.com", "carlos.ruiz@example.com"]

TENANT_ZERO_NAME = "Casa Brava"
TENANT_ZERO_SLUG = "casa-brava"
TENANT_ZERO_BASE_PRICE = Decimal("4500.00")

# Sin equivalente en el esquema anterior (`PropertySettings` no los tenía):
# valores provisionales hasta que se editen desde un panel de administración
# de propiedades.
TENANT_ZERO_CLEANING_FEE = Decimal("0.00")
TENANT_ZERO_MAX_GUESTS = 10


def crear_tenant_zero(apps, schema_editor):
    Usuario = apps.get_model("usuarios", "Usuario")
    SupplierProfile = apps.get_model("propiedades", "SupplierProfile")
    Property = apps.get_model("propiedades", "Property")
    PropertyAccessGrant = apps.get_model("propiedades", "PropertyAccessGrant")
    PropertySettings = apps.get_model("propiedades", "PropertySettings")
    Reservation = apps.get_model("reservaciones", "Reservation")
    db_alias = schema_editor.connection.alias

    admin = Usuario.objects.using(db_alias).filter(email=ADMIN_EMAIL).first()
    if admin is None:
        # Base sin sembrar todavía (p.ej. CI corriendo migraciones en limpio
        # antes de `seed_demo`): no hay nada que migrar.
        return

    supplier_profile, _ = SupplierProfile.objects.using(db_alias).get_or_create(
        user=admin,
        defaults={"id": uuid.uuid4(), "business_name": TENANT_ZERO_NAME},
    )

    settings_row = PropertySettings.objects.using(db_alias).first()
    security_deposit = settings_row.security_deposit if settings_row else Decimal("0.00")

    property_, _ = Property.objects.using(db_alias).get_or_create(
        slug=TENANT_ZERO_SLUG,
        defaults={
            "id": uuid.uuid4(),
            "supplier": supplier_profile,
            "name": TENANT_ZERO_NAME,
            "description": "Casa Brava — propiedad original del sistema (tenant 0).",
            "access_type": "INVITE_ONLY",
            "require_identity_verification": True,
            "base_price_per_night": TENANT_ZERO_BASE_PRICE,
            "security_deposit": security_deposit,
            "cleaning_fee": TENANT_ZERO_CLEANING_FEE,
            "max_guests": TENANT_ZERO_MAX_GUESTS,
            "is_active": True,
        },
    )

    Reservation.objects.using(db_alias).filter(property__isnull=True).update(property=property_)

    for email in DEMO_GUEST_EMAILS:
        usuario = Usuario.objects.using(db_alias).filter(email=email).first()
        if usuario is None:
            continue
        PropertyAccessGrant.objects.using(db_alias).get_or_create(
            property=property_, user=usuario, defaults={"id": uuid.uuid4()}
        )


def revertir_tenant_zero(apps, schema_editor):
    Usuario = apps.get_model("usuarios", "Usuario")
    SupplierProfile = apps.get_model("propiedades", "SupplierProfile")
    Property = apps.get_model("propiedades", "Property")
    Reservation = apps.get_model("reservaciones", "Reservation")
    db_alias = schema_editor.connection.alias

    property_ = Property.objects.using(db_alias).filter(slug=TENANT_ZERO_SLUG).first()
    if property_ is None:
        return

    # `Reservation.property` es PROTECT: hay que desasociar antes de borrar.
    Reservation.objects.using(db_alias).filter(property=property_).update(property=None)
    property_.delete()  # cascada: PropertyAccessGrant

    admin = Usuario.objects.using(db_alias).filter(email=ADMIN_EMAIL).first()
    if admin is not None:
        SupplierProfile.objects.using(db_alias).filter(user=admin).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("reservaciones", "0003_reservation_accommodation_total_and_more"),
        ("propiedades", "0002_supplierprofile_property_propertyaccessgrant"),
    ]

    operations = [
        migrations.RunPython(crear_tenant_zero, revertir_tenant_zero),
    ]
