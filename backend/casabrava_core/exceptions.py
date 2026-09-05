"""
Manejador de excepciones de la API.

DRF traduce por su cuenta sus propias `APIException`, pero no las excepciones
de la ORM. La única que llega hasta una vista en este proyecto es
`ProtectedError`: los catálogos (tarifas, masajistas, menús, vinos y paquetes)
están referenciados con `on_delete=PROTECT` desde las reservaciones y sus
bookings, justo para que borrar una fila del catálogo no reescriba el historial
de lo ya contratado.

Sin este manejador ese intento sale como 500 con el traceback de Django —que el
frontend no puede convertir en nada útil, porque el cuerpo ni siquiera es JSON—.
Con él sale como **409**, la misma categoría que ya usa el resto del dominio
(§5): la petición estaba bien formada, pero el recurso no está en condiciones
de aceptarla, y el mensaje viaja en español listo para mostrarse.
"""

from django.db.models.deletion import ProtectedError
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.views import exception_handler as drf_exception_handler


class RegistroEnUso(APIException):
    """409: la fila existe, pero el historial la referencia y no puede borrarse."""

    status_code = status.HTTP_409_CONFLICT
    default_detail = (
        "No se puede eliminar este registro porque una reservación ya lo usa. "
        "Edítalo o márcalo como inactivo en vez de borrarlo."
    )


def casabrava_exception_handler(exc, context):
    """Traduce `ProtectedError` a 409 y delega todo lo demás en DRF."""
    if isinstance(exc, ProtectedError):
        exc = RegistroEnUso()
    return drf_exception_handler(exc, context)
