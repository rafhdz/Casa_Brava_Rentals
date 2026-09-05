from django.urls import include, path
from rest_framework.routers import DefaultRouter

from servicios.views import (
    FoodAvailabilityViewSet,
    FoodMenuViewSet,
    SpaAvailabilityViewSet,
    WinePackageViewSet,
    WineViewSet,
)

router = DefaultRouter()
router.register("menus", FoodMenuViewSet, basename="food-menu")
router.register("vinos", WineViewSet, basename="wine")
router.register("paquetes-vino", WinePackageViewSet, basename="wine-package")
router.register("spa/disponibilidad", SpaAvailabilityViewSet, basename="spa-availability")
router.register("comida/disponibilidad", FoodAvailabilityViewSet, basename="food-availability")

urlpatterns = [path("", include(router.urls))]
