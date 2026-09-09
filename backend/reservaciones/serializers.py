"""
Serializers de reservaciones y servicios contratados.

Regla que atraviesa todo el módulo: **los montos no se aceptan del cliente**.
`total_amount`, `total_price` y `price_per_hour` se derivan en el servidor a
partir del catálogo vigente (la única excepción es el monto de la estadía
cuando quien crea es un admin, que puede ajustarlo a mano para aplicar un
descuento). Los precios ya guardados son un snapshot y no se recalculan nunca.
"""

from rest_framework import serializers

from propiedades.models import Property
from reservaciones.models import (
    FoodBooking,
    Reservation,
    SpaBooking,
    WineOrder,
    WineOrderItem,
)
from servicios.models import Wine, WinePackage


# ---------------------------------------------------------------------------
# Servicios contratados
# ---------------------------------------------------------------------------


class SpaBookingSerializer(serializers.ModelSerializer):
    masseuse_name = serializers.CharField(source="masseuse.name", read_only=True)

    class Meta:
        model = SpaBooking
        fields = [
            "id",
            "reservation",
            "masseuse",
            "masseuse_name",
            "date",
            "time",
            "price_per_hour",
        ]
        # El precio lo fija el servidor (settings.SPA_SESSION_PRICE).
        read_only_fields = ["price_per_hour"]


class FoodBookingSerializer(serializers.ModelSerializer):
    menu_name = serializers.CharField(source="menu.name", read_only=True)

    class Meta:
        model = FoodBooking
        fields = [
            "id",
            "reservation",
            "date",
            "meal_type",
            "menu",
            "menu_name",
            "guests_count",
            "total_price",
        ]
        read_only_fields = ["total_price"]

    def validate(self, attrs):
        menu = attrs.get("menu")
        meal_type = attrs.get("meal_type")
        if menu and meal_type and menu.meal_type != meal_type:
            raise serializers.ValidationError(
                {"menu": f"El menú seleccionado es de {menu.meal_type}, no de {meal_type}."}
            )
        return attrs


class WineOrderItemSerializer(serializers.ModelSerializer):
    producto = serializers.SerializerMethodField()

    class Meta:
        model = WineOrderItem
        fields = ["id", "wine", "wine_package", "producto", "quantity", "unit_price"]
        read_only_fields = ["unit_price"]

    def get_producto(self, obj) -> str | None:
        producto = obj.wine or obj.wine_package
        return producto.name if producto else None


class WineOrderItemInputSerializer(serializers.Serializer):
    """Línea de entrada: una botella **o** un paquete, con su cantidad."""

    wine = serializers.PrimaryKeyRelatedField(
        queryset=Wine.objects.all(), required=False, allow_null=True
    )
    wine_package = serializers.PrimaryKeyRelatedField(
        queryset=WinePackage.objects.all(), required=False, allow_null=True
    )
    quantity = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        tiene_vino = attrs.get("wine") is not None
        tiene_paquete = attrs.get("wine_package") is not None
        if tiene_vino == tiene_paquete:
            raise serializers.ValidationError(
                "Cada línea debe referir exactamente una botella o un paquete."
            )
        return attrs


class WineOrderSerializer(serializers.ModelSerializer):
    items = WineOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = WineOrder
        fields = ["id", "reservation", "total_price", "items"]
        read_only_fields = ["total_price"]


class WineOrderCreateSerializer(serializers.Serializer):
    """
    Alta de un pedido completo: cabecera + líneas en una sola petición.

    Se pide así, y no con endpoints separados para el pedido y sus líneas,
    porque un `WineOrder` sin items no significa nada — crearlos por separado
    dejaría un pedido huérfano en cuanto una de las dos llamadas fallara.
    """

    reservation = serializers.PrimaryKeyRelatedField(queryset=Reservation.objects.none())
    items = WineOrderItemInputSerializer(many=True, allow_empty=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        queryset = self.context.get("reservations_queryset")
        if queryset is not None:
            self.fields["reservation"].queryset = queryset


# ---------------------------------------------------------------------------
# Reservaciones
# ---------------------------------------------------------------------------


class GuestResumenSerializer(serializers.Serializer):
    """Datos mínimos del huésped para las listas del panel."""

    id = serializers.UUIDField(read_only=True)
    nombre_completo = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)


