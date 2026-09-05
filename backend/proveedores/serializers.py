from rest_framework import serializers

from proveedores.models import SpaMasseuse


class SpaMasseuseSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpaMasseuse
        fields = ["id", "name", "status"]
