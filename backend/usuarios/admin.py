from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from usuarios.models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    ordering = ["-created_at"]
    list_display = ["email", "nombre_completo", "role", "status", "is_active", "created_at"]
    list_filter = ["role", "status", "is_active"]
    search_fields = ["email", "first_name", "apellido_paterno", "apellido_materno"]
    readonly_fields = ["created_at", "updated_at", "last_login"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Datos personales",
            {
                "fields": (
                    "first_name",
                    "apellido_paterno",
                    "apellido_materno",
                    "phone",
                    "date_of_birth",
                    "document_id",
                )
            },
        ),
        ("Rol y estado", {"fields": ("role", "status")}),
        ("Permisos de Django", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "first_name", "apellido_paterno", "role", "password1", "password2"),
            },
        ),
    )
