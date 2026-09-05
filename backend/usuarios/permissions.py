"""
Clases de permiso que replican, en la capa de API, las políticas RLS que antes
corrían dentro de Postgres (migración `20260903184500_enable_rls_policies.sql`).

Al salir de Supabase se pierde RLS como red de seguridad de última instancia,
así que la autorización pasa a ser responsabilidad exclusiva de estas clases
más el filtrado de queryset de cada ViewSet. Ambas cosas, siempre: el permiso
decide *si* se puede ejecutar el método, el queryset decide *sobre qué filas*.
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission

from usuarios.models import RoleType


def _rol(request):
    usuario = getattr(request, "user", None)
    if usuario is None or not usuario.is_authenticated:
        return None
    return usuario.role


class EsAdmin(BasePermission):
    """Solo el rol de negocio `admin`. Fail closed ante cualquier ambigüedad."""

    message = "Se requiere rol de administrador."

    def has_permission(self, request, view):
        return _rol(request) == RoleType.ADMIN


class SoloLecturaAutenticadoEscrituraAdmin(BasePermission):
    """
    Patrón de los catálogos (`property_settings`, `fare_types`, `spa_masseuses`,
    `food_menus`, `wines`, `wine_packages`, `spa_availability`,
    `food_availability`): cualquier usuario con sesión puede leer, solo un admin
    puede escribir.
    """

    message = "Solo un administrador puede modificar este catálogo."

    def has_permission(self, request, view):
        rol = _rol(request)
        if rol is None:
            return False
        if request.method in SAFE_METHODS:
            return True
        return rol == RoleType.ADMIN


class LecturaPublicaEscrituraAdmin(BasePermission):
    """
    Patrón del contenido del Home (`property_photos`, `amenity_categories`,
    `amenities`, `additional_services_info`): lectura pública —cubre visitantes
    sin sesión, igual que el `to public` de las políticas originales— y
    escritura exclusiva de admin.
    """

    message = "Solo un administrador puede modificar el contenido del sitio."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return _rol(request) == RoleType.ADMIN


class EsAdminOSoloLecturaHolder(BasePermission):
    """
    Patrón de `reservations` y de los bookings de servicios: el admin tiene
    acceso total; el holder solo lectura de todo; el guest puede leer y crear
    (el filtrado a *sus* filas lo hace el queryset del ViewSet), pero no
    actualizar ni borrar — eso sigue siendo exclusivo del admin.
    """

    message = "No tienes permiso para modificar esta reservación."

    def has_permission(self, request, view):
        rol = _rol(request)
        if rol is None:
            return False
        if rol == RoleType.ADMIN:
            return True
        if request.method in SAFE_METHODS:
            return True
        # El huésped puede crear; holder no escribe nunca.
        return request.method == "POST" and rol == RoleType.GUEST


class EsDuenoDelPerfilOAdmin(BasePermission):
    """
    Patrón de `profiles`: cada quien lee y edita su propia fila; el admin
    cualquiera; el holder puede leer todas.
    """

    def has_object_permission(self, request, view, obj):
        rol = _rol(request)
        if rol == RoleType.ADMIN:
            return True
        if request.method in SAFE_METHODS:
            return rol == RoleType.HOLDER or obj.pk == request.user.pk
        return obj.pk == request.user.pk
