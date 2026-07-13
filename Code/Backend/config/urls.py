from django.contrib import admin

from django.urls import include, path

from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from rest_framework.routers import DefaultRouter

from rest_framework_simplejwt.views import TokenRefreshView



from accounts.views import LoginView, LogoutView, MeView

from analytics.views import ForecastViewSet, ReorderRecommendationViewSet, ReportViewSet

from audit.views import ActivityLogViewSet

from inventory.views import (

    CategoryViewSet,

    DashboardViewSet,

    InventoryBalanceViewSet,

    LocationViewSet,

    ProductViewSet,

    SettingsViewSet,

)

from notifications.views import NotificationViewSet

from stock.views import (

    StockAdjustmentViewSet,

    StockInViewSet,

    StockOutViewSet,

    StockTransferViewSet,

)

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

router.register(r"notifications", NotificationViewSet, basename="notification")

router.register(r"audit-logs", ActivityLogViewSet, basename="audit-log")

router.register(r"forecasts", ForecastViewSet, basename="forecast")

router.register(r"reorder-recommendations", ReorderRecommendationViewSet, basename="reorder-recommendation")

router.register(r"reports", ReportViewSet, basename="report")

router.register(r"dashboard", DashboardViewSet, basename="dashboard")

router.register(r"settings", SettingsViewSet, basename="settings")



urlpatterns = [

    path("admin/", admin.site.urls),

    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),

    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),

    path("api/v1/auth/login/", LoginView.as_view(), name="auth-login"),

    path("api/v1/auth/logout/", LogoutView.as_view(), name="auth-logout"),

    path("api/v1/auth/me/", MeView.as_view(), name="auth-me"),

    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),

    path("api/v1/", include(router.urls)),

]

