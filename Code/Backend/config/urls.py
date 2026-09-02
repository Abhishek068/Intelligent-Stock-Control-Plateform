from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView


def _seed_view(request):
    import io, traceback
    from django.core.management import call_command
    out = io.StringIO()
    try:
        call_command("seed_mock_data", stdout=out)
        return JsonResponse({"status": "success", "output": out.getvalue()})
    except Exception as e:
        return JsonResponse({"status": "error", "error": str(e), "traceback": traceback.format_exc(), "output": out.getvalue()})


def _debug_perms(request):
    from emails.models import EmailQueue, EmailLog, EmailProviderConfig
    from emails.services import process_pending_emails, process_queue_item
    from accounts.models import User
    
    queue_items = list(EmailQueue.objects.order_by("-created_at")[:10].values("id", "recipient", "subject", "status", "attempts", "error_message", "created_at"))
    logs = list(EmailLog.objects.order_by("-created_at")[:10].values("id", "recipient", "subject", "status", "provider_response", "created_at"))
    configs = list(EmailProviderConfig.objects.all().values("id", "provider", "sender_email", "sender_name", "is_active", "environment"))
    
    res = process_pending_emails(10)
    
    return JsonResponse({
        "process_result": res,
        "queue": queue_items,
        "logs": logs,
        "configs": configs,
    })

from accounts.user_views import PermissionCatalogView, RoleViewSet, UserViewSet
from accounts.views import (
    ChangePasswordView,
    DebugPermsView,
    ForgotPasswordView,
    LoginView,
    LogoutView,
    MeView,
    ResetPasswordView,
    VerifyEmailView,
)
from activity.views import ActivityEventViewSet, AdminDashboardView, GlobalSearchView, DashboardStreamView
from analytics.chatbot_views import ChatbotQueryView
from analytics.views import (
    AbcXyzAnalyticsViewSet,
    ForecastViewSet,
    PredictiveAlertViewSet,
    ReorderRecommendationViewSet,
    ReportViewSet,
)
from audit.views import ActivityLogViewSet
from emails.views import (
    EmailLogViewSet,
    EmailProviderConfigViewSet,
    EmailQueueViewSet,
    EmailTemplateViewSet,
    ScheduledReportViewSet,
)
from inventory.views import (
    CategoryViewSet,
    DashboardViewSet,
    InventoryBalanceViewSet,
    LocationViewSet,
    ProductViewSet,
    SettingsViewSet,
)
from notifications.views import DeviceTokenViewSet, NotificationViewSet
from stock.views import (
    BatchViewSet,
    StockAdjustmentViewSet,
    StockInViewSet,
    StockOutViewSet,
    StockTakeViewSet,
    StockTransferViewSet,
    SupplierReturnViewSet,
)
from billing.views import CustomerViewSet, InvoiceViewSet
from procurement.views import PurchaseOrderViewSet
from suppliers.views import SupplierViewSet

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"locations", LocationViewSet, basename="location")
router.register(r"products", ProductViewSet, basename="product")
router.register(r"inventory-balances", InventoryBalanceViewSet, basename="inventory-balance")
router.register(r"suppliers", SupplierViewSet, basename="supplier")
router.register(r"stock-in", StockInViewSet, basename="stock-in")
router.register(r"stock-out", StockOutViewSet, basename="stock-out")
router.register(r"stock-adjustments", StockAdjustmentViewSet, basename="stock-adjustment")
router.register(r"stock-transfers", StockTransferViewSet, basename="stock-transfer")
router.register(r"stock-takes", StockTakeViewSet, basename="stock-take")
router.register(r"batches", BatchViewSet, basename="batch")
router.register(r"supplier-returns", SupplierReturnViewSet, basename="supplier-return")
router.register(r"purchase-orders", PurchaseOrderViewSet, basename="purchase-order")
router.register(r"customers", CustomerViewSet, basename="customer")
router.register(r"invoices", InvoiceViewSet, basename="invoice")
router.register(r"notifications", NotificationViewSet, basename="notification")
router.register(r"device-tokens", DeviceTokenViewSet, basename="device-token")
router.register(r"audit-logs", ActivityLogViewSet, basename="audit-log")
router.register(r"forecasts", ForecastViewSet, basename="forecast")
router.register(r"reorder-recommendations", ReorderRecommendationViewSet, basename="reorder-recommendation")
router.register(r"predictive-alerts", PredictiveAlertViewSet, basename="predictive-alert")
router.register(r"analytics", AbcXyzAnalyticsViewSet, basename="abc-xyz-analytics")
router.register(r"reports", ReportViewSet, basename="report")
router.register(r"dashboard", DashboardViewSet, basename="dashboard")
router.register(r"settings", SettingsViewSet, basename="settings")
router.register(r"users", UserViewSet, basename="user")
router.register(r"roles", RoleViewSet, basename="role")
router.register(r"email-templates", EmailTemplateViewSet, basename="email-template")
router.register(r"email-queue", EmailQueueViewSet, basename="email-queue")
router.register(r"email-logs", EmailLogViewSet, basename="email-log")
router.register(r"email-config", EmailProviderConfigViewSet, basename="email-config")
router.register(r"scheduled-reports", ScheduledReportViewSet, basename="scheduled-report")
router.register(r"activity", ActivityEventViewSet, basename="activity")

urlpatterns = [
    path("api/v1/seed/", _seed_view, name="seed-mock-data"),
    path("api/v1/debug-perms/", _debug_perms, name="debug-perms"),
    path("api/v1/debug-clean-staff/", DebugPermsView.as_view(), name="debug-clean-staff"),
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/v1/auth/login/", LoginView.as_view(), name="auth-login"),
    path("api/v1/auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("api/v1/auth/me/", MeView.as_view(), name="auth-me"),
    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/v1/auth/forgot-password/", ForgotPasswordView.as_view(), name="auth-forgot-password"),
    path("api/v1/auth/reset-password/", ResetPasswordView.as_view(), name="auth-reset-password"),
    path("api/v1/auth/change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
    path("api/v1/auth/verify-email/", VerifyEmailView.as_view(), name="auth-verify-email"),
    path("api/v1/permissions/catalog/", PermissionCatalogView.as_view(), name="permission-catalog"),
    path("api/v1/admin-dashboard/", AdminDashboardView.as_view(), name="admin-dashboard"),
    path("api/v1/dashboard/stream/", DashboardStreamView.as_view(), name="dashboard-stream"),
    path("api/v1/search/", GlobalSearchView.as_view(), name="global-search"),
    path("api/v1/chatbot/query/", ChatbotQueryView.as_view(), name="chatbot-query"),
    path("api/v1/", include(router.urls)),
]
