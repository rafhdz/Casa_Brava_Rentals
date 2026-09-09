"""
Semilla de desarrollo — equivalente de `supabase/seed.sql`.

Deja el entorno local en un estado utilizable: la configuración de la propiedad
(sin ella no se puede crear ninguna reservación), tarifas, catálogos,
disponibilidad y el contenido visual del Home (fotos del carrusel, categorías
de amenidades y tarjetas de servicios adicionales). Las fechas se generan
**relativas a hoy**, no fijas: una semilla con fechas duras queda en el pasado
con el tiempo y deja el calendario completamente deshabilitado.

Es idempotente (`get_or_create` / `bulk_create(ignore_conflicts=True)`), así
que se puede volver a correr sin duplicar.
"""

from datetime import time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from propiedades.models import (
    AdditionalServiceInfo,
    Amenity,
    AmenityCategory,
    FareType,
    Property,
    PropertyAccessGrant,
    PropertyAccessType,
    PropertyPhoto,
    PropertySettings,
    SupplierProfile,
)
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

#: Mismo slug que usa `reservaciones.services._propiedad_tenant_cero` como
#: fallback: hay que mantenerlos sincronizados.
TENANT_ZERO_SLUG = "casa-brava"

# Contenido visual del Home, tal como vivía en `supabase/seed.sql` (recuperado
# del historial de git al migrar a Django). `seed_demo` no lo cargaba y dejaba
# el carrusel, las amenidades y las tarjetas de servicios vacías en una base
# recién migrada — ver README.

