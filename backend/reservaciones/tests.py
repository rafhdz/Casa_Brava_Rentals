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
from propiedades.models import (
    FareType,
    Property,
    PropertyAccessGrant,
    PropertyAccessType,
    PropertySettings,
    SupplierProfile,
)
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

        # Tenant 0: mismo slug que usa el fallback de
        # `services._propiedad_tenant_cero`, así que todo `crear_reservacion`
        # que no especifique `propiedad` cae aquí. INVITE_ONLY con ambos
        # huéspedes ya invitados, igual que deja `seed_demo`.
        cls.supplier_profile = SupplierProfile.objects.create(
            user=cls.admin, business_name="Casa Brava"
        )
        cls.propiedad = Property.objects.create(
            supplier=cls.supplier_profile,
            name="Casa Brava",
            slug="casa-brava",
            access_type=PropertyAccessType.INVITE_ONLY,
            base_price_per_night=cls.configuracion.nightly_rate,
            security_deposit=cls.configuracion.security_deposit,
            cleaning_fee=Decimal("0.00"),
            max_guests=10,
        )
        PropertyAccessGrant.objects.create(property=cls.propiedad, user=cls.huesped)
        PropertyAccessGrant.objects.create(property=cls.propiedad, user=cls.otro_huesped)


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


class MultiTenantTests(BaseDominio):
    """Aislamiento entre propiedades y gobernanza `INVITE_ONLY`."""

    def _crear_propiedad(self, slug, access_type=PropertyAccessType.OPEN):
        return Property.objects.create(
            supplier=self.supplier_profile,
            name=f"Propiedad {slug}",
            slug=slug,
            access_type=access_type,
            base_price_per_night=Decimal("3000.00"),
            security_deposit=Decimal("500.00"),
            cleaning_fee=Decimal("0.00"),
            max_guests=6,
        )

    def test_mismas_fechas_en_propiedades_distintas_no_chocan(self):
        """Dos propiedades no comparten calendario: los mismos días no son un
        solapamiento si son de dueños/propiedades distintos."""
        otra_propiedad = self._crear_propiedad("casa-azul")

        reservacion_1 = services.crear_reservacion(
            guest=self.huesped,
            propiedad=self.propiedad,
            check_in=HOY + timedelta(days=100),
            check_out=HOY + timedelta(days=105),
            fare_type=self.tarifa,
            status=ReservationStatus.CONFIRMADA,
        )
        reservacion_2 = services.crear_reservacion(
            guest=self.otro_huesped,
            propiedad=otra_propiedad,
            check_in=HOY + timedelta(days=100),
            check_out=HOY + timedelta(days=105),
            fare_type=self.tarifa,
            status=ReservationStatus.CONFIRMADA,
        )

        self.assertNotEqual(reservacion_1.property_id, reservacion_2.property_id)
        self.assertEqual(reservacion_1.check_in, reservacion_2.check_in)
        self.assertEqual(reservacion_1.check_out, reservacion_2.check_out)

    def test_invite_only_rechaza_sin_grant(self):
        propiedad_privada = self._crear_propiedad(
            "villa-privada", access_type=PropertyAccessType.INVITE_ONLY
        )
        with self.assertRaises(services.AccesoRestringidoError):
            services.crear_reservacion(
                guest=self.huesped,
                propiedad=propiedad_privada,
                check_in=HOY + timedelta(days=110),
                check_out=HOY + timedelta(days=112),
                fare_type=self.tarifa,
            )
        self.assertFalse(Reservation.objects.filter(property=propiedad_privada).exists())

    def test_invite_only_permite_con_grant(self):
        propiedad_privada = self._crear_propiedad(
            "villa-privada", access_type=PropertyAccessType.INVITE_ONLY
        )
        PropertyAccessGrant.objects.create(property=propiedad_privada, user=self.huesped)

        reservacion = services.crear_reservacion(
            guest=self.huesped,
            propiedad=propiedad_privada,
            check_in=HOY + timedelta(days=110),
            check_out=HOY + timedelta(days=112),
            fare_type=self.tarifa,
        )
        self.assertEqual(reservacion.property_id, propiedad_privada.pk)

    def test_open_no_exige_grant(self):
        propiedad_abierta = self._crear_propiedad("casa-abierta", access_type=PropertyAccessType.OPEN)
        reservacion = services.crear_reservacion(
            guest=self.huesped,
            propiedad=propiedad_abierta,
            check_in=HOY + timedelta(days=115),
            check_out=HOY + timedelta(days=117),
            fare_type=self.tarifa,
        )
        self.assertEqual(reservacion.property_id, propiedad_abierta.pk)

    def test_reservacion_sin_propiedad_cae_en_tenant_cero(self):
        reservacion = services.crear_reservacion(
            guest=self.huesped,
            check_in=HOY + timedelta(days=120),
            check_out=HOY + timedelta(days=122),
            fare_type=self.tarifa,
        )
        self.assertEqual(reservacion.property_id, self.propiedad.pk)


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



