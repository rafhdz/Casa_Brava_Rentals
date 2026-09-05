"""
Pruebas de las reglas que protegen el inventario.

Cubren la lógica de `reservaciones.services` y el contrato HTTP de sus vistas.

    ⚠️ Lo que estas pruebas verifican es la **regla** (se rechaza el solape, se
    libera y se re-adquiere el bloque), no el **bloqueo** contra concurrencia
    real: `select_for_update()` no hace nada sobre SQLite, y comprobar la
    serialización exige dos conexiones simultáneas contra PostgreSQL.
"""

from datetime import date, time, timedelta
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from pagos.models import PaymentStatus
from pagos.services import registrar_pago
from propiedades.models import FareType, PropertySettings
from proveedores.models import SpaMasseuse
from reservaciones import services
from reservaciones.models import Reservation, ReservationStatus, SpaBooking
from servicios.models import FoodAvailability, FoodMenu, MealType, SpaAvailability, Wine
from usuarios.models import ProfileStatus, RoleType, Usuario

HOY = date.today()


class BaseDominio(TestCase):
    """Semilla mínima compartida: configuración, tarifa, huéspedes y catálogo."""

    @classmethod
    def setUpTestData(cls):
        cls.configuracion = PropertySettings.objects.create(
            nightly_rate=Decimal("2000.00"), security_deposit=Decimal("1000.00")
        )
        cls.tarifa = FareType.objects.create(name="Estándar", surcharge_percentage=Decimal("0"))
        cls.tarifa_flexible = FareType.objects.create(
            name="Flexible", surcharge_percentage=Decimal("15")
        )
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
        cls.otro_huesped = Usuario.objects.create_user(
            email="carlos@test.com",
            password="changeme123",
            first_name="Carlos",
            apellido_paterno="Ruiz",
        )
        cls.masajista = SpaMasseuse.objects.create(name="Lucía")


class CalculoDeTotalTests(BaseDominio):
    def test_total_incluye_recargo_y_deposito(self):
        total = services.calcular_total_estadia(
            check_in=HOY,
            check_out=HOY + timedelta(days=2),
            fare_type=self.tarifa_flexible,
            configuracion=self.configuracion,
        )
        # 2 noches × 2000 = 4000, +15% = 4600, + 1000 de depósito.
        self.assertEqual(total, Decimal("5600.00"))


class SolapamientoTests(BaseDominio):
    def _reservar(self, dia_inicio, dia_fin, status=ReservationStatus.CONFIRMADA, guest=None):
        return services.crear_reservacion(
            guest=guest or self.huesped,
            check_in=HOY + timedelta(days=dia_inicio),
            check_out=HOY + timedelta(days=dia_fin),
            fare_type=self.tarifa,
            status=status,
        )

    def test_rechaza_fechas_invertidas(self):
        with self.assertRaises(services.FechasInvalidasError):
            self._reservar(5, 5)

    def test_rechaza_rango_encimado_con_confirmada(self):
        self._reservar(10, 15)
        with self.assertRaises(services.SolapamientoError):
            self._reservar(12, 18, guest=self.otro_huesped)

    def test_rechaza_rango_encimado_con_pendiente(self):
        """Una `pendiente` también ocupa el calendario.

        `checkoutStay` crea la estadía del huésped en `pendiente`, no en
        `confirmada` — si el chequeo de solapamiento solo mirara confirmadas,
        dos huéspedes podrían quedarse cada uno con una reserva `pendiente`
        sobre las mismas fechas sin que nada lo impidiera hasta que un admin
        intentara confirmar la segunda. Por eso el chequeo corre contra
        `activas()` (pendiente o confirmada) y debe rechazar esto en el
        momento de crear, no después.
        """
        self._reservar(10, 15, status=ReservationStatus.PENDIENTE)
        with self.assertRaises(services.SolapamientoError):
            self._reservar(12, 18, guest=self.otro_huesped, status=ReservationStatus.PENDIENTE)

    def test_permite_checkin_el_mismo_dia_del_checkout_anterior(self):
        """Intervalo semi-abierto: entrar el día que otro sale no es conflicto."""
        self._reservar(10, 15)
        reservacion = self._reservar(15, 20, guest=self.otro_huesped)
        self.assertIsNotNone(reservacion.pk)

    def test_reactivar_a_pendiente_con_fechas_ya_tomadas_se_rechaza(self):
        """El disparador de reactivación cubre `pendiente`, no solo `confirmada`.

        Se cancela una reserva (libera sus fechas), otro huésped toma esas
        mismas fechas, y al intentar reactivar la primera —incluso solo hacia
        `pendiente`, sin pasar por `confirmada`— debe rechazarse: una
        `pendiente` reactivada vuelve a ocupar el calendario tanto como la que
        ya está ahí.
        """
        reservacion = self._reservar(10, 15)
        services.actualizar_reservacion(reservacion.pk, status=ReservationStatus.CANCELADA)
        self._reservar(12, 18, guest=self.otro_huesped, status=ReservationStatus.PENDIENTE)
        with self.assertRaises(services.SolapamientoError):
            services.actualizar_reservacion(reservacion.pk, status=ReservationStatus.PENDIENTE)

    def test_una_cancelada_libera_las_fechas(self):
        confirmada = self._reservar(10, 15)
        services.actualizar_reservacion(confirmada.pk, status=ReservationStatus.CANCELADA)
        self.assertIsNotNone(self._reservar(12, 18, guest=self.otro_huesped))

    def test_el_soft_delete_no_borra_la_fila(self):
        reservacion = self._reservar(10, 15)
        services.eliminar_reservacion(reservacion.pk)
        self.assertTrue(Reservation.objects.filter(pk=reservacion.pk).exists())
        self.assertFalse(Reservation.objects.vigentes().filter(pk=reservacion.pk).exists())