# sort_order preserva el recorrido curado original del carrusel (jardín →
# estacionamiento → entradas → terraza → habitaciones, en ese orden).
PROPERTY_PHOTOS = [
    ("/images/jardin_1.jpeg", "Jardín", 1),
    ("/images/jardin_2.jpeg", "Jardín", 2),
    ("/images/jardin_3.jpeg", "Jardín", 3),
    ("/images/jardin_4.jpeg", "Jardín", 4),
    ("/images/jardin_5.jpeg", "Jardín", 5),
    ("/images/parking_1.jpeg", "Estacionamiento", 6),
    ("/images/parking_2.jpeg", "Estacionamiento", 7),
    ("/images/parking_3.jpeg", "Estacionamiento", 8),
    ("/images/parking_4.jpeg", "Estacionamiento", 9),
    ("/images/parking_5.jpeg", "Estacionamiento", 10),
    ("/images/ent_principal_lat_1.jpeg", "Entrada Principal Lateral", 11),
    ("/images/ent_principal_lat_2.jpeg", "Entrada Principal Lateral", 12),
    ("/images/ent_principal_1.jpeg", "Entrada Principal", 13),
    ("/images/ent_principal_2.jpeg", "Entrada Principal", 14),
    ("/images/terraza_1.jpeg", "Terraza", 15),
    ("/images/terraza_2.jpeg", "Terraza", 16),
    ("/images/terraza_3.jpeg", "Terraza", 17),
    ("/images/terraza_4.jpeg", "Terraza", 18),
    ("/images/del_mezzanine_1.jpeg", "Habitación del Mezzanine", 19),
    ("/images/del_mezzanine_2.jpeg", "Habitación del Mezzanine", 20),
    ("/images/del_mezzanine_3.jpeg", "Habitación del Mezzanine", 21),
    ("/images/del_mezzanine_4.jpeg", "Habitación del Mezzanine", 22),
    ("/images/de_la_terraza_1.jpeg", "Habitación de la Terraza", 23),
    ("/images/de_la_terraza_2.jpeg", "Habitación de la Terraza", 24),
    ("/images/de_la_terraza_3.jpeg", "Habitación de la Terraza", 25),
    ("/images/de_la_terraza_4.jpeg", "Habitación de la Terraza", 26),
    ("/images/de_la_terraza_5.jpeg", "Habitación de la Terraza", 27),
    ("/images/sala_tv_1.jpeg", "Sala de TV", 28),
    ("/images/sala_tv_2.jpeg", "Sala de TV", 29),
    ("/images/sala_tv_3.jpeg", "Sala de TV", 30),
    ("/images/sala_tv_4.jpeg", "Sala de TV", 31),
    ("/images/pas_principal.jpeg", "Pasillo Principal", 32),
    ("/images/amarillo_1.jpeg", "Habitación Amarilla", 33),
    ("/images/amarillo_2.jpeg", "Habitación Amarilla", 34),
    ("/images/amarillo_3.jpeg", "Habitación Amarilla", 35),
    ("/images/amarillo_4.jpeg", "Habitación Amarilla", 36),
    ("/images/amarillo_5.jpeg", "Habitación Amarilla", 37),
    ("/images/principal_1.jpeg", "Habitación Principal", 38),
    ("/images/principal_2.jpeg", "Habitación Principal", 39),
    ("/images/principal_3.jpeg", "Habitación Principal", 40),
    ("/images/principal_4.jpeg", "Habitación Principal", 41),
    ("/images/principal_5.jpeg", "Habitación Principal", 42),
    ("/images/principal_6.jpeg", "Habitación Principal", 43),
    ("/images/principal_7.jpeg", "Habitación Principal", 44),
    ("/images/de_la_fuente_1.jpeg", "Habitación de la Fuente", 45),
    ("/images/de_la_fuente_2.jpeg", "Habitación de la Fuente", 46),
    ("/images/de_la_fuente_3.jpeg", "Habitación de la Fuente", 47),
    ("/images/de_la_fuente_4.jpeg", "Habitación de la Fuente", 48),
    ("/images/de_mane_1.jpeg", "Habitación de Mane", 49),
    ("/images/de_mane_2.jpeg", "Habitación de Mane", 50),
    ("/images/de_mane_3.jpeg", "Habitación de Mane", 51),
    ("/images/de_mane_4.jpeg", "Habitación de Mane", 52),
    ("/images/de_mane_5.jpeg", "Habitación de Mane", 53),
    ("/images/de_mane_6.jpeg", "Habitación de Mane", 54),
    ("/images/de_mane_7.jpeg", "Habitación de Mane", 55),
    ("/images/de_mane_8.jpeg", "Habitación de Mane", 56),
    ("/images/de_mane_9.jpeg", "Habitación de Mane", 57),
    ("/images/de_la_abuela_1.jpeg", "Habitación de la Abuela", 58),
    ("/images/de_la_abuela_2.jpeg", "Habitación de la Abuela", 59),
    ("/images/de_la_abuela_3.jpeg", "Habitación de la Abuela", 60),
]

# (nombre de categoría, sort_order)
AMENITY_CATEGORIES = [
    ("Baño", 1),
    ("Habitación y lavandería", 2),
    ("Espacio para guardar ropa", 3),
    ("Entretenimiento", 4),
    ("Calefacción y refrigeración", 5),
    ("Seguridad en el hogar", 6),
    ("Internet y oficina", 7),
    ("Cocina y comedor", 8),
    ("Características de la ubicación", 9),
    ("Exterior", 10),
    ("Estacionamiento", 11),
]

