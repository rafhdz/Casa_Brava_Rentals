from django.urls import include, path
from rest_framework.routers import DefaultRouter

from proveedores.views import SpaMasseuseViewSet

router = DefaultRouter()
router.register("masajistas", SpaMasseuseViewSet, basename="masajista")

urlpatterns = [path("", include(router.urls))]
