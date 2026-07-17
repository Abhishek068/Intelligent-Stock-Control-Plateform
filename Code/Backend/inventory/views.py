from django.db.models import Sum

from django_filters.rest_framework import DjangoFilterBackend

from rest_framework import filters, viewsets

from rest_framework.decorators import action

from rest_framework.response import Response



from core.mixins import OrganizationScopedViewSet

from core.permissions import HasModulePermission, IsSuperAdmin

from core.models import OrganizationSettings

from accounts.serializers import OrganizationSettingsSerializer

from inventory.models import Category, InventoryBalance, Location, Product

from inventory.serializers import (

    CategorySerializer,

    InventoryBalanceSerializer,

    LocationSerializer,

    ProductDetailSerializer,

    ProductSerializer,

)





class CategoryViewSet(OrganizationScopedViewSet):

    queryset = Category.objects.all()

    serializer_class = CategorySerializer

    module_permission = "categories"
    permission_classes = [HasModulePermission]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    search_fields = ["name"]

    ordering_fields = ["name", "created_at"]





class LocationViewSet(OrganizationScopedViewSet):

    queryset = Location.objects.all()

    serializer_class = LocationSerializer

    module_permission = "products"
    permission_classes = [HasModulePermission]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter]

    filterset_fields = ["location_type", "is_active"]

    search_fields = ["name"]





class ProductViewSet(OrganizationScopedViewSet):

    queryset = Product.objects.select_related("category", "supplier").all()

    module_permission = "products"
    permission_classes = [HasModulePermission]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    filterset_fields = ["category", "supplier", "is_active"]

    search_fields = ["sku", "name", "barcode"]

    ordering_fields = ["name", "sku", "unit_price", "created_at"]



    def get_serializer_class(self):

        if self.action == "retrieve":

            return ProductDetailSerializer

        return ProductSerializer

    def perform_create(self, serializer):
        super().perform_create(serializer)
        product = serializer.instance
        try:
            from activity.services import record_activity

            record_activity(
                organization=product.organization,
                user=self.request.user,
                event_type="product_added",
                title=f"Product added: {product.name}",
                description=f"SKU {product.sku}",
                entity_type="Product",
                entity_id=product.id,
            )
        except Exception:
            pass

    @action(detail=False, methods=["get"])

    def lookup_by_sku(self, request):

        sku = request.query_params.get("sku")

        if not sku:

            return Response({"success": False, "error": "sku parameter required"}, status=400)

        try:

            product = self.get_queryset().get(sku=sku)

        except Product.DoesNotExist:

            return Response({"success": False, "error": "Product not found"}, status=404)

        return Response({"success": True, "data": ProductDetailSerializer(product).data})

    @action(detail=False, methods=["get"])
    def lookup(self, request):
        """Lookup by SKU or barcode."""
        code = (request.query_params.get("code") or request.query_params.get("q") or "").strip()
        if not code:
            return Response(
                {"success": False, "error": "code parameter required"},
                status=400,
            )
        qs = self.get_queryset()
        product = qs.filter(sku__iexact=code).first() or qs.filter(barcode__iexact=code).first()
        if not product:
            return Response({"success": False, "error": "Product not found"}, status=404)
        return Response({"success": True, "data": ProductDetailSerializer(product).data})





class InventoryBalanceViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = InventoryBalanceSerializer

    filter_backends = [DjangoFilterBackend]

    filterset_fields = ["product", "location"]



    def get_queryset(self):

        return InventoryBalance.objects.filter(

            product__organization=self.request.user.organization

        ).select_related("product", "location")





class SettingsViewSet(viewsets.ViewSet):

    permission_classes = [IsSuperAdmin]



    def _get_settings(self, request):

        from accounts.services import ensure_default_organization

        org = request.user.organization
        if not org:
            org = ensure_default_organization()
            if request.user.is_superuser and not request.user.organization_id:
                request.user.organization = org
                request.user.status = request.user.Status.ACTIVE
                request.user.save(update_fields=["organization", "status"])

        return OrganizationSettings.objects.get_or_create(

            organization=org

        )[0]



    def list(self, request):

        settings = self._get_settings(request)

        return Response({"success": True, "data": OrganizationSettingsSerializer(settings).data})



    def partial_update(self, request, pk=None):

        settings = self._get_settings(request)

        serializer = OrganizationSettingsSerializer(settings, data=request.data, partial=True)

        serializer.is_valid(raise_exception=True)

        serializer.save()

        return Response({"success": True, "data": serializer.data})





