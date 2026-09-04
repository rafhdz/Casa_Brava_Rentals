from django.contrib import admin

from pagos.models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["reservation", "amount", "status", "provider", "created_at"]
    list_filter = ["status", "provider"]
    readonly_fields = ["created_at", "updated_at"]