class CatalogosEnUsoTests(BaseDominio):
    """Borrar una masajista, un menú o un vino con historial responde 409.

    El panel de catálogos del owner-panel muestra ese mensaje en un toast y
    deja el modal abierto; esto fija el contrato del que depende (la tarifa
    ya la cubre `propiedades.tests`). Se prueba incluso con la reservación en
    soft delete: el historial sigue existiendo y sigue protegiendo al catálogo.
    """

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)
        reservacion = services.crear_reservacion(
            guest=self.huesped,
            check_in=HOY + timedelta(days=1),
            check_out=HOY + timedelta(days=5),
            fare_type=self.tarifa,
            status=ReservationStatus.CONFIRMADA,
        )
        dia = HOY + timedelta(days=2)
        SpaAvailability.objects.create(
            masseuse=self.masajista, available_date=dia, available_time=time(10, 0)
        )
        services.reservar_bloque_spa(
            reservacion=reservacion,
            masseuse_id=self.masajista.pk,
            date=dia,
            time=time(10, 0),
            price_per_hour=Decimal("600.00"),
        )
        FoodAvailability.objects.create(available_date=dia)
        self.menu = FoodMenu.objects.create(
            meal_type=MealType.CENA, name="Cena", price_per_person=Decimal("450.00")
        )
        services.crear_food_booking(
            reservacion=reservacion, date=dia, meal_type=MealType.CENA, menu=self.menu, guests_count=2
        )
        self.vino = Wine.objects.create(name="Tinto", type="Tinto", price=Decimal("500.00"), stock=5)
        services.crear_wine_order(reservacion=reservacion, lineas=[{"wine": self.vino, "quantity": 1}])
        services.eliminar_reservacion(reservacion.pk)

    def _assert_protegido(self, url_name, objeto):
        respuesta = self.client.delete(reverse(url_name, args=[objeto.pk]))
        self.assertEqual(respuesta.status_code, 409, respuesta.data)
        self.assertIn("detail", respuesta.data)
        self.assertTrue(type(objeto).objects.filter(pk=objeto.pk).exists())

    def test_masajista_con_historial_responde_409(self):
        self._assert_protegido("masajista-detail", self.masajista)

    def test_menu_con_historial_responde_409(self):
        self._assert_protegido("food-menu-detail", self.menu)

    def test_vino_con_historial_responde_409(self):
        self._assert_protegido("wine-detail", self.vino)

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



