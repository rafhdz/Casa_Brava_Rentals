"""
Endpoints de cobros.

Registrar o modificar un movimiento es exclusivo del admin: el huésped solo
puede consultar los de sus propias reservaciones. Cuando se conecte Stripe, el
webhook entrará por `pagos.services.registrar_pago`, no por este ViewSet.
"""

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from pagos import services
from pagos.models import Payment
from pagos.serializers import PaymentSerializer
from usuarios.permissions import EsAdmin


class PaymentViewSet(viewsets.ModelViewSet):
    """Libro de movimientos de cobro."""

    queryset = Payment.objects.all()
    # Alcance real en `get_queryset()`; esto solo declara el modelo base.
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    ordering_fields = ["created_at", "amount"]

    def get_permissions(self):
        if self.action in {"list", "retrieve"}:
            return [IsAuthenticated()]
        return [IsAuthenticated(), EsAdmin()]

    def get_queryset(self):
        queryset = Payment.objects.select_related("reservation").filter(
            reservation__deleted_at__isnull=True
        )
        usuario = self.request.user
        if not (usuario.es_admin or usuario.es_holder):
            queryset = queryset.filter(reservation__guest=usuario)
        if reservacion := self.request.query_params.get("reservation"):
            queryset = queryset.filter(reservation_id=reservacion)
        return queryset

    def perform_create(self, serializer):
        pago = serializer.save()
        # El movimiento por sí solo no dice nada: el estado de la reservación se
        # deriva de todos sus movimientos, siempre.
        services.sincronizar_estado_de_pago(pago.reservation_id)

    def perform_update(self, serializer):
        pago = serializer.save()
        services.sincronizar_estado_de_pago(pago.reservation_id)

    def perform_destroy(self, instance):
        reservation_id = instance.reservation_id
        instance.delete()
        services.sincronizar_estado_de_pago(reservation_id)

    @action(detail=True, methods=["post"], url_path="sincronizar")
    def sincronizar(self, request, pk=None):
        """Fuerza el recálculo del estado de cobro de la reservación asociada."""
        pago = self.get_object()
        reservacion = services.sincronizar_estado_de_pago(pago.reservation_id)
        return Response(
            {
                "reservation": str(reservacion.pk),
                "payment_status": reservacion.payment_status,
                "gran_total": reservacion.gran_total,
            }
        )
