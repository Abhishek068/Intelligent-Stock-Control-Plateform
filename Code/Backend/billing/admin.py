from django.contrib import admin

from billing.models import Customer, Invoice, InvoiceLine, InvoicePayment


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "company", "status", "organization")
    list_filter = ("status",)
    search_fields = ("name", "email", "company")


class InvoiceLineInline(admin.TabularInline):
    model = InvoiceLine
    extra = 0


class InvoicePaymentInline(admin.TabularInline):
    model = InvoicePayment
    extra = 0
    readonly_fields = ("amount", "method", "paid_at", "notes", "recorded_by")


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        "invoice_number",
        "customer",
        "status",
        "total_amount",
        "due_date",
        "created_at",
    )
    list_filter = ("status",)
    search_fields = ("invoice_number", "customer__name")
    inlines = [InvoiceLineInline, InvoicePaymentInline]
