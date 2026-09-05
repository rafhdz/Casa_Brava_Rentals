from django.contrib import admin

from proveedores.models import SpaMasseuse


@admin.register(SpaMasseuse)
class SpaMasseuseAdmin(admin.ModelAdmin):
    list_display = ["name", "status"]
    list_filter = ["status"]
    search_fields = ["name"]
