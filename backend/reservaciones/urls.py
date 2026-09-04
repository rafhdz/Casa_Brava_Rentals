from django.urls import include, path
from rest_framework.routers import DefaultRouter

from reservaciones.views import (
    FoodBookingViewSet,
    ReservationViewSet,
    SpaBookingViewSet,
    WineOrderViewSet,
)

router = DefaultRouter()
router.register("reservaciones", ReservationViewSet, basename="reservacion")
router.register("spa", SpaBookingViewSet, basename="spa-booking")
router.register("comida", FoodBookingViewSet, basename="food-booking")
router.register("vinos", WineOrderViewSet, basename="wine-order")

urlpatterns = [path("", include(router.urls))]
