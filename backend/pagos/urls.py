from django.urls import include, path
from rest_framework.routers import DefaultRouter

from pagos.views import PaymentViewSet

router = DefaultRouter()
router.register("", PaymentViewSet, basename="pago")

urlpatterns = [path("", include(router.urls))]
