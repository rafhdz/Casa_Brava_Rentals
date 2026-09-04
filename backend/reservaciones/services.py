"""
Lógica transaccional del dominio.

Este módulo es el traslado a Django de las funciones plpgsql que en Supabase
protegían el inventario (`book_spa_slot`, `release_spa_booking`,
`release_spa_slots_for_reservation`, `reacquire_spa_slots_for_reservation`) más
las reglas de solapamiento que vivían en las Server Actions.

Lo que allá garantizaba la atomicidad del cuerpo de una función plpgsql, aquí lo
garantiza `transaction.atomic()`; lo que allá serializaba a dos clientes
concurrentes (`select ... for update`), aquí lo hace `select_for_update()`.

    ⚠️ `select_for_update()` NO bloquea nada en SQLite: Django lo ignora en
    silencio cuando el backend no lo soporta. Toda la protección anti
    double-booking de este archivo depende de correr sobre PostgreSQL.

**Orden de bloqueo** — siempre el mismo, en toda función que tome más de un
lock, para que dos transacciones concurrentes no se abracen en un deadlock:

    1. `PropertySettings` (la fila única: serializa el calendario de la casa)
    2. `Reservation`
    3. `SpaAvailability`, recorrida en orden (masajista, fecha, hora)

Las vistas no deben replicar estas reglas ni escribir directamente sobre
`SpaAvailability`: todo pasa por aquí.
"""

from decimal import Decimal, ROUND_HALF_UP

from django.db import transaction
from django.utils import timezone

from propiedades.models import PropertySettings
from reservaciones.models import (
    ESTADOS_ACTIVOS,
    FoodBooking,
    Reservation,
    ReservationStatus,
    SpaBooking,
    WineOrder,
    WineOrderItem,
)
from servicios.models import FoodAvailability, SpaAvailability

CENTAVOS = Decimal("0.01")

#: Estados desde los que reactivar una reservación exige recuperar su inventario.
ESTADOS_INACTIVOS = (ReservationStatus.CANCELADA, ReservationStatus.FINALIZADA)


# ---------------------------------------------------------------------------
# Errores de dominio
# ---------------------------------------------------------------------------
# Se traducen a respuestas HTTP en `reservaciones.views`. El mensaje ya viene
# redactado en español y pensado para el huésped, igual que los `raise
# exception` de las funciones originales de Postgres.


class ReglaDeNegocioError(Exception):
    """Base de los errores esperables del dominio (no son fallas técnicas)."""


class FechasInvalidasError(ReglaDeNegocioError):
    pass


class SolapamientoError(ReglaDeNegocioError):
    pass


class SlotNoDisponibleError(ReglaDeNegocioError):
    pass


class SlotYaTomadoError(ReglaDeNegocioError):
    """Equivalente del prefijo `SPA_SLOT_TAKEN` de la función plpgsql."""


class DiaNoDisponibleError(ReglaDeNegocioError):
    pass


class ConfiguracionFaltanteError(ReglaDeNegocioError):
    pass


# ---------------------------------------------------------------------------
# Reglas de fechas y tarifas
# ---------------------------------------------------------------------------


def validar_fechas(check_in, check_out):
    """La salida debe ser posterior a la entrada.

    Es la validación de UX con mensaje en español; el check constraint
    `reservations_check_out_after_check_in` sigue siendo la garantía dura.
    """
    if check_out <= check_in:
        raise FechasInvalidasError("La fecha de salida debe ser posterior a la de entrada.")