# (categoría, nombre, icon_url, sort_order dentro de la categoría)
AMENITIES = [
    ("Baño", "Jabón corporal", "/icons/amenities/baño/jabon_corporal.svg", 1),
    ("Baño", "Regadera interior", "/icons/amenities/baño/regadera_interior.svg", 2),
    ("Baño", "Agua caliente", "/icons/amenities/baño/agua_caliente.svg", 3),
    ("Habitación y lavandería", "Ganchos", "/icons/amenities/habitación/ganchos.svg", 1),
    (
        "Habitación y lavandería",
        "Ventanas blackout",
        "/icons/amenities/habitación/ventana_blackout.svg",
        2,
    ),
    (
        "Habitación y lavandería",
        "Mosquitero",
        "/icons/amenities/habitación/mosquitera.svg",
        3,
    ),
    ("Espacio para guardar ropa", "Clóset", "/icons/amenities/habitación/closet.svg", 1),
    ("Entretenimiento", "Televisión", "/icons/amenities/entrenimiento/tv.svg", 1),
    (
        "Entretenimiento",
        "Libros y material de lectura",
        "/icons/amenities/entrenimiento/libros.svg",
        2,
    ),
    (
        "Calefacción y refrigeración",
        "Aire acondicionado",
        "/icons/amenities/calefacción/ac.svg",
        1,
    ),
    (
        "Calefacción y refrigeración",
        "Ventilador de techo",
        "/icons/amenities/calefacción/fan.svg",
        2,
    ),
    (
        "Seguridad en el hogar",
        "Cámaras de seguridad dentro de la propiedad",
        "/icons/amenities/seguridad/camara.svg",
        1,
    ),
    ("Internet y oficina", "Wifi de alta velocidad", "/icons/amenities/internet/wifi.svg", 1),
    ("Cocina y comedor", "Refrigerador", "/icons/amenities/cocina/fridge.svg", 1),
    ("Cocina y comedor", "Microondas", "/icons/amenities/cocina/microwave.svg", 2),
    (
        "Cocina y comedor",
        "Utensilios básicos para cocinar",
        "/icons/amenities/cocina/utensils.svg",
        3,
    ),
    ("Cocina y comedor", "Platos y cubiertos", "/icons/amenities/cocina/dishes.svg", 4),
    ("Cocina y comedor", "Cristalería", "/icons/amenities/cocina/glass.svg", 5),
    ("Cocina y comedor", "Congelador", "/icons/amenities/cocina/fridge.svg", 6),
    ("Cocina y comedor", "Estufa de gas", "/icons/amenities/cocina/stove.svg", 7),
    ("Cocina y comedor", "Cafetera", "/icons/amenities/cocina/coffee_machine.svg", 8),
    (
        "Cocina y comedor",
        "Cafetera de filtro",
        "/icons/amenities/cocina/coffee_machine.svg",
        9,
    ),
    ("Cocina y comedor", "Tostador", "/icons/amenities/cocina/toaster.svg", 10),
    ("Cocina y comedor", "Licuadora", "/icons/amenities/cocina/licuadora.svg", 11),
    (
        "Características de la ubicación",
        "5 minutos del centro del pueblo",
        "/icons/amenities/ubicación/location.svg",
        1,
    ),
    ("Exterior", "Jardín privado", "/icons/amenities/exterior/jardin.svg", 1),
    ("Exterior", "Muebles exteriores", "/icons/amenities/exterior/mueble_exterior.svg", 2),
    (
        "Estacionamiento",
        "Estacionamiento privado de 8 plazas",
        "/icons/amenities/exterior/parking.svg",
        1,
    ),
]

