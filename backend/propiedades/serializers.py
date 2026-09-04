"""Serializers de la propiedad y del contenido del Home."""

from rest_framework import serializers

from propiedades.models import (
    AdditionalServiceInfo,
    Amenity,
    AmenityCategory,
    FareType,
    PropertyPhoto,
    PropertySettings,
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
