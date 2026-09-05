"""Serializers de perfiles y autenticación."""

from django.contrib.auth import password_validation
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from usuarios.models import ProfileStatus, RoleType, Usuario


class UsuarioSerializer(serializers.ModelSerializer):
    """Lectura y edición de un perfil.

    `role` y `status` son de solo lectura salvo que quien edita sea admin. Es el
    equivalente del trigger `prevent_profile_privilege_escalation` que en
    Postgres impedía que un huésped se autoascendiera editando su propia fila:
    la política dejaba pasar la fila entera, y el trigger cerraba las dos
    columnas sensibles. Aquí ese cierre vive en `validate()`.
    """

    nombre_completo = serializers.CharField(read_only=True)

    class Meta:
        model = Usuario
        fields = [
            "id",
            "email",
            "first_name",
            "apellido_paterno",
            "apellido_materno",
            "nombre_completo",
            "phone",
            "date_of_birth",
            "document_id",
            "role",
            "status",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "is_active"]

    def validate(self, attrs):
        request = self.context.get("request")
        editor = getattr(request, "user", None)
        campos_privilegiados = {"role", "status"} & set(attrs)

        if not campos_privilegiados:
            return attrs

        if editor is None or not editor.is_authenticated or not editor.es_admin:
            raise serializers.ValidationError(
                {"role": "Solo un administrador puede cambiar el rol o el estado de una cuenta."}
            )

        # Un admin tampoco puede degradarse ni suspenderse a sí mismo: sería el
        # camino más corto para dejar el panel sin nadie que pueda entrar,
        # recuperable solo interviniendo la base de datos a mano.
        if self.instance is not None and self.instance.pk == editor.pk:
            raise serializers.ValidationError(
                {"role": "No puedes modificar tu propio rol o estado."}
            )

        return attrs


class UsuarioCreateSerializer(serializers.ModelSerializer):
    """Alta de cuenta desde el panel de administración (rol libre)."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = Usuario
        fields = [
            "id",
            "email",
            "password",
            "first_name",
            "apellido_paterno",
            "apellido_materno",
            "phone",
            "role",
            "status",
        ]
        read_only_fields = ["id"]

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        validated_data.setdefault("status", ProfileStatus.ACTIVO)
        return Usuario.objects.create_user(password=password, **validated_data)


class RegistroSerializer(serializers.ModelSerializer):
    """
    Auto-registro del huésped (`/api/auth/registro/`).

    Siempre crea rol `guest`: `role` ni siquiera está entre los campos, así que
    no hay forma de escalar privilegios mandando el campo en el payload. Crear
    admins o titulares sigue siendo exclusivo del panel de administración.
    """

    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = Usuario
        fields = [
            "id",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "apellido_paterno",
            "apellido_materno",
            "phone",
        ]
        read_only_fields = ["id"]

    def validate_email(self, value):
        if Usuario.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Ya existe una cuenta con este correo.")
        return value

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Las contraseñas no coinciden."})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return Usuario.objects.create_user(
            password=password,
            role=RoleType.GUEST,
            status=ProfileStatus.ACTIVO,
            **validated_data,
        )


class CasaBravaTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Token de acceso con el rol dentro del propio JWT.

    Permite que el frontend decida qué mostrar sin una consulta extra al perfil
    —lo que en la versión Supabase obligaba a un `select` a `profiles` justo
    después del login—, pero la autorización real la sigue resolviendo el
    backend en cada petición: el claim es una conveniencia de UI, no la fuente
    de verdad.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UsuarioSerializer(self.user).data
        return data