class PropertyResumenSerializer(serializers.Serializer):
    """Datos mínimos de la propiedad para el desglose de una reservación —
    no la ficha completa de `propiedades.PropertySerializer`, que trae precio
    y aforo, irrelevantes en el contexto de una reservación ya creada."""

    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(read_only=True)
    slug = serializers.SlugField(read_only=True)


class ReservationSerializer(serializers.ModelSerializer):
    """
    Lectura de una reservación con su desglose de servicios.

    `subtotal_servicios` y `gran_total` los expone el modelo (ver sus
    propiedades): son valores derivados de los precios ya guardados en cada
    booking, no columnas.
    """

    guest = GuestResumenSerializer(read_only=True)
    property = PropertyResumenSerializer(read_only=True)
    fare_type_name = serializers.CharField(source="fare_type.name", read_only=True)
    noches = serializers.IntegerField(read_only=True)
    spa_bookings = SpaBookingSerializer(many=True, read_only=True)
    food_bookings = FoodBookingSerializer(many=True, read_only=True)
    wine_orders = WineOrderSerializer(many=True, read_only=True)
    subtotal_servicios = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    gran_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Reservation
        fields = [
            "id",
            "guest",
            "property",
            "check_in",
            "check_out",
            "noches",
            "fare_type",
            "fare_type_name",
            "total_amount",
            # Campos financieros del modelo multi-tenant (comisión/payout);
            # ver CLAUDE.md "Integración futura planeada" — hoy no los puebla
            # ninguna regla de negocio, quedan en 0 salvo `accommodation_total`
            # y `grand_total`, que `services.crear_reservacion` iguala a
            # `total_amount` al crear.
            "accommodation_total",
            "services_total",
            "platform_fee",
            "supplier_payout",
            "grand_total",
            "status",
            "payment_status",
            "created_at",
            "updated_at",
            "spa_bookings",
            "food_bookings",
            "wine_orders",
            "subtotal_servicios",
            "gran_total",
        ]


class ReservationCreateSerializer(serializers.ModelSerializer):
    """
    Alta de estadía.

    `guest` solo lo puede fijar un admin; en el checkout del huésped se ignora y
    la reservación se crea siempre a nombre de la sesión activa. `total_amount`
    es opcional: si no viene, `services.crear_reservacion` lo calcula.

    `property_id`/`property_slug` son opcionales y equivalentes (dos formas de
    apuntar a la misma propiedad): si no viene ninguno, la vista no manda
    `propiedad` a `services.crear_reservacion`, que cae al fallback de Tenant 0
    (`_propiedad_tenant_cero`) — el mismo comportamiento de antes del modelo
    multi-tenant. Solo propiedades activas son un destino válido.
    """

    property_id = serializers.PrimaryKeyRelatedField(
        source="property",
        queryset=Property.objects.filter(is_active=True),
        required=False,
        write_only=True,
    )
    property_slug = serializers.SlugRelatedField(
        source="property",
        slug_field="slug",
        queryset=Property.objects.filter(is_active=True),
        required=False,
        write_only=True,
    )

    class Meta:
        model = Reservation
        fields = [
            "id",
            "guest",
            "property_id",
            "property_slug",
            "check_in",
            "check_out",
            "fare_type",
            "total_amount",
            "status",
            "payment_status",
        ]
        extra_kwargs = {
            "guest": {"required": False},
            "total_amount": {"required": False},
            "status": {"required": False},
            "payment_status": {"required": False},
        }


class ReservationUpdateSerializer(serializers.ModelSerializer):
    """Edición administrativa (estado operativo, cobro, fechas, monto)."""

    class Meta:
        model = Reservation
        fields = [
            "check_in",
            "check_out",
            "fare_type",
            "total_amount",
            "status",
            "payment_status",
        ]