class ExencionDePropietarioTests(BaseDominio):
    """`payment_status = "na"`: la estancia de un propietario en su propia
    casa no se cobra. El panel lo sugiere; estas pruebas fijan la regla real."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.propietario = Usuario.objects.create_user(
            email="holder@test.com",
            password="changeme123",
            first_name="Carlos",
            apellido_paterno="Dueño",
            role=RoleType.HOLDER,
            status=ProfileStatus.ACTIVO,
        )
        PropertyAccessGrant.objects.create(property=cls.propiedad, user=cls.propietario)

    def _reservar(self, guest, dia_inicio, **extra):
        return services.crear_reservacion(
            guest=guest,
            check_in=HOY + timedelta(days=dia_inicio),
            check_out=HOY + timedelta(days=dia_inicio + 2),
            fare_type=self.tarifa,
            **extra,
        )

    def test_la_estancia_de_un_propietario_nace_exenta(self):
        reservacion = self._reservar(self.propietario, 200)
        self.assertEqual(reservacion.payment_status, PaymentStatus.NO_APLICA)

    def test_el_admin_puede_cobrarle_a_un_propietario_si_lo_indica(self):
        reservacion = self._reservar(
            self.propietario, 205, payment_status=PaymentStatus.PENDIENTE
        )
        self.assertEqual(reservacion.payment_status, PaymentStatus.PENDIENTE)

    def test_la_estancia_de_un_huesped_no_puede_ser_exenta(self):
        with self.assertRaises(services.ExencionInvalidaError):
            self._reservar(self.huesped, 210, payment_status=PaymentStatus.NO_APLICA)
        self.assertFalse(Reservation.objects.filter(guest=self.huesped).exists())

    def test_no_se_puede_exentar_despues_a_un_huesped(self):
        reservacion = self._reservar(self.huesped, 215)
        with self.assertRaises(services.ExencionInvalidaError):
            services.actualizar_reservacion(
                reservacion.pk, payment_status=PaymentStatus.NO_APLICA
            )
        reservacion.refresh_from_db()
        self.assertEqual(reservacion.payment_status, PaymentStatus.PENDIENTE)

    def test_un_movimiento_no_revierte_la_exencion(self):
        reservacion = self._reservar(self.propietario, 220)
        registrar_pago(reservacion=reservacion, amount=Decimal("100.00"))
        reservacion.refresh_from_db()
        self.assertEqual(reservacion.payment_status, PaymentStatus.NO_APLICA)

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

    def _crear_propiedad_privada(self, slug="villa-privada"):
        return Property.objects.create(
            supplier=self.supplier_profile,
            name="Villa Privada",
            slug=slug,
            access_type=PropertyAccessType.INVITE_ONLY,
            base_price_per_night=Decimal("5000.00"),
            security_deposit=Decimal("1000.00"),
            cleaning_fee=Decimal("0.00"),
            max_guests=8,
        )

    def test_reservar_invite_only_sin_grant_responde_403(self):
        """`AccesoRestringidoError` se traduce a 403, no a 409/400: no es una
        carrera perdida ni un dato inválido, es una operación no autorizada."""
        propiedad_privada = self._crear_propiedad_privada()
        self._autenticar(self.huesped)  # sin grant sobre esta propiedad nueva
        respuesta = self.client.post(
            self.url,
            {
                "check_in": str(HOY + timedelta(days=130)),
                "check_out": str(HOY + timedelta(days=132)),
                "fare_type": str(self.tarifa.pk),
                "property_slug": propiedad_privada.slug,
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, 403, respuesta.data)
        self.assertFalse(Reservation.objects.filter(property=propiedad_privada).exists())

    def test_reservar_invite_only_con_grant_responde_201(self):
        propiedad_privada = self._crear_propiedad_privada()
        PropertyAccessGrant.objects.create(property=propiedad_privada, user=self.huesped)
        self._autenticar(self.huesped)
        respuesta = self.client.post(
            self.url,
            {
                "check_in": str(HOY + timedelta(days=130)),
                "check_out": str(HOY + timedelta(days=132)),
                "fare_type": str(self.tarifa.pk),
                "property_slug": propiedad_privada.slug,
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        self.assertEqual(respuesta.data["property"]["slug"], propiedad_privada.slug)
        self.assertTrue(
            Reservation.objects.filter(pk=respuesta.data["id"], property=propiedad_privada).exists()
        )

    def test_reservar_sin_propiedad_usa_tenant_cero(self):
        """Sin `property_id`/`property_slug` en el payload, cae al fallback de
        Tenant 0 — el mismo comportamiento que tenía el sistema de una sola
        casa antes del modelo multi-tenant."""
        self._autenticar(self.huesped)
        respuesta = self.client.post(
            self.url,
            {
                "check_in": str(HOY + timedelta(days=135)),
                "check_out": str(HOY + timedelta(days=137)),
                "fare_type": str(self.tarifa.pk),
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, 201, respuesta.data)
        self.assertEqual(respuesta.data["property"]["slug"], "casa-brava")


    def test_exentar_a_un_huesped_desde_la_api_responde_400(self):
        self._autenticar(self.admin)
        respuesta = self.client.post(
            self.url,
            {
                "guest": str(self.huesped.pk),
                "check_in": str(HOY + timedelta(days=140)),
                "check_out": str(HOY + timedelta(days=142)),
                "fare_type": str(self.tarifa.pk),
                "payment_status": PaymentStatus.NO_APLICA,
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, 400, respuesta.data)
        self.assertIn("detail", respuesta.data)

    def test_filtrar_por_propiedad_no_mezcla_otras_casas(self):
        """`?property=<slug>` es lo que usa el panel de cada casa para no
        listar reservaciones de otras propiedades del marketplace."""
        otra_propiedad = Property.objects.create(
            supplier=self.supplier_profile,
            name="Casa Azul",
            slug="casa-azul",
            access_type=PropertyAccessType.OPEN,
            base_price_per_night=Decimal("3000.00"),
            security_deposit=Decimal("500.00"),
            cleaning_fee=Decimal("0.00"),
            max_guests=6,
        )
        propia = services.crear_reservacion(
            guest=self.huesped,
            check_in=HOY + timedelta(days=150),
            check_out=HOY + timedelta(days=152),
            fare_type=self.tarifa,
        )
        services.crear_reservacion(
            guest=self.otro_huesped,
            propiedad=otra_propiedad,
            check_in=HOY + timedelta(days=150),
            check_out=HOY + timedelta(days=152),
            fare_type=self.tarifa,
        )
        self._autenticar(self.admin)

        respuesta = self.client.get(self.url, {"property": "casa-brava"})

        self.assertEqual(respuesta.status_code, 200, respuesta.data)
        self.assertEqual(respuesta.data["count"], 1)
        self.assertEqual(respuesta.data["results"][0]["id"], str(propia.pk))

    def test_un_movimiento_no_puede_marcarse_no_aplica(self):
        reservacion = services.crear_reservacion(
            guest=self.huesped,
            check_in=HOY + timedelta(days=160),
            check_out=HOY + timedelta(days=162),
            fare_type=self.tarifa,
        )
        self._autenticar(self.admin)
        respuesta = self.client.post(
            reverse("pago-list"),
            {
                "reservation": str(reservacion.pk),
                "amount": "100.00",
                "status": PaymentStatus.NO_APLICA,
            },
            format="json",
        )
        self.assertEqual(respuesta.status_code, 400, respuesta.data)
        self.assertIn("status", respuesta.data)

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
