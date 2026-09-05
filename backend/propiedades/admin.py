from django.contrib import admin

from propiedades.models import (
    AdditionalServiceInfo,
    Amenity,
    AmenityCategory,
    FareType,
    PropertyPhoto,
    PropertySettings,
)


@admin.register(PropertySettings)
class PropertySettingsAdmin(admin.ModelAdmin):
    list_display = ["nightly_rate", "security_deposit"]


@admin.register(FareType)
class FareTypeAdmin(admin.ModelAdmin):
    list_display = ["name", "surcharge_percentage"]


@admin.register(PropertyPhoto)
class PropertyPhotoAdmin(admin.ModelAdmin):
    list_display = ["label", "sort_order"]
    ordering = ["sort_order"]


class AmenityInline(admin.TabularInline):
    model = Amenity
    extra = 0


@admin.register(AmenityCategory)
class AmenityCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "sort_order"]
    inlines = [AmenityInline]


@admin.register(AdditionalServiceInfo)
class AdditionalServiceInfoAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "price_hint"]
