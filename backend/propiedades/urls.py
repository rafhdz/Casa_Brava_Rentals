from django.urls import include, path
from rest_framework.routers import DefaultRouter

from propiedades.views import (
    AdditionalServiceInfoViewSet,
    AmenityCategoryViewSet,
    AmenityViewSet,
    FareTypeViewSet,
    PropertyPhotoViewSet,
    PropertySettingsViewSet,
)

router = DefaultRouter()
router.register("configuracion", PropertySettingsViewSet, basename="property-settings")
router.register("tarifas", FareTypeViewSet, basename="fare-type")
router.register("fotos", PropertyPhotoViewSet, basename="property-photo")
router.register("amenidades/categorias", AmenityCategoryViewSet, basename="amenity-category")
router.register("amenidades", AmenityViewSet, basename="amenity")
router.register("servicios-info", AdditionalServiceInfoViewSet, basename="service-info")

urlpatterns = [path("", include(router.urls))]
