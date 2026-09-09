from django.contrib import admin

from propiedades.models import (
    AdditionalServiceInfo,
    Amenity,
    AmenityCategory,
    FareType,
    Property,
    PropertyAccessGrant,
    PropertyPhoto,
    PropertySettings,
    SupplierProfile,
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


@admin.register(SupplierProfile)
class SupplierProfileAdmin(admin.ModelAdmin):
    list_display = ["business_name", "user", "commission_rate", "is_active"]
    search_fields = ["business_name", "user__email"]


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "access_type", "base_price_per_night", "is_active"]
    list_filter = ["access_type", "is_active"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(PropertyAccessGrant)
class PropertyAccessGrantAdmin(admin.ModelAdmin):
    list_display = ["property", "user", "granted_at"]
    list_filter = ["property"]
    search_fields = ["user__email"]