ADDITIONAL_SERVICES = [
    (
        AdditionalServiceInfo.Slug.COMIDA,
        "Comida",
        "Desayunos, almuerzos y cenas preparados por un cocinero local durante tu estadía.",
        "/images/servicio_comida_holder.jpg",
        "Desde $200 / persona",
    ),
    (
        AdditionalServiceInfo.Slug.SPA,
        "SPA / Masajes",
        "Sesiones de masaje relajante o terapéutico directamente en el spa de la propiedad, "
        "con nuestras masajistas.",
        "/images/servicio_spa_holder.jpg",
        "Desde $600 / sesión de una hora",
    ),
    (
        AdditionalServiceInfo.Slug.VINOS,
        "Paquete de Vinos",
        "Selección de vinos Parvada disponibles a un precio exclusivo, entregados antes de tu "
        "estancia.",
        "/images/paquete_vinos_holder.jpg",
        "Desde $2250 / paquete",
    ),
]


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

        # Tenant 0: el admin es dueño de Casa Brava, y los dos huéspedes demo
        # conservan su invitación a esa propiedad (INVITE_ONLY). Mismos datos
        # que crea la migración `reservaciones.0004_tenant_zero_data_migration`,
        # repetidos aquí para que `seed_demo` deje el entorno utilizable incluso
        # en una base recreada sin volver a correr esa migración de datos.
        supplier_profile, _ = SupplierProfile.objects.update_or_create(
            user=Usuario.objects.get(email="admin@test.com"),
            defaults={"business_name": "Casa Brava", "is_active": True},
        )
        propiedad_casa_brava, _ = Property.objects.update_or_create(
            slug=TENANT_ZERO_SLUG,
            defaults={
                "supplier": supplier_profile,
                "name": "Casa Brava",
                "description": "Casa Brava — propiedad original del sistema (tenant 0).",
                "access_type": PropertyAccessType.INVITE_ONLY,
                "require_identity_verification": True,
                "base_price_per_night": Decimal("4500.00"),
                "security_deposit": Decimal("2000.00"),
                "cleaning_fee": Decimal("0.00"),
                "max_guests": 10,
                "is_active": True,
            },
        )
        for email in ("maria.gomez@example.com", "carlos.ruiz@example.com"):
            PropertyAccessGrant.objects.get_or_create(
                property=propiedad_casa_brava, user=Usuario.objects.get(email=email)
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

        # Contenido visual del Home: fotos del carrusel, categorías de
        # amenidades (con sus amenidades) y tarjetas de servicios adicionales.
        # Cada fila tiene un UUID aleatorio que cambia entre corridas, así que
        # se usa una llave de negocio estable (url, o categoría+nombre) para
        # detectar qué ya existe y pasarle solo lo nuevo a
        # `bulk_create(ignore_conflicts=True)`, en vez de una consulta por
        # fila como haría `get_or_create`.
        fotos_existentes = set(PropertyPhoto.objects.values_list("url", flat=True))
        PropertyPhoto.objects.bulk_create(
            [
                PropertyPhoto(url=url, label=label, sort_order=sort_order)
                for url, label, sort_order in PROPERTY_PHOTOS
                if url not in fotos_existentes
            ],
            ignore_conflicts=True,
        )

        categorias = {}
        for nombre, sort_order in AMENITY_CATEGORIES:
            categoria, _ = AmenityCategory.objects.get_or_create(
                name=nombre, defaults={"sort_order": sort_order}
            )
            categorias[nombre] = categoria

        # La llave de idempotencia es (categoría, nombre), no (categoría,
        # icon_url): varias amenidades de la misma categoría reutilizan el
        # mismo ícono a propósito (ej. "Refrigerador" y "Congelador" comparten
        # fridge.svg dentro de "Cocina y comedor"), así que el ícono no
        # identifica la fila.
        amenidades_existentes = set(Amenity.objects.values_list("category_id", "name"))
        Amenity.objects.bulk_create(
            [
                Amenity(
                    category=categorias[categoria_nombre],
                    name=nombre,
                    icon_url=icon_url,
                    sort_order=sort_order,
                )
                for categoria_nombre, nombre, icon_url, sort_order in AMENITIES
                if (categorias[categoria_nombre].id, nombre) not in amenidades_existentes
            ],
            ignore_conflicts=True,
        )

        for slug, title, description, image_url, price_hint in ADDITIONAL_SERVICES:
            AdditionalServiceInfo.objects.get_or_create(
                id=slug,
                defaults={
                    "title": title,
                    "description": description,
                    "image_url": image_url,
                    "price_hint": price_hint,
                },
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
                f"{bloques} bloques de spa nuevos, 14 días de cocina, "
                f"{PropertyPhoto.objects.count()} fotos, "
                f"{AmenityCategory.objects.count()} categorías de amenidades "
                f"({Amenity.objects.count()} amenidades), "
                f"{AdditionalServiceInfo.objects.count()} tarjetas de servicio. "
                f"Contraseña de las cuentas demo: {CONTRASENA_DEMO}"
            )
        )
