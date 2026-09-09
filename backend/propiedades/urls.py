from django.urls import include, path
from rest_framework.routers import DefaultRouter

from propiedades.views import (
    AdditionalServiceInfoViewSet,
    AmenityCategoryViewSet,
    AmenityViewSet,
    FareTypeViewSet,
    PropertyPhotoViewSet,
    PropertySettingsViewSet,
    PropertyViewSet,
)

router = DefaultRouter()
router.register("configuracion", PropertySettingsViewSet, basename="property-settings")
router.register("tarifas", FareTypeViewSet, basename="fare-type")
router.register("fotos", PropertyPhotoViewSet, basename="property-photo")
router.register("amenidades/categorias", AmenityCategoryViewSet, basename="amenity-category")
router.register("amenidades", AmenityViewSet, basename="amenity")
router.register("servicios-info", AdditionalServiceInfoViewSet, basename="service-info")
# Registrado al final, con prefijo vacío: su ruta de detalle
# (`/api/propiedades/<slug>/`) usa un patrón "cualquier segmento", así que
# tiene que ir después de los prefijos literales de arriba para no
# interceptarlos (Django resuelve la primera coincidencia en orden).
router.register("", PropertyViewSet, basename="property")

urlpatterns = [path("", include(router.urls))]
