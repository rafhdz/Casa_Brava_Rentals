from django.contrib import admin

from servicios.models import FoodAvailability, FoodMenu, SpaAvailability, Wine, WinePackage


@admin.register(FoodMenu)
class FoodMenuAdmin(admin.ModelAdmin):
    list_display = ["name", "meal_type", "price_per_person"]
    list_filter = ["meal_type"]


@admin.register(Wine)
class WineAdmin(admin.ModelAdmin):
    list_display = ["name", "type", "price", "stock"]
    list_filter = ["type"]


@admin.register(WinePackage)
class WinePackageAdmin(admin.ModelAdmin):
    list_display = ["name", "price"]


@admin.register(SpaAvailability)
class SpaAvailabilityAdmin(admin.ModelAdmin):
    list_display = ["masseuse", "available_date", "available_time", "is_booked"]
    list_filter = ["masseuse", "is_booked", "available_date"]
    # `is_booked` es una bandera derivada: la mantienen los servicios
    # transaccionales, y editarla a mano desincroniza el inventario.
    readonly_fields = ["is_booked"]


@admin.register(FoodAvailability)
class FoodAvailabilityAdmin(admin.ModelAdmin):
    list_display = ["available_date"]