class DashboardViewSet(viewsets.ViewSet):

    def list(self, request):

        from accounts.services import ensure_default_organization

        org = request.user.organization
        if not org and request.user.is_superuser:
            org = ensure_default_organization()
            request.user.organization = org
            request.user.status = request.user.Status.ACTIVE
            request.user.save(update_fields=["organization", "status"])

        if not org:
            return Response({"success": True, "data": {
                "total_inventory_value": 0,
                "low_stock_count": 0,
                "out_of_stock_count": 0,
                "open_alerts_count": 0,
                "reorder_count": 0,
                "total_products": 0,
                "role": request.user.primary_role_name(),
                "is_superuser": request.user.is_superuser,
                "permissions": request.user.permission_map(),
            }})

        products = Product.objects.filter(organization=org, is_active=True)

        balances = InventoryBalance.objects.filter(product__organization=org)



        total_value = sum(

            (b.quantity_on_hand * b.product.unit_price for b in balances.select_related("product"))

        )

        stock_by_product = {}

        for b in balances:

            stock_by_product[b.product_id] = stock_by_product.get(b.product_id, 0) + b.quantity_on_hand



        low_stock = 0

        out_of_stock = 0

        for p in products:

            stock = stock_by_product.get(p.id, 0)

            if stock == 0:

                out_of_stock += 1

            elif stock <= p.minimum_level:

                low_stock += 1



        from notifications.models import Notification



        open_alerts = Notification.objects.filter(organization=org, is_read=False).count()



        from analytics.models import ReorderRecommendation



        reorder_count = ReorderRecommendation.objects.filter(

            product__organization=org, is_active=True

        ).exclude(priority="Low").count()



        return Response(

            {

                "success": True,

                "data": {

                    "total_inventory_value": float(total_value),

                    "low_stock_count": low_stock,

                    "out_of_stock_count": out_of_stock,

                    "open_alerts_count": open_alerts,

                    "reorder_count": reorder_count,

                    "total_products": products.count(),

                    "role": request.user.primary_role_name(),
                    "is_superuser": request.user.is_superuser,
                    "permissions": request.user.permission_map(),

                },

            }

        )

    @action(detail=False, methods=["get"])
    def trends(self, request):
        """Movement series + top low-stock SKUs for dashboard charts."""
        from datetime import timedelta

        from django.db.models import Count
        from django.db.models.functions import TruncDate
        from django.utils import timezone

        from stock.models import StockInTransaction, StockOutTransaction

        org = request.user.organization
        if not org:
            return Response({"success": True, "data": {"movements": [], "top_low_stock": []}})

        days = min(int(request.query_params.get("days", 14)), 90)
        since = timezone.now() - timedelta(days=days)

        ins = (
            StockInTransaction.objects.filter(
                product__organization=org, received_at__gte=since
            )
            .annotate(day=TruncDate("received_at"))
            .values("day")
            .annotate(count=Count("id"))
        )
        outs = (
            StockOutTransaction.objects.filter(
                product__organization=org, issued_at__gte=since
            )
            .annotate(day=TruncDate("issued_at"))
            .values("day")
            .annotate(count=Count("id"))
        )
        by_day = {}
        for row in ins:
            key = row["day"].isoformat() if row["day"] else ""
            by_day.setdefault(key, {"name": key[5:] if key else "", "stock_in": 0, "stock_out": 0})
            by_day[key]["stock_in"] = row["count"]
        for row in outs:
            key = row["day"].isoformat() if row["day"] else ""
            by_day.setdefault(key, {"name": key[5:] if key else "", "stock_in": 0, "stock_out": 0})
            by_day[key]["stock_out"] = row["count"]
        movements = [by_day[k] for k in sorted(by_day.keys())]

        products = Product.objects.filter(organization=org, is_active=True)
        balances = InventoryBalance.objects.filter(product__organization=org)
        stock_by_product = {}
        for b in balances:
            stock_by_product[b.product_id] = stock_by_product.get(b.product_id, 0) + b.quantity_on_hand

        top_low = []
        for p in products:
            stock = stock_by_product.get(p.id, 0)
            if stock <= p.minimum_level:
                top_low.append(
                    {
                        "product_id": p.id,
                        "product": p.name,
                        "sku": p.sku,
                        "stock": stock,
                        "minimum_level": p.minimum_level,
                        "reorder_level": p.reorder_level,
                    }
                )
        top_low.sort(key=lambda x: x["stock"])
        top_low = top_low[:10]

        return Response(
            {
                "success": True,
                "data": {
                    "movements": movements,
                    "top_low_stock": top_low,
                    "days": days,
                },
            }
        )

