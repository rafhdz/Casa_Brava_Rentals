from rest_framework import serializers

from pagos.models import Payment, PaymentStatus


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "reservation",
            "amount",
            "status",
            "provider",
            "external_reference",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_status(self, value):
        """`NA` describe a la reservación (estancia exenta), no a un
        movimiento: un cobro o reembolso siempre tiene un estado real."""
        if value == PaymentStatus.NA:
            raise serializers.ValidationError(
                "Un movimiento de cobro no puede marcarse «No aplica»; la exención "
                "se declara en la reservación."
            )
        return value
