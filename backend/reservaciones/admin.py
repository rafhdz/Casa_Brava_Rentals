from django.contrib import admin

from reservaciones.models import (
    FoodBooking,
    Reservation,
    SpaBooking,
    WineOrder,
    WineOrderItem,
)


class SpaBookingInline(admin.TabularInline):
    model = SpaBooking
    extra = 0


class FoodBookingInline(admin.TabularInline):
    model = FoodBooking
    extra = 0


class WineOrderInline(admin.TabularInline):
    model = WineOrder
    extra = 0


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ["guest", "check_in", "check_out", "status", "payment_status", "total_amount"]
    list_filter = ["status", "payment_status", "check_in"]
    search_fields = ["guest__email", "guest__first_name", "guest__apellido_paterno"]
    date_hierarchy = "check_in"
    inlines = [SpaBookingInline, FoodBookingInline, WineOrderInline]
    readonly_fields = ["created_at", "updated_at", "deleted_at"]


class WineOrderItemInline(admin.TabularInline):
    model = WineOrderItem
    extra = 0


@admin.register(WineOrder)
class WineOrderAdmin(admin.ModelAdmin):
    list_display = ["reservation", "total_price"]
    inlines = [WineOrderItemInline]
