from django.contrib import admin

from core.models import Organization, OrganizationSettings


class OrganizationSettingsInline(admin.StackedInline):
    model = OrganizationSettings
    can_delete = False
    verbose_name_plural = "Settings"


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "is_active", "created_at")
    list_filter = ("is_active",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    inlines = [OrganizationSettingsInline]


@admin.register(OrganizationSettings)
class OrganizationSettingsAdmin(admin.ModelAdmin):
    list_display = (
        "organization",
        "company_name",
        "currency_code",
        "enable_predictive_alerts",
        "updated_at",
    )
    list_filter = ("currency_code", "enable_predictive_alerts")
    search_fields = ("organization__name", "company_name")