class InventarioSpaTests(BaseDominio):
    def setUp(self):
        self.reservacion = services.crear_reservacion(
            guest=self.huesped,
            check_in=HOY + timedelta(days=1),
            check_out=HOY + timedelta(days=5),
            fare_type=self.tarifa,
            status=ReservationStatus.CONFIRMADA,
        )
        self.dia = HOY + timedelta(days=2)
        self.hora = time(14, 0)
        self.bloque = SpaAvailability.objects.create(
            masseuse=self.masajista, available_date=self.dia, available_time=self.hora
        )

    def _reservar_bloque(self, reservacion=None):
        return services.reservar_bloque_spa(
            reservacion=reservacion or self.reservacion,
            masseuse_id=self.masajista.pk,
            date=self.dia,
            time=self.hora,
            price_per_hour=Decimal("600.00"),
        )

    def test_reservar_marca_el_bloque_como_ocupado(self):
        booking = self._reservar_bloque()
        self.bloque.refresh_from_db()
        self.assertTrue(self.bloque.is_booked)
        self.assertEqual(booking.reservation, self.reservacion)

    def test_un_segundo_huesped_no_puede_tomar_el_mismo_bloque(self):
        self._reservar_bloque()
        otra = services.crear_reservacion(
            guest=self.otro_huesped,
            check_in=HOY + timedelta(days=20),
            check_out=HOY + timedelta(days=25),
            fare_type=self.tarifa,
            status=ReservationStatus.CONFIRMADA,
        )
        with self.assertRaises(services.SlotNoDisponibleError):
            self._reservar_bloque(reservacion=otra)

    def test_bloque_inexistente_se_rechaza(self):
        with self.assertRaises(services.SlotNoDisponibleError):
            services.reservar_bloque_spa(
                reservacion=self.reservacion,
                masseuse_id=self.masajista.pk,
                date=self.dia,
                time=time(23, 0),
                price_per_hour=Decimal("600.00"),
            )

    def test_liberar_borra_la_reserva_y_devuelve_el_bloque(self):
        booking = self._reservar_bloque()
        services.liberar_spa_booking(booking)
        self.bloque.refresh_from_db()
        self.assertFalse(self.bloque.is_booked)
        self.assertFalse(SpaBooking.objects.filter(pk=booking.pk).exists())

    def test_cancelar_libera_el_bloque_pero_conserva_el_historial(self):
        booking = self._reservar_bloque()
        services.actualizar_reservacion(self.reservacion.pk, status=ReservationStatus.CANCELADA)
        self.bloque.refresh_from_db()
        self.assertFalse(self.bloque.is_booked)
        self.assertTrue(SpaBooking.objects.filter(pk=booking.pk).exists())

    def test_el_soft_delete_tambien_libera_el_bloque(self):
        self._reservar_bloque()
        services.eliminar_reservacion(self.reservacion.pk)
        self.bloque.refresh_from_db()
        self.assertFalse(self.bloque.is_booked)

    def test_reactivar_vuelve_a_tomar_el_bloque(self):
        self._reservar_bloque()
        services.actualizar_reservacion(self.reservacion.pk, status=ReservationStatus.CANCELADA)
        services.actualizar_reservacion(self.reservacion.pk, status=ReservationStatus.CONFIRMADA)
        self.bloque.refresh_from_db()
        self.assertTrue(self.bloque.is_booked)

    def test_reactivar_se_rechaza_si_otro_huesped_ya_tomo_el_bloque(self):
        """Cancelar → revender → reactivar: la reactivación debe fallar entera."""
        self._reservar_bloque()
        services.actualizar_reservacion(self.reservacion.pk, status=ReservationStatus.CANCELADA)

        otra = services.crear_reservacion(
            guest=self.otro_huesped,
            check_in=HOY + timedelta(days=20),
            check_out=HOY + timedelta(days=25),
            fare_type=self.tarifa,
            status=ReservationStatus.CONFIRMADA,
        )
        self._reservar_bloque(reservacion=otra)

        with self.assertRaises(services.SlotYaTomadoError):
            services.actualizar_reservacion(
                self.reservacion.pk, status=ReservationStatus.CONFIRMADA
            )

        self.reservacion.refresh_from_db()
        self.assertEqual(self.reservacion.status, ReservationStatus.CANCELADA)


