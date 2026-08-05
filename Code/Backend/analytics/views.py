from django.db.models import Sum

from django_filters.rest_framework import DjangoFilterBackend

from rest_framework import status, viewsets

from rest_framework.decorators import action

from rest_framework.response import Response



from analytics.models import DemandForecast, PredictiveAlert, ReorderRecommendation

from analytics.serializers import (

    DemandForecastSerializer,

    PredictiveAlertSerializer,

    ReorderRecommendationSerializer,

)

from analytics.services import AlertService, ForecastingService, ReorderService

from core.permissions import HasModulePermission, IsOrganizationMember

from inventory.models import Product

from stock.models import StockInTransaction, StockOutTransaction, StockAdjustment





class ForecastViewSet(viewsets.ViewSet):

    module_permission = "forecasting"
    permission_classes = [HasModulePermission]



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



    @action(detail=False, methods=["get"])

    def summary(self, request):

        org = request.user.organization



        all_forecasts = DemandForecast.objects.filter(

            product__organization=org

        ).select_related("product").order_by("-generated_at")



        seen_products = set()

        latest_forecasts = []

        for f in all_forecasts:

            if f.product_id not in seen_products:

                seen_products.add(f.product_id)

                latest_forecasts.append(f)



        top_10 = sorted(latest_forecasts, key=lambda x: x.predicted_demand, reverse=True)[:10]

        top_10_data = [

            {

                "product_id": f.product.id,

                "product_name": f.product.name,

                "sku": f.product.sku,

                "predicted_demand": float(f.predicted_demand)

            }

            for f in top_10

        ]



        import collections

        from django.utils import timezone

        from datetime import timedelta



        end_date = timezone.now().date()

        start_date = end_date - timedelta(days=90)



        txns = StockOutTransaction.objects.filter(

            product__organization=org,

            issued_at__date__gte=start_date,

            issued_at__date__lte=end_date

        )



        actual_weekly = collections.defaultdict(float)

        actual_monthly = collections.defaultdict(float)

        for t in txns:

            date_val = t.issued_at

            week_str = date_val.strftime("%Y-W%W")

            month_str = date_val.strftime("%Y-%m")

            actual_weekly[week_str] += float(t.quantity)

            actual_monthly[month_str] += float(t.quantity)



        predicted_weekly = collections.defaultdict(float)

        predicted_monthly = collections.defaultdict(float)

        for f in latest_forecasts:

            days = (f.forecast_period_end - f.forecast_period_start).days

            if days <= 0:

                continue

            daily_rate = float(f.predicted_demand) / days



            curr = f.forecast_period_start

            while curr <= f.forecast_period_end:

                week_str = curr.strftime("%Y-W%W")

                month_str = curr.strftime("%Y-%m")

                predicted_weekly[week_str] += daily_rate

                predicted_monthly[month_str] += daily_rate

                curr += timedelta(days=1)



        all_weeks = sorted(list(set(actual_weekly.keys()) | set(predicted_weekly.keys())))

        weekly_trend = []

        for w in all_weeks:

            weekly_trend.append({

                "label": w,

                "actual": round(actual_weekly.get(w, 0), 2),

                "predicted": round(predicted_weekly.get(w, 0), 2)

            })



        all_months = sorted(list(set(actual_monthly.keys()) | set(predicted_monthly.keys())))

        monthly_forecast = []

        for m in all_months:

            monthly_forecast.append({

                "label": m,

                "actual": round(actual_monthly.get(m, 0), 2),

                "predicted": round(predicted_monthly.get(m, 0), 2)

            })



        total_predicted = sum(float(f.predicted_demand) for f in latest_forecasts)

        total_actual_90 = sum(float(t.quantity) for t in txns)



        return Response({

            "success": True,

            "data": {

                "top_10": top_10_data,

                "weekly_trend": weekly_trend,

                "monthly_forecast": monthly_forecast,

                "total_predicted_demand": total_predicted,

                "total_actual_sales_90_days": total_actual_90

            }

        })





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

    module_permission = "forecasting"
    permission_classes = [HasModulePermission]

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

    module_permission = "reports"
    permission_classes = [HasModulePermission]



    def list(self, request):

        report_type = request.query_params.get("type", "inventory")

        org = request.user.organization



        if report_type == "inventory":

            from inventory.models import InventoryBalance
            from stock.services import StockService



            balances = InventoryBalance.objects.filter(

                product__organization=org

            ).select_related("product", "product__category", "location")

            data = [

                {

                    "product": b.product.name,

                    "sku": b.product.sku,

                    "stock": b.quantity_on_hand,

                    "value": float(StockService.inventory_value(b.product, b.location)),

                    "category": b.product.category.name,

                }

                for b in balances

            ]

        elif report_type == "movements":

            from datetime import timedelta

            from django.db.models import Count
            from django.db.models.functions import TruncDate
            from django.utils import timezone

            days = min(int(request.query_params.get("days", 30)), 90)
            since = timezone.now() - timedelta(days=days)

            ins = StockInTransaction.objects.filter(product__organization=org).count()
            outs = StockOutTransaction.objects.filter(product__organization=org).count()
            adjs = StockAdjustment.objects.filter(product__organization=org).count()

            ins_series = (
                StockInTransaction.objects.filter(
                    product__organization=org, received_at__gte=since
                )
                .annotate(day=TruncDate("received_at"))
                .values("day")
                .annotate(count=Count("id"))
            )
            outs_series = (
                StockOutTransaction.objects.filter(
                    product__organization=org, issued_at__gte=since
                )
                .annotate(day=TruncDate("issued_at"))
                .values("day")
                .annotate(count=Count("id"))
            )
            by_day = {}
            for row in ins_series:
                key = row["day"].isoformat() if row["day"] else ""
                by_day.setdefault(key, {"date": key, "stock_in": 0, "stock_out": 0})
                by_day[key]["stock_in"] = row["count"]
            for row in outs_series:
                key = row["day"].isoformat() if row["day"] else ""
                by_day.setdefault(key, {"date": key, "stock_in": 0, "stock_out": 0})
                by_day[key]["stock_out"] = row["count"]

            data = {
                "totals": [
                    {"type": "stock_in", "count": ins},
                    {"type": "stock_out", "count": outs},
                    {"type": "adjustments", "count": adjs},
                ],
                "series": [by_day[k] for k in sorted(by_day.keys())],
                "days": days,
            }

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

        elif report_type == "forecast":

            from analytics.models import DemandForecast

            all_forecasts = DemandForecast.objects.filter(

                product__organization=org

            ).select_related("product").order_by("-generated_at")



            seen_products = set()

            latest_forecasts = []

            for f in all_forecasts:

                if f.product_id not in seen_products:

                    seen_products.add(f.product_id)

                    latest_forecasts.append(f)



            data = [

                {

                    "product": f.product.name,

                    "sku": f.product.sku,

                    "model": f.model_name,

                    "start_date": f.forecast_period_start.strftime("%Y-%m-%d"),

                    "end_date": f.forecast_period_end.strftime("%Y-%m-%d"),

                    "predicted_demand": float(f.predicted_demand),

                }

                for f in latest_forecasts

            ]

        elif report_type == "purchases":
            from datetime import datetime

            qs = StockInTransaction.objects.filter(
                product__organization=org
            ).select_related("product", "supplier", "location")

            date_from = request.query_params.get("from")
            date_to = request.query_params.get("to")
            supplier_id = request.query_params.get("supplier_id")
            location_id = request.query_params.get("location_id")
            if date_from:
                try:
                    qs = qs.filter(received_at__date__gte=datetime.strptime(date_from, "%Y-%m-%d").date())
                except ValueError:
                    pass
            if date_to:
                try:
                    qs = qs.filter(received_at__date__lte=datetime.strptime(date_to, "%Y-%m-%d").date())
                except ValueError:
                    pass
            if supplier_id:
                qs = qs.filter(supplier_id=supplier_id)
            if location_id:
                qs = qs.filter(location_id=location_id)

            data = [
                {
                    "date": txn.received_at.strftime("%Y-%m-%d") if txn.received_at else "",
                    "supplier": txn.supplier.name if txn.supplier else "",
                    "product": txn.product.name,
                    "sku": txn.product.sku,
                    "qty": txn.quantity,
                    "unit_cost": float(txn.unit_cost or 0),
                    "line_value": float(txn.unit_cost or 0) * txn.quantity,
                    "location": txn.location.name if txn.location else "",
                    "reference": txn.reference or "",
                }
                for txn in qs.order_by("-received_at")[:2000]
            ]

        elif report_type == "sales":
            from datetime import datetime

            qs = StockOutTransaction.objects.filter(
                product__organization=org
            ).select_related("product", "location")

            date_from = request.query_params.get("from")
            date_to = request.query_params.get("to")
            location_id = request.query_params.get("location_id")
            if date_from:
                try:
                    qs = qs.filter(issued_at__date__gte=datetime.strptime(date_from, "%Y-%m-%d").date())
                except ValueError:
                    pass
            if date_to:
                try:
                    qs = qs.filter(issued_at__date__lte=datetime.strptime(date_to, "%Y-%m-%d").date())
                except ValueError:
                    pass
            if location_id:
                qs = qs.filter(location_id=location_id)

            data = [
                {
                    "date": txn.issued_at.strftime("%Y-%m-%d") if txn.issued_at else "",
                    "product": txn.product.name,
                    "sku": txn.product.sku,
                    "qty": txn.quantity,
                    "cogs": float(txn.cogs or 0),
                    "issued_to": txn.issued_to or "",
                    "location": txn.location.name if txn.location else "",
                    "reference": txn.reference or "",
                }
                for txn in qs.order_by("-issued_at")[:2000]
            ]

        else:

            return Response({"success": False, "error": "Invalid report type"}, status=400)



        return Response({"success": True, "data": data})


class PredictiveAlertViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PredictiveAlertSerializer
    module_permission = "alerts"
    permission_classes = [HasModulePermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["severity", "is_resolved"]

    def get_queryset(self):
        return PredictiveAlert.objects.filter(
            product__organization=self.request.user.organization
        ).select_related("product").order_by("-generated_at")

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.is_resolved = True
        alert.save(update_fields=["is_resolved"])
        return Response(
            {"success": True, "data": PredictiveAlertSerializer(alert).data}
        )

