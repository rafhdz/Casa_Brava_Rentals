"""
Semilla de desarrollo — equivalente reducido de `supabase/seed.sql`.

Deja el entorno local en un estado utilizable: la configuración de la propiedad
(sin ella no se puede crear ninguna reservación), tarifas, catálogos y
disponibilidad. Las fechas se generan **relativas a hoy**, no fijas: una semilla
con fechas duras queda en el pasado con el tiempo y deja el calendario
completamente deshabilitado.

Es idempotente (`get_or_create`), así que se puede volver a correr sin duplicar.
"""

from datetime import time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from propiedades.models import FareType, PropertySettings
from proveedores.models import SpaMasseuse
from servicios.models import (
    FoodAvailability,
    FoodMenu,
    MealType,
    SpaAvailability,
    Wine,
    WinePackage,
)
from usuarios.models import ProfileStatus, RoleType, Usuario

CONTRASENA_DEMO = "changeme123"  # solo para el entorno local


class Command(BaseCommand):
    help = "Carga datos de desarrollo (usuarios, catálogos y disponibilidad)."

    def handle(self, *args, **options):
        hoy = timezone.localdate()

        PropertySettings.objects.get_or_create(
            defaults={
                "nightly_rate": Decimal("4500.00"),
                "security_deposit": Decimal("2000.00"),
            }
        )
        for nombre, recargo in [("Estándar", "0"), ("Flexible", "15")]:
            FareType.objects.get_or_create(
                name=nombre, defaults={"surcharge_percentage": Decimal(recargo)}
            )

        cuentas = [
            ("admin@test.com", "Ana", "Admin", RoleType.ADMIN),
            ("maria.gomez@example.com", "María", "Gómez", RoleType.GUEST),
            ("carlos.ruiz@example.com", "Carlos", "Ruiz", RoleType.HOLDER),
        ]
        for email, nombre, apellido, rol in cuentas:
            if not Usuario.objects.filter(email=email).exists():
                Usuario.objects.create_user(
                    email=email,
                    password=CONTRASENA_DEMO,
                    first_name=nombre,
                    apellido_paterno=apellido,
                    role=rol,
                    status=ProfileStatus.ACTIVO,
                )

        menus = [
            (MealType.DESAYUNO, "Desayuno mexicano", "280.00"),
            (MealType.ALMUERZO, "Comida corrida", "380.00"),
            (MealType.CENA, "Cena de mariscos", "620.00"),
        ]
        for tipo, nombre, precio in menus:
            FoodMenu.objects.get_or_create(
                name=nombre, defaults={"meal_type": tipo, "price_per_person": Decimal(precio)}
            )

        vinos = [
            ("Casa Madero V", "Tinto", "890.00"),
            ("Monte Xanic Chardonnay", "Blanco", "760.00"),
            ("L.A. Cetto Rosado", "Rosado", "540.00"),
        ]
        for nombre, tipo, precio in vinos:
            Wine.objects.get_or_create(
                name=nombre, defaults={"type": tipo, "price": Decimal(precio), "stock": 12}
            )
        WinePackage.objects.get_or_create(
            name="Paquete degustación (4 botellas)", defaults={"price": Decimal("2800.00")}
        )

        # Disponibilidad de los próximos 14 días.
        masajistas = []
        for nombre in ["Lucía Ramírez", "Paola Méndez"]:
            masajista, _ = SpaMasseuse.objects.get_or_create(name=nombre)
            masajistas.append(masajista)

        horarios = [time(10, 0), time(12, 0), time(16, 0)]
        bloques = 0
        for dia_offset in range(1, 15):
            dia = hoy + timedelta(days=dia_offset)
            FoodAvailability.objects.get_or_create(available_date=dia)
            for masajista in masajistas:
                for hora in horarios:
                    _, creado = SpaAvailability.objects.get_or_create(
                        masseuse=masajista, available_date=dia, available_time=hora
                    )
                    bloques += int(creado)

        self.stdout.write(
            self.style.SUCCESS(
                f"Semilla lista: {Usuario.objects.count()} usuarios, "
                f"{bloques} bloques de spa nuevos, 14 días de cocina. "
                f"Contraseña de las cuentas demo: {CONTRASENA_DEMO}"
            )
        )