def hay_solapamiento(check_in, check_out, excluir_id=None):
    """
    ¿Choca este rango con alguna reservación **activa** (pendiente o
    confirmada) y vigente?

    Se verifica contra `activas()`, no solo contra `confirmadas()`: una
    reservación `pendiente` ya ocupa el calendario desde que se crea, porque es
    el registro que un huésped ve como "mi reserva" en cuanto paga la estadía
    (`checkoutStay` la crea en `pendiente`, no en `confirmada`). Verificar solo
    contra confirmadas dejaba una ventana real de double-booking: dos huéspedes
    podían quedarse cada uno con una reservación `pendiente` sobre las mismas
    fechas, y solo se descubría el choque cuando un admin intentaba confirmar
    la segunda —demasiado tarde, con el huésped ya pensando que su lugar estaba
    apartado.

    Intervalo semi-abierto `[check_in, check_out)`: un check-out el mismo día
    que el check-in de otra reserva no es conflicto. Como el sistema modela una
    sola casa, no se filtra por propiedad — todas compiten por el mismo
    calendario.
    """
    conflictos = Reservation.objects.activas().filter(
        check_in__lt=check_out, check_out__gt=check_in
    )
    if excluir_id is not None:
        conflictos = conflictos.exclude(pk=excluir_id)
    return conflictos.exists()


def _asegurar_sin_solapamiento(check_in, check_out, excluir_id=None):
    if hay_solapamiento(check_in, check_out, excluir_id):
        raise SolapamientoError(
            "Las fechas seleccionadas se cruzan con otra reservación activa."
        )


def calcular_total_estadia(*, check_in, check_out, fare_type, configuracion):
    """
    Misma fórmula que el resumen de cobro del frontend:
    noches × tarifa + recargo del tipo de tarifa + depósito de garantía.

    El total se deriva **siempre en el servidor**; el monto que mande un cliente
    en el checkout de autoservicio no se usa.
    """
    noches = Decimal((check_out - check_in).days)
    subtotal = noches * configuracion.nightly_rate
    recargo = subtotal * (fare_type.surcharge_percentage / Decimal("100"))
    total = subtotal + recargo + configuracion.security_deposit
    return total.quantize(CENTAVOS, rounding=ROUND_HALF_UP)


def _bloquear_configuracion():
    """
    Toma el lock del calendario.

    La casa es una sola, así que su fila de `PropertySettings` sirve como punto
    de serialización: cualquier operación que decida si un rango de fechas está
    libre pasa por aquí primero. Sin este lock, dos transacciones concurrentes
    podrían leer "no hay solapamiento" a la vez e insertar reservaciones
    encimadas — `select_for_update()` sobre la consulta de solapamiento no
    serviría, porque bloquear filas que todavía no existen es imposible.
    """
    configuracion = PropertySettings.objects.select_for_update().first()
    if configuracion is None:
        raise ConfiguracionFaltanteError(
            "No hay configuración de la propiedad cargada (tarifa por noche y depósito)."
        )
    return configuracion


# ---------------------------------------------------------------------------
# Reservaciones
# ---------------------------------------------------------------------------


@transaction.atomic
def crear_reservacion(
    *,
    guest,
    check_in,
    check_out,
    fare_type,
    total_amount=None,
    status=ReservationStatus.PENDIENTE,
    payment_status=None,
):
    """
    Crea la estadía verificando disponibilidad bajo bloqueo.

    `total_amount` solo se respeta si viene explícito (el panel admin permite
    ajustar el monto a mano, p. ej. para un descuento); en el checkout de
    autoservicio del huésped se omite y el total se recalcula aquí.
    """
    validar_fechas(check_in, check_out)
    configuracion = _bloquear_configuracion()
    _asegurar_sin_solapamiento(check_in, check_out)

    if total_amount is None:
        total_amount = calcular_total_estadia(
            check_in=check_in,
            check_out=check_out,
            fare_type=fare_type,
            configuracion=configuracion,
        )

    campos = {
        "guest": guest,
        "check_in": check_in,
        "check_out": check_out,
        "fare_type": fare_type,
        "total_amount": total_amount,
        "status": status,
    }
    if payment_status is not None:
        campos["payment_status"] = payment_status

    return Reservation.objects.create(**campos)


