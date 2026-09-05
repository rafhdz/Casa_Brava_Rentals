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

from propiedades.models import FareType, PropertySettings
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