class ComidaYVinosTests(BaseDominio):
    def setUp(self):
        self.reservacion = services.crear_reservacion(
            guest=self.huesped,
            check_in=HOY + timedelta(days=1),
            check_out=HOY + timedelta(days=5),
            fare_type=self.tarifa,
            status=ReservationStatus.CONFIRMADA,
        )
        self.menu = FoodMenu.objects.create(
            meal_type=MealType.CENA, name="Cena mexicana", price_per_person=Decimal("450.00")
        )
        self.dia = HOY + timedelta(days=2)

    def test_comida_exige_dia_habilitado(self):
        with self.assertRaises(services.DiaNoDisponibleError):
            services.crear_food_booking(
                reservacion=self.reservacion,
                date=self.dia,
                meal_type=MealType.CENA,
                menu=self.menu,
                guests_count=4,
            )

    def test_el_total_de_comida_se_deriva_del_catalogo(self):
        FoodAvailability.objects.create(available_date=self.dia)
        booking = services.crear_food_booking(
            reservacion=self.reservacion,
            date=self.dia,
            meal_type=MealType.CENA,
            menu=self.menu,
            guests_count=4,
        )
        self.assertEqual(booking.total_price, Decimal("1800.00"))

    def test_el_pedido_de_vinos_deriva_su_total_de_las_lineas(self):
        vino = Wine.objects.create(name="Tinto", type="Tinto", price=Decimal("500.00"), stock=10)
        pedido = services.crear_wine_order(
            reservacion=self.reservacion, lineas=[{"wine": vino, "quantity": 3}]
        )
        self.assertEqual(pedido.total_price, Decimal("1500.00"))
        self.assertEqual(pedido.items.count(), 1)

    def test_no_se_agregan_servicios_a_una_reservacion_cancelada(self):
        services.actualizar_reservacion(self.reservacion.pk, status=ReservationStatus.CANCELADA)
        self.reservacion.refresh_from_db()
        with self.assertRaises(services.ReglaDeNegocioError):
            services.crear_wine_order(
                reservacion=self.reservacion,
                lineas=[
                    {
                        "wine": Wine.objects.create(
                            name="Blanco", type="Blanco", price=Decimal("400.00")
                        ),
                        "quantity": 1,
                    }
                ],
            )


