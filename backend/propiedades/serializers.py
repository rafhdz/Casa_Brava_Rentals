"""Serializers de la propiedad y del contenido del Home."""

from rest_framework import serializers

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


class PropertySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertySettings
        fields = ["id", "nightly_rate", "security_deposit"]


class FareTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FareType
        fields = ["id", "name", "surcharge_percentage"]


class PropertyPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyPhoto
        fields = ["id", "url", "label", "sort_order"]


class AmenitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Amenity
        fields = ["id", "category", "name", "icon_url", "sort_order"]


class AmenityCategorySerializer(serializers.ModelSerializer):
    """Categoría con sus amenidades anidadas y ya ordenadas.

    El Home pinta la lista agrupada de un solo tirón, así que la agrupación se
    resuelve aquí y no en el cliente (el `ordering` del modelo garantiza el
    orden curado dentro de cada categoría).
    """

    amenities = AmenitySerializer(many=True, read_only=True)

    class Meta:
        model = AmenityCategory
        fields = ["id", "name", "sort_order", "amenities"]


class AdditionalServiceInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdditionalServiceInfo
        fields = ["id", "title", "description", "image_url", "price_hint"]


# ---------------------------------------------------------------------------
# Propiedades (marketplace multi-tenant)
# ---------------------------------------------------------------------------


class SupplierProfileBasicSerializer(serializers.ModelSerializer):
    """Representación mínima del proveedor para anidar en el detalle de una
    propiedad — no expone `stripe_account_id` ni `commission_rate`, que son
    datos internos del proveedor, no del listado público."""

    class Meta:
        model = SupplierProfile
        fields = ["id", "business_name"]


class PropertySerializer(serializers.ModelSerializer):
    """Fila de listado: lo mínimo para pintar una tarjeta de propiedad."""

    class Meta:
        model = Property
        fields = [
            "id",
            "name",
            "slug",
            "access_type",
            "base_price_per_night",
            "max_guests",
            "is_active",
        ]


class PropertyDetailSerializer(serializers.ModelSerializer):
    """
    Detalle de una propiedad, incluido `user_has_access`.

    `user_has_access` es el único campo que depende de quién pregunta: una
    propiedad `OPEN` es reservable por cualquiera (`True` siempre); una
    `INVITE_ONLY` solo por quien tenga un `PropertyAccessGrant` — un visitante
    anónimo nunca lo tiene, así que da `False` sin consultar la base.
    """

    supplier = SupplierProfileBasicSerializer(read_only=True)
    user_has_access = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "access_type",
            "require_identity_verification",
            "base_price_per_night",
            "security_deposit",
            "cleaning_fee",
            "max_guests",
            "is_active",
            "supplier",
            "user_has_access",
        ]

    def get_user_has_access(self, obj) -> bool:
        if obj.access_type != PropertyAccessType.INVITE_ONLY:
            return True
        request = self.context.get("request")
        usuario = getattr(request, "user", None)
        if usuario is None or not usuario.is_authenticated:
            return False
        return PropertyAccessGrant.objects.filter(property=obj, user=usuario).exists()
