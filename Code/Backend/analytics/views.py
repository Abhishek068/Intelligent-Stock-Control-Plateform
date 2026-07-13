from django.db.models import Sum

from django_filters.rest_framework import DjangoFilterBackend

from rest_framework import status, viewsets

from rest_framework.decorators import action

from rest_framework.response import Response



from analytics.models import DemandForecast, ReorderRecommendation

from analytics.serializers import (

    DemandForecastSerializer,

    ReorderRecommendationSerializer,

)

from analytics.services import AlertService, ForecastingService, ReorderService

from core.permissions import IsManagerOrAdmin, IsOrganizationMember

from inventory.models import Product

from stock.models import StockInTransaction, StockOutTransaction, StockAdjustment





class ForecastViewSet(viewsets.ViewSet):

    permission_classes = [IsManagerOrAdmin]



    def list(self, request):

        org = request.user.organization

        product_id = request.query_params.get("product")

        if not product_id:

            forecasts = DemandForecast.objects.filter(

                product__organization=org

            ).select_related("product")[:20]

            return Response(

                {"success": True, "data": DemandForecastSerializer(forecasts, many=True).data}

            )

        try:

            product = Product.objects.get(id=product_id, organization=org)

        except Product.DoesNotExist:

            return Response({"success": False, "error": "Product not found"}, status=404)



        chart = ForecastingService.get_chart_data(product)

        latest = DemandForecast.objects.filter(product=product).order_by("-generated_at").first()

        return Response(

            {

                "success": True,

                "data": {

                    "chart": chart,

                    "latest_forecast": DemandForecastSerializer(latest).data if latest else None,

                },

            }

        )



    @action(detail=False, methods=["post"])

    def generate(self, request):

        org = request.user.organization

        product_id = request.data.get("product_id")

        horizon = int(request.data.get("horizon_days", 30))

        if not product_id:

            return Response({"success": False, "error": "product_id required"}, status=400)

        try:

            product = Product.objects.get(id=product_id, organization=org)

        except Product.DoesNotExist:

            return Response({"success": False, "error": "Product not found"}, status=404)



        forecast = ForecastingService.forecast_product(product, horizon_days=horizon)

        chart = ForecastingService.get_chart_data(product)

        return Response(

            {

                "success": True,

                "data": {

                    "forecast": DemandForecastSerializer(forecast).data,

                    "chart": chart,

                },

            }

        )





class ReorderRecommendationViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = ReorderRecommendationSerializer

    permission_classes = [IsManagerOrAdmin]

    filter_backends = [DjangoFilterBackend]

    filterset_fields = ["priority", "is_active"]



    def get_queryset(self):

        return ReorderRecommendation.objects.filter(

            product__organization=self.request.user.organization,

            is_active=True,

        ).select_related("product", "product__supplier")



    @action(detail=False, methods=["post"])

    def generate(self, request):

        recs = ReorderService.generate_all(request.user.organization)

        AlertService.evaluate_organization(request.user.organization)

        return Response(

            {

                "success": True,

                "data": ReorderRecommendationSerializer(recs, many=True).data,

            }

        )





class ReportViewSet(viewsets.ViewSet):

    permission_classes = [IsManagerOrAdmin]



    def list(self, request):

        report_type = request.query_params.get("type", "inventory")

        org = request.user.organization



        if report_type == "inventory":

            from inventory.models import InventoryBalance



            balances = InventoryBalance.objects.filter(

                product__organization=org

            ).select_related("product", "product__category")

            data = [

                {

                    "product": b.product.name,

                    "sku": b.product.sku,

                    "stock": b.quantity_on_hand,

                    "value": float(b.quantity_on_hand * b.product.unit_price),

                    "category": b.product.category.name,

                }

                for b in balances

            ]

        elif report_type == "movements":

            ins = StockInTransaction.objects.filter(product__organization=org).count()

            outs = StockOutTransaction.objects.filter(product__organization=org).count()

            adjs = StockAdjustment.objects.filter(product__organization=org).count()

            data = [{"type": "stock_in", "count": ins}, {"type": "stock_out", "count": outs}, {"type": "adjustments", "count": adjs}]

        elif report_type == "low_stock":

            from inventory.models import InventoryBalance, Product



            products = Product.objects.filter(organization=org, is_active=True)

            data = []

            for p in products:

                stock = (

                    InventoryBalance.objects.filter(product=p).aggregate(

                        total=Sum("quantity_on_hand")

                    )["total"]

                    or 0

                )

                if stock <= p.minimum_level:

                    data.append(

                        {

                            "product": p.name,

                            "sku": p.sku,

                            "stock": stock,

                            "minimum_level": p.minimum_level,

                            "reorder_level": p.reorder_level,

                        }

                    )

        else:

            return Response({"success": False, "error": "Invalid report type"}, status=400)



        return Response({"success": True, "data": data})

