"""
Endpoints de catálogos y disponibilidad.

Todos siguen el mismo patrón de permisos: cualquier sesión lee, solo un admin
escribe. La diferencia está en el queryset de disponibilidad, que le muestra al
huésped únicamente lo que de verdad puede contratar (nada del pasado, ningún
bloque ya tomado), mientras que el admin ve el inventario completo para poder
administrarlo.
"""

from django.utils import timezone
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from servicios.models import FoodAvailability, FoodMenu, SpaAvailability, Wine, WinePackage
from servicios.serializers import (
    FoodAvailabilitySerializer,
    FoodMenuSerializer,
    SpaAvailabilitySerializer,
    WinePackageSerializer,
    WineSerializer,
)
from usuarios.permissions import SoloLecturaAutenticadoEscrituraAdmin


class FoodMenuViewSet(viewsets.ModelViewSet):
    queryset = FoodMenu.objects.all()
    serializer_class = FoodMenuSerializer
    permission_classes = [IsAuthenticated, SoloLecturaAutenticadoEscrituraAdmin]
    search_fields = ["name"]

    def get_queryset(self):
        queryset = super().get_queryset()
        meal_type = self.request.query_params.get("meal_type")
        if meal_type:
            queryset = queryset.filter(meal_type=meal_type)
        return queryset


class WineViewSet(viewsets.ModelViewSet):
    queryset = Wine.objects.all()
    serializer_class = WineSerializer
    permission_classes = [IsAuthenticated, SoloLecturaAutenticadoEscrituraAdmin]
    search_fields = ["name", "type"]


class WinePackageViewSet(viewsets.ModelViewSet):
    queryset = WinePackage.objects.all()
    serializer_class = WinePackageSerializer
    permission_classes = [IsAuthenticated, SoloLecturaAutenticadoEscrituraAdmin]


class SpaAvailabilityViewSet(viewsets.ModelViewSet):
    """
    Bloques de spa ofertados.

    Filtros: `?masseuse=<uuid>`, `?desde=<yyyy-mm-dd>`, `?hasta=<yyyy-mm-dd>`.
    Para un huésped se ocultan por defecto los bloques ocupados y los días
    pasados; un admin los ve todos (puede pedir `?is_booked=true|false`).
    """

    queryset = SpaAvailability.objects.all()
    # Alcance real en `get_queryset()`; esto solo declara el modelo base.
    serializer_class = SpaAvailabilitySerializer
    permission_classes = [IsAuthenticated, SoloLecturaAutenticadoEscrituraAdmin]
    ordering_fields = ["available_date", "available_time"]

    def get_queryset(self):
        queryset = SpaAvailability.objects.select_related("masseuse")
        params = self.request.query_params

        if masseuse := params.get("masseuse"):
            queryset = queryset.filter(masseuse_id=masseuse)
        if desde := params.get("desde"):
            queryset = queryset.filter(available_date__gte=desde)
        if hasta := params.get("hasta"):
            queryset = queryset.filter(available_date__lte=hasta)

        if self.request.user.es_admin:
            if (is_booked := params.get("is_booked")) is not None:
                queryset = queryset.filter(is_booked=is_booked.lower() == "true")
            return queryset

        return queryset.filter(is_booked=False, available_date__gte=timezone.localdate())


class FoodAvailabilityViewSet(viewsets.ModelViewSet):
    """Días habilitados para el servicio de cocina (`?desde=`, `?hasta=`)."""

    queryset = FoodAvailability.objects.all()
    # Alcance real en `get_queryset()`; esto solo declara el modelo base.
    serializer_class = FoodAvailabilitySerializer
    permission_classes = [IsAuthenticated, SoloLecturaAutenticadoEscrituraAdmin]
    ordering_fields = ["available_date"]

    def get_queryset(self):
        queryset = FoodAvailability.objects.all()
        params = self.request.query_params

        if desde := params.get("desde"):
            queryset = queryset.filter(available_date__gte=desde)
        if hasta := params.get("hasta"):
            queryset = queryset.filter(available_date__lte=hasta)

        if self.request.user.es_admin:
            return queryset
        return queryset.filter(available_date__gte=timezone.localdate())
