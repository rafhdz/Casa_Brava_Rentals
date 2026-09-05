"""Endpoints de perfiles y autenticación."""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import CreateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from usuarios.models import RoleType, Usuario
from usuarios.permissions import EsDuenoDelPerfilOAdmin
from usuarios.serializers import (
    CasaBravaTokenObtainPairSerializer,
    RegistroSerializer,
    UsuarioCreateSerializer,
    UsuarioSerializer,
)


class CasaBravaTokenObtainPairView(TokenObtainPairView):
    """`POST /api/auth/token/` — correo + contraseña ⇒ access + refresh."""

    serializer_class = CasaBravaTokenObtainPairSerializer


class RegistroView(CreateAPIView):
    """`POST /api/auth/registro/` — alta de huésped, sin sesión previa."""

    serializer_class = RegistroSerializer
    permission_classes = [AllowAny]


class UsuarioViewSet(viewsets.ModelViewSet):
    """
    CRUD de perfiles.

    El filtrado por rol reemplaza a las políticas RLS de `profiles`: admin ve
    todo, holder ve todo en solo lectura, y cualquier otro rol solo se ve a sí
    mismo. El queryset es la defensa real —no el permiso—: un huésped que pida
    el detalle de otra cuenta recibe 404, no 403, porque esa fila sencillamente
    no está en su universo visible.
    """

    queryset = Usuario.objects.all()
    # Alcance real en `get_queryset()`; esto solo declara el modelo base.
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated, EsDuenoDelPerfilOAdmin]
    search_fields = ["email", "first_name", "apellido_paterno", "apellido_materno"]
    ordering_fields = ["created_at", "email", "role"]

    def get_queryset(self):
        usuario = self.request.user
        if usuario.es_admin or usuario.es_holder:
            return Usuario.objects.all()
        return Usuario.objects.filter(pk=usuario.pk)

    def get_serializer_class(self):
        if self.action == "create":
            return UsuarioCreateSerializer
        return UsuarioSerializer

    def create(self, request, *args, **kwargs):
        if not request.user.es_admin:
            return Response(
                {"detail": "Solo un administrador puede crear cuentas desde este endpoint."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().create(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instancia = self.get_object()
        if not request.user.es_admin:
            return Response(
                {"detail": "Solo un administrador puede eliminar cuentas."},
                status=status.HTTP_403_FORBIDDEN,
            )
        # Mismo guard que impedía el auto-lockout en el panel original: el
        # último admin no puede borrarse a sí mismo y dejar el panel sin acceso.
        if instancia.pk == request.user.pk:
            return Response(
                {"detail": "No puedes eliminar tu propia cuenta."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=["get", "patch"], url_path="me")
    def me(self, request):
        """`/api/usuarios/me/` — el perfil de la sesión activa."""
        if request.method == "PATCH":
            serializer = self.get_serializer(request.user, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(UsuarioSerializer(request.user).data)
