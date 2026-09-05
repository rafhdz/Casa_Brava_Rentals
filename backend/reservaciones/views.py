"""
Endpoints de reservaciones y servicios contratados.

Las vistas son deliberadamente delgadas: **no** deciden disponibilidad ni tocan
`SpaAvailability` — eso vive en `reservaciones.services`, que es quien abre la
transacción y toma los bloqueos. Aquí solo se resuelve quién puede ver y hacer
qué (el reemplazo de las políticas RLS que se quedaron en Supabase) y se
traducen los errores de dominio a códigos HTTP.
"""

from contextlib import contextmanager

from django.conf import settings
from django.db import models
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from reservaciones import services
from reservaciones.models import (
    FoodBooking,
    Reservation,
    ReservationStatus,
    SpaBooking,
    WineOrder,
)
from reservaciones.serializers import (
    FoodBookingSerializer,
    ReservationCreateSerializer,
    ReservationSerializer,
    ReservationUpdateSerializer,
    SpaBookingSerializer,
    WineOrderCreateSerializer,
    WineOrderSerializer,
)
from usuarios.permissions import EsAdminOSoloLecturaHolder


class ConflictoDeInventario(APIException):
    """409: la petición es válida, pero el recurso ya no está disponible."""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "El recurso solicitado ya no está disponible."


@contextmanager
def traducir_errores_de_dominio():
    """
    Convierte los errores de `services` en respuestas HTTP.

    Un choque de fechas o un bloque ya tomado no es un error de validación del
    payload —la petición estaba bien formada— sino una carrera perdida contra
    otro usuario, así que se responde 409 y no 400. El mensaje viaja tal cual:
    ya viene redactado para el huésped.
    """
    try:
        yield
    except (
        services.SolapamientoError,
        services.SlotNoDisponibleError,
        services.SlotYaTomadoError,
    ) as exc:
        raise ConflictoDeInventario(str(exc)) from exc
    except services.ReglaDeNegocioError as exc:
        raise ValidationError({"detail": str(exc)}) from exc


class ServicioContratadoMixin:
    """
    Piezas compartidas por los tres ViewSets de servicios adicionales.

    Reemplaza el `exists (select 1 from reservations ...)` que las políticas RLS
    usaban para resolver la pertenencia: un servicio es visible/modificable si
    su reservación es del usuario (o si quien pregunta es admin u holder).
    """

    permission_classes = [IsAuthenticated, EsAdminOSoloLecturaHolder]

    def filtrar_por_pertenencia(self, queryset):
        usuario = self.request.user
        queryset = queryset.filter(reservation__deleted_at__isnull=True)
        if usuario.es_admin or usuario.es_holder:
            return queryset
        return queryset.filter(reservation__guest=usuario)

    def reservaciones_permitidas(self):
        """Reservaciones a las que este usuario puede adjuntar servicios.

        Solo las activas: adjuntar algo a una estadía cancelada o finalizada no
        tiene sentido, y reescribir historial desde el cliente, menos.
        """
        queryset = Reservation.objects.activas()
        if self.request.user.es_admin:
            return queryset
        return queryset.filter(guest=self.request.user)

    def obtener_reservacion(self, reservacion):
        """Vuelve a resolver la reservación contra el universo permitido."""
        permitida = self.reservaciones_permitidas().filter(pk=reservacion.pk).first()
        if permitida is None:
            raise PermissionDenied(
                "No puedes agregar servicios a esta reservación (no te pertenece, "
                "o ya no está activa)."
            )
        return permitida

    def puede_eliminar(self, objeto):
        """
        Un admin borra cualquier servicio; un huésped solo los suyos y solo
        mientras la estadía siga activa — el mismo alcance estrecho que tenían
        las políticas `*_guest_delete_own`.
        """
        usuario = self.request.user
        if usuario.es_admin:
            return True
        return objeto.reservation.guest_id == usuario.pk and objeto.reservation.esta_activa


