"""Endpoints del catálogo de proveedores externos."""

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from proveedores.models import SpaMasseuse
from proveedores.serializers import SpaMasseuseSerializer
from usuarios.permissions import SoloLecturaAutenticadoEscrituraAdmin


class SpaMasseuseViewSet(viewsets.ModelViewSet):
    """
    Masajistas. Lectura para cualquier sesión (el huésped necesita elegir), alta
    y baja exclusivas de admin.

    Nota: dar de baja a una masajista que ya tiene historial fallará con un
    error de integridad — su FK en `spa_bookings` es `PROTECT` a propósito, para
    no reescribir el historial de servicios ya prestados. La vía correcta es
    marcarla con `status = "invitado"` y dejar de ofertar bloques suyos.
    """

    queryset = SpaMasseuse.objects.all()
    serializer_class = SpaMasseuseSerializer
    permission_classes = [IsAuthenticated, SoloLecturaAutenticadoEscrituraAdmin]
    search_fields = ["name"]