@transaction.atomic
def actualizar_reservacion(reservation_id, **cambios):
    """
    Actualiza una reservación aplicando las reglas de inventario asociadas.

    Tres disparadores, en este orden:

    1. **Solapamiento** — se verifica si cambian las fechas, si la reservación
       se reactiva, o si el estado efectivo queda en `confirmada`, aunque las
       fechas no se toquen. Se verifica contra `activas()` (pendiente o
       confirmada), no solo confirmadas: una reservación `pendiente` ya ocupa
       el calendario desde que se crea (ver `hay_solapamiento`), así que
       reactivar una `cancelada`/`finalizada` de vuelta a `pendiente` —no solo
       a `confirmada`— también puede pisar fechas que otra reservación tomó
       mientras esta estaba inactiva; sin cubrir ese camino, dos reservas
       activas con fechas cruzadas podrían coexistir sin que nadie lo notara.
    2. **Reactivación** — si venía de `cancelada`/`finalizada` y vuelve a un
       estado activo, se re-adquieren sus bloques de spa **antes** de guardar,
       para poder abortar sin haber tocado la fila si alguno ya fue revendido.
    3. **Cancelación** — si el estado efectivo queda en `cancelada`, se liberan
       sus bloques **después** de guardar.
    """
    configuracion_bloqueada = False
    reservacion = Reservation.objects.select_for_update().get(pk=reservation_id)

    status_anterior = reservacion.status
    status_efectivo = cambios.get("status", status_anterior)
    check_in = cambios.get("check_in", reservacion.check_in)
    check_out = cambios.get("check_out", reservacion.check_out)

    cambian_fechas = "check_in" in cambios or "check_out" in cambios
    # Se usa el estado *anterior* real, no lo que mande el cliente: reactivar
    # es pasar de un estado inactivo a uno activo.
    es_reactivacion = status_anterior in ESTADOS_INACTIVOS and status_efectivo in ESTADOS_ACTIVOS
    if cambian_fechas or es_reactivacion or status_efectivo == ReservationStatus.CONFIRMADA:
        validar_fechas(check_in, check_out)
        _bloquear_configuracion()
        configuracion_bloqueada = True
        _asegurar_sin_solapamiento(check_in, check_out, excluir_id=reservacion.pk)

    if es_reactivacion:
        readquirir_slots_de_reservacion(reservacion, _configuracion_bloqueada=configuracion_bloqueada)

    for campo, valor in cambios.items():
        setattr(reservacion, campo, valor)
    reservacion.save()

    if status_efectivo == ReservationStatus.CANCELADA:
        liberar_slots_de_reservacion(reservacion)

    return reservacion


@transaction.atomic
def eliminar_reservacion(reservation_id):
    """
    Soft delete: marca `deleted_at` y devuelve al inventario los bloques de spa.

    Nunca un `DELETE` físico — eso arrastraría en cascada los bookings de
    servicios, que son el historial de lo contratado.
    """
    reservacion = Reservation.objects.select_for_update().get(pk=reservation_id)
    reservacion.deleted_at = timezone.now()
    reservacion.save(update_fields=["deleted_at", "updated_at"])
    liberar_slots_de_reservacion(reservacion)
    return reservacion


# ---------------------------------------------------------------------------
# Inventario de SPA
# ---------------------------------------------------------------------------


def _hay_booking_activo(masseuse_id, date, time, excluir_booking_id=None):
    """¿Existe ya un booking de spa vivo sobre ese bloque?"""
    qs = SpaBooking.objects.filter(
        masseuse_id=masseuse_id,
        date=date,
        time=time,
        reservation__status__in=ESTADOS_ACTIVOS,
        reservation__deleted_at__isnull=True,
    )
    if excluir_booking_id is not None:
        qs = qs.exclude(pk=excluir_booking_id)
    return qs.exists()