class ReservationViewSet(viewsets.ModelViewSet):
    """
    Reservaciones de estadía.

    Visibilidad por rol (equivalente de las políticas de `reservations`):
    admin todo, holder todo en solo lectura, huésped únicamente las suyas. Las
    reservaciones con soft delete no salen nunca — `vigentes()` filtra
    `deleted_at`, y nada más lo hace por debajo.
    """

    queryset = Reservation.objects.all()
    # Alcance real en `get_queryset()`; esto solo declara el modelo base.
    permission_classes = [IsAuthenticated, EsAdminOSoloLecturaHolder]
    ordering_fields = ["check_in", "created_at"]

    def get_queryset(self):
        queryset = (
            Reservation.objects.vigentes()
            .select_related("guest", "fare_type")
            .prefetch_related(
                "spa_bookings__masseuse",
                "food_bookings__menu",
                "wine_orders__items__wine",
                "wine_orders__items__wine_package",
            )
        )
        usuario = self.request.user
        if not (usuario.es_admin or usuario.es_holder):
            queryset = queryset.filter(guest=usuario)

        params = self.request.query_params
        if estado := params.get("status"):
            queryset = queryset.filter(status=estado)
        if payment_status := params.get("payment_status"):
            queryset = queryset.filter(payment_status=payment_status)
        return queryset

    def get_serializer_class(self):
        if self.action == "create":
            return ReservationCreateSerializer
        if self.action in {"update", "partial_update"}:
            return ReservationUpdateSerializer
        return ReservationSerializer

    def create(self, request, *args, **kwargs):
        """Alta de estadía, con verificación de disponibilidad bajo bloqueo."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data

        es_admin = request.user.es_admin
        # Un huésped siempre reserva a su propio nombre: el `guest` que venga en
        # el payload se descarta, no se valida.
        guest = datos.get("guest") if es_admin else request.user
        if guest is None:
            raise ValidationError({"guest": "Indica el huésped de la reservación."})

        with traducir_errores_de_dominio():
            reservacion = services.crear_reservacion(
                guest=guest,
                check_in=datos["check_in"],
                check_out=datos["check_out"],
                fare_type=datos["fare_type"],
                # El monto manual es privilegio del panel admin; en el checkout
                # de autoservicio el total se deriva siempre en el servidor.
                total_amount=datos.get("total_amount") if es_admin else None,
                status=datos.get("status", ReservationStatus.PENDIENTE),
                payment_status=datos.get("payment_status"),
            )

        salida = ReservationSerializer(reservacion, context=self.get_serializer_context())
        return Response(salida.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        reservacion = self.get_object()
        serializer = self.get_serializer(
            reservacion, data=request.data, partial=kwargs.pop("partial", False)
        )
        serializer.is_valid(raise_exception=True)

        with traducir_errores_de_dominio():
            actualizada = services.actualizar_reservacion(
                reservacion.pk, **serializer.validated_data
            )

        salida = ReservationSerializer(actualizada, context=self.get_serializer_context())
        return Response(salida.data)

    def destroy(self, request, *args, **kwargs):
        """Soft delete: marca `deleted_at` y libera el inventario de spa."""
        reservacion = self.get_object()
        with traducir_errores_de_dominio():
            services.eliminar_reservacion(reservacion.pk)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"], url_path="ocupadas")
    def ocupadas(self, request):
        """
        Rangos activos (pendientes y confirmados), para pintar el calendario
        del huésped.

        Debe coincidir con lo que `services.hay_solapamiento` considera
        "ocupado" (`activas()`, no solo `confirmadas()`): una reservación
        `pendiente` ya bloquea esas fechas contra el alta de otra reserva, así
        que el calendario tiene que mostrarlas como ocupadas también, o el
        huésped vería fechas libres que el servidor va a rechazar igual. Es
        solo una ayuda de UX —quien de verdad impide el doble-booking es la
        verificación bajo bloqueo del alta—.
        """
        rangos = (
            Reservation.objects.activas()
            .values("check_in", "check_out")
            .order_by("check_in")
        )
        return Response(list(rangos))


class SpaBookingViewSet(ServicioContratadoMixin, viewsets.ModelViewSet):
    """
    Sesiones de spa contratadas.

    El alta toma el bloque de disponibilidad y crea la reserva en una sola
    transacción con bloqueo de fila (`services.reservar_bloque_spa`); la baja
    borra la reserva **y** devuelve el bloque al inventario
    (`services.liberar_spa_booking`). Ninguna de las dos cosas se hace por
    separado: un bloque tomado sin reserva —o al revés— es inventario perdido.
    """

    queryset = SpaBooking.objects.all()
    # Alcance real en `get_queryset()`; esto solo declara el modelo base.
    serializer_class = SpaBookingSerializer

    def get_queryset(self):
        return self.filtrar_por_pertenencia(
            SpaBooking.objects.select_related("masseuse", "reservation")
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data
        reservacion = self.obtener_reservacion(datos["reservation"])

        with traducir_errores_de_dominio():
            booking = services.reservar_bloque_spa(
                reservacion=reservacion,
                masseuse_id=datos["masseuse"].pk,
                date=datos["date"],
                time=datos["time"],
                price_per_hour=settings.SPA_SESSION_PRICE,
            )

        salida = self.get_serializer(booking)
        return Response(salida.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        booking = self.get_object()
        if not self.puede_eliminar(booking):
            raise PermissionDenied("No puedes cancelar esta sesión de spa.")
        services.liberar_spa_booking(booking)
        return Response(status=status.HTTP_204_NO_CONTENT)


class FoodBookingViewSet(ServicioContratadoMixin, viewsets.ModelViewSet):
    """Servicios de cocina contratados."""

    queryset = FoodBooking.objects.all()
    # Alcance real en `get_queryset()`; esto solo declara el modelo base.
    serializer_class = FoodBookingSerializer

    def get_queryset(self):
        return self.filtrar_por_pertenencia(
            FoodBooking.objects.select_related("menu", "reservation")
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data
        reservacion = self.obtener_reservacion(datos["reservation"])

        with traducir_errores_de_dominio():
            booking = services.crear_food_booking(
                reservacion=reservacion,
                date=datos["date"],
                meal_type=datos["meal_type"],
                menu=datos["menu"],
                guests_count=datos["guests_count"],
            )

        salida = self.get_serializer(booking)
        return Response(salida.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        booking = self.get_object()
        if not self.puede_eliminar(booking):
            raise PermissionDenied("No puedes cancelar este servicio de comida.")
        return super().destroy(request, *args, **kwargs)


class WineOrderViewSet(ServicioContratadoMixin, viewsets.ModelViewSet):
    """Pedidos de vinos (cabecera + líneas, siempre juntos)."""

    queryset = WineOrder.objects.all()
    # Alcance real en `get_queryset()`; esto solo declara el modelo base.
    serializer_class = WineOrderSerializer

    def get_queryset(self):
        return self.filtrar_por_pertenencia(
            WineOrder.objects.select_related("reservation").prefetch_related(
                "items__wine", "items__wine_package"
            )
        )

    def get_serializer_class(self):
        if self.action == "create":
            return WineOrderCreateSerializer
        return WineOrderSerializer

    def get_serializer_context(self):
        contexto = super().get_serializer_context()
        if self.action == "create":
            contexto["reservations_queryset"] = self.reservaciones_permitidas()
        return contexto

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data
        reservacion = self.obtener_reservacion(datos["reservation"])

        with traducir_errores_de_dominio():
            pedido = services.crear_wine_order(reservacion=reservacion, lineas=datos["items"])

        salida = WineOrderSerializer(pedido, context=self.get_serializer_context())
        return Response(salida.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        pedido = self.get_object()
        if not self.puede_eliminar(pedido):
            raise PermissionDenied("No puedes cancelar este pedido de vinos.")
        return super().destroy(request, *args, **kwargs)
