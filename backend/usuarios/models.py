"""
Perfiles y autenticación.

En Supabase el usuario vivía partido en dos tablas: `auth.users` (credenciales,
gestionadas por GoTrue) y `public.profiles` (datos de negocio + rol), unidas por
un `id` compartido con FK `on delete cascade`. Django ya trae su propia capa de
credenciales, así que aquí ambas se fusionan en un único modelo `Usuario` que
conserva el nombre de tabla original (`profiles`) y todas sus columnas.

El `id` sigue siendo UUID —no el BigAutoField por defecto— para que los datos
existentes de Supabase se puedan migrar sin reescribir llaves foráneas.
"""

import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class RoleType(models.TextChoices):
    """Equivalente del ENUM `public.role_type`.

    Nomenclatura multi-tenant (SUPERADMIN/SUPPLIER) sobre los mismos valores
    de almacenamiento ("admin"/"holder") ya existentes en la base: ADMIN y
    HOLDER quedan como alias de Python del mismo miembro (misma `value`), así
    que ningún dato ni comparación existente (`permissions.py`, `seed_demo.py`,
    serializers) necesita cambiar. GUEST no se renombra por ahora.
    """

    SUPERADMIN = "admin", "Super Administrador"
    SUPPLIER = "holder", "Proveedor"
    GUEST = "guest", "Huésped"


# Alias retrocompatibles: no se declaran dentro de la clase porque
# `enum.unique()` (que Django aplica a todo TextChoices) prohíbe dos miembros
# con el mismo valor. Se asignan después, apuntando al mismo objeto miembro,
# así que `RoleType.ADMIN is RoleType.SUPERADMIN` y ambos comparan igual
# contra el valor almacenado en la base ("admin").
RoleType.ADMIN = RoleType.SUPERADMIN
RoleType.HOLDER = RoleType.SUPPLIER


class ProfileStatus(models.TextChoices):
    """Equivalente del ENUM `public.profile_status`."""

    ACTIVO = "activo", "Activo"
    INVITADO = "invitado", "Invitado"


class UsuarioManager(BaseUserManager):
    """Manager sin `username`: el identificador de sesión es el correo."""

    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("El correo electrónico es obligatorio.")
        extra_fields.setdefault("role", RoleType.GUEST)
        extra_fields.setdefault("status", ProfileStatus.ACTIVO)
        # Un propietario (`holder`) siempre queda activo: es quien recibe las
        # reservaciones `na` de su propia propiedad (ver
        # `reservaciones.services.crear_reservacion`), y una cuenta inactiva lo
        # dejaría sin poder operar su propio panel de gestión. No es un
        # `setdefault`: se fuerza incluso si algún caller futuro intentara
        # pasar `is_active=False` para este rol.
        if extra_fields.get("role") == RoleType.HOLDER:
            extra_fields["is_active"] = True
        usuario = self.model(email=self.normalize_email(email), **extra_fields)
        usuario.set_password(password)
        usuario.save(using=self._db)
        return usuario

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", RoleType.ADMIN)
        extra_fields.setdefault("status", ProfileStatus.ACTIVO)
        extra_fields.setdefault("first_name", "Admin")
        extra_fields.setdefault("apellido_paterno", "Casa Brava")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Un superusuario debe tener is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Un superusuario debe tener is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    """Fusión de `auth.users` + `public.profiles`."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    first_name = models.CharField("nombre(s)", max_length=150)
    apellido_paterno = models.CharField(max_length=150)
    apellido_materno = models.CharField(max_length=150, blank=True, null=True)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=30, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    document_id = models.CharField(max_length=100, blank=True, null=True)

    role = models.CharField(max_length=10, choices=RoleType.choices, default=RoleType.GUEST)
    status = models.CharField(
        max_length=10, choices=ProfileStatus.choices, default=ProfileStatus.INVITADO
    )

    # `is_active` corta el acceso a nivel de autenticación; `status` es el
    # estado de negocio que ya usaba el panel admin. Se mantienen separados.
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UsuarioManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "apellido_paterno"]

    class Meta:
        db_table = "profiles"
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.nombre_completo} <{self.email}>"

    @property
    def nombre_completo(self):
        partes = [self.first_name, self.apellido_paterno, self.apellido_materno]
        return " ".join(parte for parte in partes if parte)

    @property
    def es_admin(self):
        """Rol de negocio `admin` — distinto de `is_superuser` (Django admin)."""
        return self.role == RoleType.ADMIN

    @property
    def es_holder(self):
        return self.role == RoleType.HOLDER

    @property
    def es_guest(self):
        return self.role == RoleType.GUEST

    @property
    def is_verified(self):
        """Estado KYC. Siempre `False` hasta que exista el módulo de verificación."""
        return False