@transaction.atomic
def reservar_bloque_spa(*, reservacion, masseuse_id, date, time, price_per_hour):
    """
    Toma un bloque de disponibilidad **y** crea su `SpaBooking`, atómicamente.

    Traslado directo de `book_spa_slot()`. El `select_for_update()` sobre la
    fila de `SpaAvailability` es lo que serializa de verdad a dos huéspedes
    concurrentes: el segundo espera a que el primero confirme y, para cuando
    evalúa la bandera, ya ve el bloque ocupado. Hacer esto con dos consultas
    sueltas dejaría abierta la ventana entre "verifiqué que estaba libre" e
    "inserté mi reserva", que es justo donde ocurre el double-booking.
    """
    if not reservacion.esta_activa:
        raise ReglaDeNegocioError(
            "No se pueden agregar servicios a una reservación cancelada o finalizada."
        )

    try:
        bloque = SpaAvailability.objects.select_for_update().get(
            masseuse_id=masseuse_id, available_date=date, available_time=time
        )
    except SpaAvailability.DoesNotExist:
        raise SlotNoDisponibleError(
            "El horario seleccionado ya no está disponible con esa masajista."
        ) from None

    if bloque.is_booked:
        raise SlotNoDisponibleError("El horario seleccionado ya fue ocupado por otra reservación.")

    # Red de seguridad: cubre el caso de una fila de disponibilidad reinsertada
    # a mano con `is_booked = False` sobre un horario que sí está contratado.
    if _hay_booking_activo(masseuse_id, date, time):
        raise SlotNoDisponibleError("El horario seleccionado ya fue ocupado por otra reservación.")

    booking = SpaBooking.objects.create(
        reservation=reservacion,
        masseuse_id=masseuse_id,
        date=date,
        time=time,
        price_per_hour=price_per_hour,
    )
    bloque.is_booked = True
    bloque.save(update_fields=["is_booked"])
    return booking


@transaction.atomic
def liberar_spa_booking(booking):
    """
    Compensación de `reservar_bloque_spa`: borra el booking **y** libera su
    bloque (traslado de `release_spa_booking()`).

    Las dos escrituras van juntas a propósito: borrar el booking sin liberar el
    bloque lo dejaría marcado como ocupado para siempre, retirando ese horario
    de la venta sin que nadie lo tenga contratado.
    """
    bloque = (
        SpaAvailability.objects.select_for_update()
        .filter(
            masseuse_id=booking.masseuse_id,
            available_date=booking.date,
            available_time=booking.time,
        )
        .first()
    )
    booking_id = booking.pk
    booking.delete()

    if bloque is not None and not _hay_booking_activo(
        bloque.masseuse_id, bloque.available_date, bloque.available_time, booking_id
    ):
        bloque.is_booked = False
        bloque.save(update_fields=["is_booked"])


@transaction.atomic
def liberar_slots_de_reservacion(reservacion):
    """
    Devuelve al inventario los bloques de una reservación cancelada o eliminada,
    **sin borrar sus bookings** (traslado de
    `release_spa_slots_for_reservation()`).

    El historial de servicios contratados se conserva intacto; lo único que
    cambia es que esos horarios vuelven a ofertarse. El guard `_hay_booking_activo`
    es defensivo: no libera un bloque que otra reservación viva esté ocupando.
    """
    liberados = 0
    bookings = reservacion.spa_bookings.order_by("masseuse_id", "date", "time")

    for booking in bookings:
        bloque = (
            SpaAvailability.objects.select_for_update()
            .filter(
                masseuse_id=booking.masseuse_id,
                available_date=booking.date,
                available_time=booking.time,
                is_booked=True,
            )
            .first()
        )
        if bloque is None:
            continue
        if _hay_booking_activo(booking.masseuse_id, booking.date, booking.time, booking.pk):
            continue
        bloque.is_booked = False
        bloque.save(update_fields=["is_booked"])
        liberados += 1

    return liberados