class EstadoDePagoTests(BaseDominio):
    def setUp(self):
        self.reservacion = services.crear_reservacion(
            guest=self.huesped,
            check_in=HOY + timedelta(days=1),
            check_out=HOY + timedelta(days=3),
            fare_type=self.tarifa,
            status=ReservationStatus.CONFIRMADA,
        )
        # 2 noches × 2000 + 1000 de depósito.
        self.assertEqual(self.reservacion.total_amount, Decimal("5000.00"))

    def test_un_anticipo_deja_la_reservacion_en_parcial(self):
        registrar_pago(reservacion=self.reservacion, amount=Decimal("2000.00"))
        self.reservacion.refresh_from_db()
        self.assertEqual(self.reservacion.payment_status, PaymentStatus.PARCIAL)

    def test_cubrir_el_gran_total_la_marca_completada(self):
        registrar_pago(reservacion=self.reservacion, amount=Decimal("5000.00"))
        self.reservacion.refresh_from_db()
        self.assertEqual(self.reservacion.payment_status, PaymentStatus.COMPLETADO)

    def test_los_servicios_contratados_suben_el_monto_a_cubrir(self):
        Wine.objects.create(name="Tinto", type="Tinto", price=Decimal("500.00"))
        services.crear_wine_order(
            reservacion=self.reservacion,
            lineas=[{"wine": Wine.objects.first(), "quantity": 2}],
        )
        registrar_pago(reservacion=self.reservacion, amount=Decimal("5000.00"))
        self.reservacion.refresh_from_db()
        # La estadía está cubierta, pero los vinos no: sigue parcial.
        self.assertEqual(self.reservacion.payment_status, PaymentStatus.PARCIAL)


