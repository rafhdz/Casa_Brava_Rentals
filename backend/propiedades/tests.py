"""
Pruebas del contrato HTTP de los catálogos.

Cubren lo que el panel de catálogos del frontend (`/admin/catalogos`) da por
sentado: que solo un admin escribe, y que borrar una fila ya referenciada por
el historial responde 409 con un mensaje mostrable — no un 500 con el traceback
de Django. Ver `casabrava_core/exceptions.py`.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from propiedades.models import (
    FareType,
    Property,
    PropertyAccessGrant,
    PropertyAccessType,
    PropertySettings,
    SupplierProfile,
)
from reservaciones import services
from usuarios.models import ProfileStatus, RoleType, Usuario

HOY = date.today()


class CatalogoDeTarifasTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.configuracion = PropertySettings.objects.create(
            nightly_rate=Decimal("2000.00"), security_deposit=Decimal("1000.00")
        )
        cls.tarifa = FareType.objects.create(name="Estándar", surcharge_percentage=Decimal("0"))
        cls.admin = Usuario.objects.create_user(
            email="admin@test.com",
            password="changeme123",
            first_name="Ada",
            apellido_paterno="Admin",
            role=RoleType.ADMIN,
            status=ProfileStatus.ACTIVO,
        )
        cls.huesped = Usuario.objects.create_user(
            email="maria@test.com",
            password="changeme123",
            first_name="María",
            apellido_paterno="Gómez",
        )
        # Tenant 0, mismo slug que usa el fallback de
        # `services._propiedad_tenant_cero`: sin esto, `crear_reservacion`
        # falla al no encontrar ninguna propiedad "casa-brava".
        supplier_profile = SupplierProfile.objects.create(user=cls.admin, business_name="Casa Brava")
        cls.propiedad = Property.objects.create(
            supplier=supplier_profile,
            name="Casa Brava",
            slug="casa-brava",
            access_type=PropertyAccessType.INVITE_ONLY,
            base_price_per_night=cls.configuracion.nightly_rate,
            security_deposit=cls.configuracion.security_deposit,
            cleaning_fee=Decimal("0.00"),
            max_guests=10,
        )
        PropertyAccessGrant.objects.create(property=cls.propiedad, user=cls.huesped)

    def setUp(self):
        self.client = APIClient()
        self.url = reverse("fare-type-list")

    def _autenticar(self, usuario):
        self.client.force_authenticate(user=usuario)

    def test_el_admin_puede_crear_una_tarifa(self):
        self._autenticar(self.admin)
        respuesta = self.client.post(
            self.url, {"name": "Flexible", "surcharge_percentage": "15.00"}, format="json"
        )
        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        self.assertTrue(FareType.objects.filter(name="Flexible").exists())

    def test_el_huesped_lee_pero_no_escribe(self):
        self._autenticar(self.huesped)
        self.assertEqual(self.client.get(self.url).status_code, 200)
        respuesta = self.client.post(
            self.url, {"name": "Gratis", "surcharge_percentage": "0.00"}, format="json"
        )
        self.assertEqual(respuesta.status_code, 403)

    def test_el_admin_puede_borrar_una_tarifa_sin_historial(self):
        sin_uso = FareType.objects.create(name="Temporal", surcharge_percentage=Decimal("5"))
        self._autenticar(self.admin)
        respuesta = self.client.delete(reverse("fare-type-detail", args=[sin_uso.pk]))
        self.assertEqual(respuesta.status_code, 204)
        self.assertFalse(FareType.objects.filter(pk=sin_uso.pk).exists())

    def test_borrar_una_tarifa_en_uso_responde_409(self):
        """`FareType` es `PROTECT` desde `reservations`: borrarla reescribiría el
        historial. Sin el manejador de excepciones eso sale como 500."""
        services.crear_reservacion(
            guest=self.huesped,
            check_in=HOY + timedelta(days=10),
            check_out=HOY + timedelta(days=12),
            fare_type=self.tarifa,
        )
        self._autenticar(self.admin)
        respuesta = self.client.delete(reverse("fare-type-detail", args=[self.tarifa.pk]))

        self.assertEqual(respuesta.status_code, 409, respuesta.data)
        self.assertIn("detail", respuesta.data)
        self.assertTrue(FareType.objects.filter(pk=self.tarifa.pk).exists())


class PropertyApiTests(TestCase):
    """Contrato HTTP de `/api/propiedades/`: lectura pública y `user_has_access`
    evaluado contra `request.user` (anónimo, con grant, sin grant)."""

    @classmethod
    def setUpTestData(cls):
        cls.admin = Usuario.objects.create_user(
            email="admin@test.com",
            password="changeme123",
            first_name="Ada",
            apellido_paterno="Admin",
            role=RoleType.ADMIN,
            status=ProfileStatus.ACTIVO,
        )
        cls.huesped_con_acceso = Usuario.objects.create_user(
            email="con-acceso@test.com",
            password="changeme123",
            first_name="Con",
            apellido_paterno="Acceso",
        )
        cls.huesped_sin_acceso = Usuario.objects.create_user(
            email="sin-acceso@test.com",
            password="changeme123",
            first_name="Sin",
            apellido_paterno="Acceso",
        )
        cls.supplier_profile = SupplierProfile.objects.create(
            user=cls.admin, business_name="Casa Brava"
        )
        cls.propiedad = Property.objects.create(
            supplier=cls.supplier_profile,
            name="Casa Brava",
            slug="casa-brava",
            access_type=PropertyAccessType.INVITE_ONLY,
            base_price_per_night=Decimal("4500.00"),
            security_deposit=Decimal("2000.00"),
            cleaning_fee=Decimal("0.00"),
            max_guests=10,
        )
        PropertyAccessGrant.objects.create(property=cls.propiedad, user=cls.huesped_con_acceso)

    def setUp(self):
        self.client = APIClient()
        self.url = reverse("property-detail", args=["casa-brava"])

    def test_detalle_anonimo_ve_la_ficha_pero_sin_acceso(self):
        respuesta = self.client.get(self.url)
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertEqual(respuesta.data["slug"], "casa-brava")
        self.assertEqual(respuesta.data["access_type"], PropertyAccessType.INVITE_ONLY)
        self.assertEqual(respuesta.data["supplier"]["business_name"], "Casa Brava")
        self.assertFalse(respuesta.data["user_has_access"])

    def test_detalle_huesped_con_grant_tiene_acceso(self):
        self.client.force_authenticate(user=self.huesped_con_acceso)
        respuesta = self.client.get(self.url)
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertTrue(respuesta.data["user_has_access"])

    def test_detalle_huesped_sin_grant_no_tiene_acceso(self):
        self.client.force_authenticate(user=self.huesped_sin_acceso)
        respuesta = self.client.get(self.url)
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertFalse(respuesta.data["user_has_access"])

    def test_propiedad_open_siempre_tiene_acceso(self):
        Property.objects.create(
            supplier=self.supplier_profile,
            name="Casa Abierta",
            slug="casa-abierta",
            access_type=PropertyAccessType.OPEN,
            base_price_per_night=Decimal("2000.00"),
            security_deposit=Decimal("500.00"),
            cleaning_fee=Decimal("0.00"),
            max_guests=4,
        )
        respuesta = self.client.get(reverse("property-detail", args=["casa-abierta"]))
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertTrue(respuesta.data["user_has_access"])

    def test_listado_solo_incluye_propiedades_activas(self):
        Property.objects.create(
            supplier=self.supplier_profile,
            name="Fuera de servicio",
            slug="fuera-de-servicio",
            access_type=PropertyAccessType.OPEN,
            base_price_per_night=Decimal("1000.00"),
            security_deposit=Decimal("0.00"),
            cleaning_fee=Decimal("0.00"),
            max_guests=2,
            is_active=False,
        )
        respuesta = self.client.get(reverse("property-list"))
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        slugs = {fila["slug"] for fila in respuesta.data["results"]}
        self.assertIn("casa-brava", slugs)
        self.assertNotIn("fuera-de-servicio", slugs)