@transaction.atomic
def readquirir_slots_de_reservacion(reservacion, *, _configuracion_bloqueada=False):
    """
    Vuelve a tomar los bloques de una reservación que se reactiva (traslado de
    `reacquire_spa_slots_for_reservation()`).

    Cierra el hueco que deja la liberación al cancelar: si entre la cancelación
    y la reactivación otro huésped tomó alguno de esos horarios, la reactivación
    debe **rechazarse**, no dejar dos reservas vivas sobre el mismo bloque. Se
    llama antes de guardar el cambio de estado, así que el rollback de la
    transacción deja la reservación tal como estaba.

    El recorrido va ordenado por (masajista, fecha, hora) para que dos llamadas
    concurrentes que compartan bloques los tomen siempre en el mismo orden.
    """
    if not _configuracion_bloqueada:
        _bloquear_configuracion()

    readquiridos = 0
    bookings = reservacion.spa_bookings.order_by("masseuse_id", "date", "time")

    for booking in bookings:
        try:
            bloque = SpaAvailability.objects.select_for_update().get(
                masseuse_id=booking.masseuse_id,
                available_date=booking.date,
                available_time=booking.time,
            )
        except SpaAvailability.DoesNotExist:
            raise SlotYaTomadoError(
                "No se puede reactivar la reservación: uno de los horarios de SPA "
                "originales ya no existe en el catálogo."
            ) from None

        # Que el bloque esté marcado como ocupado por *este mismo* booking no es
        # conflicto: re-adquirirlo es un no-op seguro.
        if bloque.is_booked and _hay_booking_activo(
            booking.masseuse_id, booking.date, booking.time, booking.pk
        ):
            raise SlotYaTomadoError(
                "No se puede reactivar la reservación: uno o más horarios de SPA "
                "originales ya fueron ocupados por otro huésped."
            )

        if not bloque.is_booked:
            bloque.is_booked = True
            bloque.save(update_fields=["is_booked"])
        readquiridos += 1

    return readquiridos


# ---------------------------------------------------------------------------
# Comida y vinos
# ---------------------------------------------------------------------------


@transaction.atomic
def crear_food_booking(*, reservacion, date, meal_type, menu, guests_count, total_price=None):
    """
    Contrata cocina para un día habilitado.

    No hay control de colisiones —a diferencia del spa— porque el servicio se
    oferta por día completo y varios huéspedes no compiten por él; lo único que
    se valida es que el día siga en `FoodAvailability` (un carrito viejo pudo
    sobrevivir a que un admin lo retire).
    """
    if not reservacion.esta_activa:
        raise ReglaDeNegocioError(
            "No se pueden agregar servicios a una reservación cancelada o finalizada."
        )

    if not FoodAvailability.objects.filter(available_date=date).exists():
        raise DiaNoDisponibleError(
            f"El servicio de cocina ya no está disponible para el {date}."
        )

    if total_price is None:
        total_price = (menu.price_per_person * Decimal(guests_count)).quantize(
            CENTAVOS, rounding=ROUND_HALF_UP
        )

    return FoodBooking.objects.create(
        reservation=reservacion,
        date=date,
        meal_type=meal_type,
        menu=menu,
        guests_count=guests_count,
        total_price=total_price,
    )


@transaction.atomic
def crear_wine_order(*, reservacion, lineas):
    """
    Crea el pedido de vinos y sus líneas en una sola transacción.

    `lineas` es una lista de dicts con `wine` o `wine_package` (excluyentes) y
    `quantity`. El precio unitario se toma del catálogo en este momento y queda
    congelado en la línea, y el total del pedido se deriva de ahí — un pedido no
    puede quedar registrado con un total que no corresponda a su desglose.
    """
    if not reservacion.esta_activa:
        raise ReglaDeNegocioError(
            "No se pueden agregar servicios a una reservación cancelada o finalizada."
        )
    if not lineas:
        raise ReglaDeNegocioError("El pedido de vinos debe incluir al menos una botella o paquete.")

    total = Decimal("0.00")
    preparadas = []
    for linea in lineas:
        producto = linea.get("wine") or linea.get("wine_package")
        cantidad = linea["quantity"]
        unit_price = producto.price
        total += unit_price * Decimal(cantidad)
        preparadas.append(
            {
                "wine": linea.get("wine"),
                "wine_package": linea.get("wine_package"),
                "quantity": cantidad,
                "unit_price": unit_price,
            }
        )

    pedido = WineOrder.objects.create(
        reservation=reservacion, total_price=total.quantize(CENTAVOS, rounding=ROUND_HALF_UP)
    )
    WineOrderItem.objects.bulk_create(
        [WineOrderItem(wine_order=pedido, **linea) for linea in preparadas]
    )
    return pedido
