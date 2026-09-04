"""
Mapa de rutas de la API.

Todo cuelga de `/api/`, con un prefijo por app para que la frontera entre
módulos sea visible desde la URL:

    /api/auth/           Tokens JWT y alta de huésped
    /api/usuarios/       Perfiles
    /api/propiedades/    Configuración, tarifas y contenido del Home
    /api/servicios/      Catálogos y disponibilidad
    /api/proveedores/    Masajistas
    /api/reservaciones/  Estadías y servicios contratados
    /api/pagos/          Movimientos de cobro
    /api/docs/           Documentación interactiva (OpenAPI)
"""

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import (
    TokenBlacklistView,
    TokenRefreshView,
    TokenVerifyView,
)

from usuarios.views import CasaBravaTokenObtainPairView, RegistroView

auth_patterns = [
    # Correo + contraseña ⇒ {access, refresh, user}
    path("token/", CasaBravaTokenObtainPairView.as_view(), name="token_obtain_pair"),
    # refresh ⇒ nuevo access (y nuevo refresh: la rotación está activada)
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token_verify"),
    # Cierre de sesión: invalida el refresh recibido (requiere token_blacklist)
    path("logout/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("registro/", RegistroView.as_view(), name="registro"),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include(auth_patterns)),
    path("api/usuarios/", include("usuarios.urls")),
    path("api/propiedades/", include("propiedades.urls")),
    path("api/servicios/", include("servicios.urls")),
    path("api/proveedores/", include("proveedores.urls")),
    path("api/reservaciones/", include("reservaciones.urls")),
    path("api/pagos/", include("pagos.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]
