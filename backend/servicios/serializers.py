"""Serializers de catálogos y disponibilidad de servicios."""

from rest_framework import serializers

from servicios.models import (
    FoodAvailability,
    FoodMenu,
    SpaAvailability,
    Wine,
    WinePackage,
)


class FoodMenuSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodMenu
        fields = ["id", "meal_type", "name", "price_per_person"]


class WineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wine
        fields = ["id", "name", "type", "price", "stock"]


class WinePackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = WinePackage
        fields = ["id", "name", "price"]


class SpaAvailabilitySerializer(serializers.ModelSerializer):
    masseuse_name = serializers.CharField(source="masseuse.name", read_only=True)

    class Meta:
        model = SpaAvailability
        fields = [
            "id",
            "masseuse",
            "masseuse_name",
            "available_date",
            "available_time",
            "is_booked",
        ]
        # La bandera la mantienen los servicios transaccionales de
        # `reservaciones.services`, nunca una escritura directa por API.
        read_only_fields = ["is_booked"]


class FoodAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodAvailability
        fields = ["id", "available_date"]
