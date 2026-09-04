"""
Endpoints de la propiedad.

Dos niveles de acceso, heredados de las políticas RLS originales:

* Configuración y tarifas — lectura para cualquier sesión, escritura de admin.
* Contenido del Home (fotos, amenidades, tarjetas de servicios) — lectura
  **pública**: es material de marketing sin datos sensibles, y su contrato no
  depende de que el frontend proteja o no la portada.
"""

from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated

from propiedades.models import (
    AdditionalServiceInfo,
    Amenity,
    AmenityCategory,
    FareType,
    PropertyPhoto,
    PropertySettings,
)
from propiedades.serializers import (
    AdditionalServiceInfoSerializer,
    AmenityCategorySerializer,
    AmenitySerializer,
    FareTypeSerializer,
    PropertyPhotoSerializer,
    PropertySettingsSerializer,
)
from usuarios.permissions import (
    LecturaPublicaEscrituraAdmin,
    SoloLecturaAutenticadoEscrituraAdmin,
)


class PropertySettingsViewSet(viewsets.ModelViewSet):
    queryset = PropertySettings.objects.all()
    serializer_class = PropertySettingsSerializer
    permission_classes = [IsAuthenticated, SoloLecturaAutenticadoEscrituraAdmin]


class FareTypeViewSet(viewsets.ModelViewSet):
    queryset = FareType.objects.all()
    serializer_class = FareTypeSerializer
    permission_classes = [IsAuthenticated, SoloLecturaAutenticadoEscrituraAdmin]


class PropertyPhotoViewSet(viewsets.ModelViewSet):
    queryset = PropertyPhoto.objects.all()
    serializer_class = PropertyPhotoSerializer
    permission_classes = [AllowAny, LecturaPublicaEscrituraAdmin]
    pagination_class = None


class AmenityCategoryViewSet(viewsets.ModelViewSet):
    queryset = AmenityCategory.objects.prefetch_related("amenities")
    serializer_class = AmenityCategorySerializer
    permission_classes = [AllowAny, LecturaPublicaEscrituraAdmin]
    pagination_class = None


class AmenityViewSet(viewsets.ModelViewSet):
    queryset = Amenity.objects.select_related("category")
    serializer_class = AmenitySerializer
    permission_classes = [AllowAny, LecturaPublicaEscrituraAdmin]


class AdditionalServiceInfoViewSet(viewsets.ModelViewSet):
    queryset = AdditionalServiceInfo.objects.all()
    serializer_class = AdditionalServiceInfoSerializer
    permission_classes = [AllowAny, LecturaPublicaEscrituraAdmin]
    pagination_class = None