class ApiReservacionesTests(BaseDominio):
    """Contrato HTTP: autenticación, alcance por rol y códigos de error."""

    def setUp(self):
        self.client = APIClient()
        self.url = reverse("reservacion-list")

    def _autenticar(self, usuario):
        respuesta = self.client.post(
            reverse("token_obtain_pair"),
            {"email": usuario.email, "password": "changeme123"},
            format="json",
        )
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {respuesta.data['access']}")
        return respuesta.data

    def test_sin_token_no_hay_acceso(self):
        self.assertEqual(self.client.get(self.url).status_code, 401)

    def test_el_token_incluye_el_rol(self):
        datos = self._autenticar(self.admin)
        self.assertEqual(datos["user"]["role"], RoleType.ADMIN)

    def test_el_huesped_reserva_a_su_propio_nombre(self):
        self._autenticar(self.huesped)
        respuesta = self.client.post(
            self.url,
            {
                # Intento de reservar a nombre de otro: debe ignorarse.
                "guest": str(self.otro_huesped.pk),
                "check_in": str(HOY + timedelta(days=30)),
                "check_out": str(HOY + timedelta(days=33)),
                "fare_type": str(self.tarifa.pk),
                "total_amount": "1.00",
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        self.assertEqual(respuesta.data["guest"]["id"], str(self.huesped.pk))
        # El monto que mandó el cliente se descarta: 3 noches × 2000 + 1000.
        self.assertEqual(Decimal(respuesta.data["total_amount"]), Decimal("7000.00"))

    def test_el_huesped_solo_ve_sus_reservaciones(self):
        services.crear_reservacion(
            guest=self.otro_huesped,
            check_in=HOY + timedelta(days=40),
            check_out=HOY + timedelta(days=42),
            fare_type=self.tarifa,
        )
        propia = services.crear_reservacion(
            guest=self.huesped,
            check_in=HOY + timedelta(days=50),
            check_out=HOY + timedelta(days=52),
            fare_type=self.tarifa,
        )
        self._autenticar(self.huesped)
        respuesta = self.client.get(self.url)
        self.assertEqual(respuesta.data["count"], 1)
        self.assertEqual(respuesta.data["results"][0]["id"], str(propia.pk))

    def test_el_huesped_no_puede_cambiar_el_estado_de_su_reservacion(self):
        propia = services.crear_reservacion(
            guest=self.huesped,
            check_in=HOY + timedelta(days=60),
            check_out=HOY + timedelta(days=62),
            fare_type=self.tarifa,
        )
        self._autenticar(self.huesped)
        respuesta = self.client.patch(
            reverse("reservacion-detail", args=[propia.pk]),
            {"status": ReservationStatus.CONFIRMADA},
            format="json",
        )
        self.assertEqual(respuesta.status_code, 403)

    def test_un_choque_de_fechas_responde_409(self):
        services.crear_reservacion(
            guest=self.otro_huesped,
            check_in=HOY + timedelta(days=70),
            check_out=HOY + timedelta(days=75),
            fare_type=self.tarifa,
            status=ReservationStatus.CONFIRMADA,
        )
        self._autenticar(self.huesped)
        respuesta = self.client.post(
            self.url,
            {
                "check_in": str(HOY + timedelta(days=72)),
                "check_out": str(HOY + timedelta(days=78)),
                "fare_type": str(self.tarifa.pk),
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, 409, respuesta.data)

    def test_ocupadas_incluye_pendientes_y_confirmadas(self):
        """El calendario de `/reservar` debe pintar como ocupadas también las
        `pendiente`, no solo las `confirmada` — si no, el huésped ve una fecha
        libre que el alta va a rechazar de todos modos (ver
        `test_rechaza_rango_encimado_con_pendiente`)."""
        pendiente = services.crear_reservacion(
            guest=self.otro_huesped,
            check_in=HOY + timedelta(days=80),
            check_out=HOY + timedelta(days=82),
            fare_type=self.tarifa,
            status=ReservationStatus.PENDIENTE,
        )
        confirmada = services.crear_reservacion(
            guest=self.huesped,
            check_in=HOY + timedelta(days=90),
            check_out=HOY + timedelta(days=92),
            fare_type=self.tarifa,
            status=ReservationStatus.CONFIRMADA,
        )
        self._autenticar(self.huesped)
        respuesta = self.client.get(reverse("reservacion-ocupadas"))
        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        # `respuesta.data` es la respuesta ya parseada de vuelta a objetos
        # Python: `check_in`/`check_out` llegan como `date`, no como string.
        rangos = {(r["check_in"], r["check_out"]) for r in respuesta.data}
        self.assertIn((pendiente.check_in, pendiente.check_out), rangos)
        self.assertIn((confirmada.check_in, confirmada.check_out), rangos)


class ApiUsuariosTests(BaseDominio):
    def setUp(self):
        self.client = APIClient()

    def _autenticar(self, usuario):
        respuesta = self.client.post(
            reverse("token_obtain_pair"),
            {"email": usuario.email, "password": "changeme123"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {respuesta.data['access']}")

    def test_registro_publico_crea_siempre_un_huesped(self):
        respuesta = self.client.post(
            reverse("registro"),
            {
                "email": "nuevo@test.com",
                "password": "unaClaveSegura9",
                "password_confirm": "unaClaveSegura9",
                "first_name": "Nuevo",
                "apellido_paterno": "Huésped",
                "role": RoleType.ADMIN,  # ignorado: el campo no existe en el serializer
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        self.assertEqual(Usuario.objects.get(email="nuevo@test.com").role, RoleType.GUEST)

    def test_un_huesped_no_puede_ascenderse_a_admin(self):
        self._autenticar(self.huesped)
        respuesta = self.client.patch(
            reverse("usuario-detail", args=[self.huesped.pk]),
            {"role": RoleType.ADMIN},
            format="json",
        )
        self.assertEqual(respuesta.status_code, 400)
        self.huesped.refresh_from_db()
        self.assertEqual(self.huesped.role, RoleType.GUEST)

    def test_un_huesped_no_ve_los_perfiles_ajenos(self):
        self._autenticar(self.huesped)
        respuesta = self.client.get(reverse("usuario-detail", args=[self.otro_huesped.pk]))
        self.assertEqual(respuesta.status_code, 404)

    def test_el_admin_no_puede_eliminar_su_propia_cuenta(self):
        self._autenticar(self.admin)
        respuesta = self.client.delete(reverse("usuario-detail", args=[self.admin.pk]))
        self.assertEqual(respuesta.status_code, 400)
