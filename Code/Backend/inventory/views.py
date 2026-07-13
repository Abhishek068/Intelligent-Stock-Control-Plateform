from django.db.models import Sum

from django_filters.rest_framework import DjangoFilterBackend

from rest_framework import filters, viewsets

from rest_framework.decorators import action

from rest_framework.response import Response



from core.mixins import OrganizationScopedViewSet

from core.permissions import IsAdminRole, IsManagerOrAdmin, IsReadOnlyOrElevated

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

    permission_classes = [IsReadOnlyOrElevated]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    search_fields = ["name"]

    ordering_fields = ["name", "created_at"]





class LocationViewSet(OrganizationScopedViewSet):

    queryset = Location.objects.all()

    serializer_class = LocationSerializer

    permission_classes = [IsReadOnlyOrElevated]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter]

    filterset_fields = ["location_type", "is_active"]

    search_fields = ["name"]





class ProductViewSet(OrganizationScopedViewSet):

    queryset = Product.objects.select_related("category", "supplier").all()

    permission_classes = [IsReadOnlyOrElevated]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    filterset_fields = ["category", "supplier", "is_active"]

    search_fields = ["sku", "name", "barcode"]

    ordering_fields = ["name", "sku", "unit_price", "created_at"]



    def get_serializer_class(self):

        if self.action == "retrieve":

            return ProductDetailSerializer

        return ProductSerializer



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





class InventoryBalanceViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = InventoryBalanceSerializer

    filter_backends = [DjangoFilterBackend]

    filterset_fields = ["product", "location"]



    def get_queryset(self):

        return InventoryBalance.objects.filter(

            product__organization=self.request.user.organization

        ).select_related("product", "location")





class SettingsViewSet(viewsets.ViewSet):

    permission_classes = [IsAdminRole]



    def _get_settings(self, request):

        return OrganizationSettings.objects.get_or_create(

            organization=request.user.organization

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

        org = request.user.organization

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

                    "role": request.user.role,

                },

            }

        )

