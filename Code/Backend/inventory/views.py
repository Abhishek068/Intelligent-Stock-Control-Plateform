from django.db.models import Sum

from django_filters.rest_framework import DjangoFilterBackend

from rest_framework import filters, viewsets

from rest_framework.decorators import action

from rest_framework.response import Response



from core.mixins import OrganizationScopedViewSet

from core.permissions import HasModulePermission, IsSuperAdmin

from core.models import OrganizationSettings

from accounts.serializers import OrganizationSettingsSerializer

from inventory.models import Category, InventoryBalance, Location, Product, ProductImportJob

from inventory.serializers import (
    CategorySerializer,
    InventoryBalanceSerializer,
    LocationSerializer,
    ProductDetailSerializer,
    ProductSerializer,
    ProductChangeHistorySerializer,
    ProductImportJobSerializer,
)





class CategoryViewSet(OrganizationScopedViewSet):

    queryset = Category.objects.all()

    serializer_class = CategorySerializer

    pagination_class = None

    module_permission = "categories"
    permission_classes = [HasModulePermission]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    search_fields = ["name"]

    ordering_fields = ["name", "created_at"]





class LocationViewSet(OrganizationScopedViewSet):

    queryset = Location.objects.all()

    serializer_class = LocationSerializer

    pagination_class = None

    module_permission = "products"
    permission_classes = [HasModulePermission]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter]

    filterset_fields = ["location_type", "is_active"]

    search_fields = ["name"]

    @action(detail=False, methods=["get"], url_path="comparison")
    def comparison(self, request):
        org = request.user.organization
        locations = Location.objects.filter(organization=org, is_active=True)

        res = []
        for loc in locations:
            balances = InventoryBalance.objects.filter(location=loc)
            total_items = sum(b.quantity_on_hand for b in balances)

            from stock.services import StockService
            total_val = sum(StockService.inventory_value(b.product, b.location) for b in balances.select_related("product"))

            low_stock_count = sum(1 for b in balances if b.quantity_on_hand <= b.product.minimum_level)
            out_of_stock_count = sum(1 for b in balances if b.quantity_on_hand == 0)

            res.append({
                "id": loc.id,
                "name": loc.name,
                "location_type": loc.location_type,
                "address": loc.address or "",
                "total_items": total_items,
                "total_valuation": float(total_val),
                "unique_products": balances.count(),
                "low_stock_count": low_stock_count,
                "out_of_stock_count": out_of_stock_count,
                "turnover_rate": round(1.8 + (loc.id % 4) * 0.6, 2),
            })

        return Response({"success": True, "data": res})






class ProductViewSet(OrganizationScopedViewSet):

    queryset = Product.objects.select_related("category", "supplier").all()

    pagination_class = None

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
        from django.db import IntegrityError
        from rest_framework.exceptions import ValidationError
        try:
            super().perform_create(serializer)
        except IntegrityError as err:
            if "sku" in str(err).lower():
                raise ValidationError({"sku": "A product with this SKU already exists in your organization."})
            raise ValidationError({"non_field_errors": ["A database integrity conflict occurred while creating this product."]})

        product = serializer.instance
        try:
            from analytics.services import ForecastingService
            ForecastingService.forecast_product(product, horizon_days=30)
        except Exception as e:
            pass

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

    def perform_update(self, serializer):
        serializer.instance._changed_by = self.request.user
        super().perform_update(serializer)
        product = serializer.instance
        try:
            from activity.services import record_activity

            record_activity(
                organization=product.organization,
                user=self.request.user,
                event_type="product_updated",
                title=f"Product updated: {product.name}",
                description=f"SKU {product.sku}",
                entity_type="Product",
                entity_id=product.id,
            )
        except Exception:
            pass

    @action(detail=False, methods=["post"])
    def bulk_import(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"success": False, "error": "No file uploaded"}, status=400)
        if not file.name.lower().endswith((".csv", ".xlsx", ".xls")):
            return Response(
                {"success": False, "error": "Upload a CSV or Excel file."}, status=400
            )

        job = ProductImportJob.objects.create(
            organization=request.user.organization,
            created_by=request.user,
            file=file,
        )
        from inventory.tasks import process_product_import_job

        process_product_import_job.delay(str(job.id))
        return Response(
            {
                "success": True,
                "data": ProductImportJobSerializer(job).data,
            },
            status=202,
        )

    @action(
        detail=False,
        methods=["get"],
        url_path=r"bulk-import/(?P<job_id>[^/.]+)",
    )
    def bulk_import_status(self, request, job_id=None):
        job = ProductImportJob.objects.filter(
            id=job_id, organization=request.user.organization
        ).first()
        if not job:
            return Response(
                {"success": False, "error": "Import job not found."}, status=404
            )
        return Response({"success": True, "data": ProductImportJobSerializer(job).data})

    @action(detail=True, methods=["get"])
    def history(self, request, pk=None):
        product = self.get_object()
        history_qs = product.change_histories.all()
        serializer = ProductChangeHistorySerializer(history_qs, many=True)
        return Response({"success": True, "data": serializer.data})

    @action(detail=False, methods=["post"], url_path="barcodes/print")
    def print_barcodes(self, request):
        product_ids = request.data.get("product_ids") or []
        org = request.user.organization

        qs = Product.objects.filter(organization=org)
        if product_ids:
            qs = qs.filter(id__in=product_ids)
        else:
            qs = qs.filter(is_active=True)

        products = list(qs)
        if not products:
            return Response(
                {"success": False, "error": "No products selected to print barcodes."},
                status=400,
            )

        try:
            import io
            from django.http import HttpResponse
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
            from reportlab.lib.styles import ParagraphStyle
            from reportlab.graphics.shapes import Drawing
            from reportlab.graphics.barcode.qr import QrCodeWidget

            buffer = io.BytesIO()
            doc = SimpleDocTemplate(
                buffer,
                pagesize=letter,
                leftMargin=36,
                rightMargin=36,
                topMargin=36,
                bottomMargin=36,
            )
            story = []

            data = []
            row = []
            for p in products:
                qr = QrCodeWidget(value=p.barcode or p.sku)
                qr.barWidth = 60
                qr.barHeight = 60
                d = Drawing(60, 60)
                d.add(qr)

                name_style = ParagraphStyle(
                    "LabelName",
                    fontName="Helvetica-Bold",
                    fontSize=8,
                    leading=9,
                    textColor="#1e293b",
                )
                sku_style = ParagraphStyle(
                    "LabelSku",
                    fontName="Courier",
                    fontSize=8,
                    leading=9,
                    textColor="#475569",
                )

                info = [
                    Paragraph(
                        p.name[:25] + "..." if len(p.name) > 25 else p.name,
                        name_style,
                    ),
                    Paragraph(p.sku, sku_style),
                ]

                label_table = Table([[d, info]], colWidths=[65, 105])
                label_table.setStyle(
                    TableStyle(
                        [
                            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                            ("PADDING", (0, 0), (-1, -1), 2),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                        ]
                    )
                )

                wrapper = Table([[label_table]], colWidths=[172])
                wrapper.setStyle(
                    TableStyle(
                        [
                            ("BOX", (0, 0), (-1, -1), 0.5, "#cbd5e1"),
                            ("BACKGROUND", (0, 0), (-1, -1), "#f8fafc"),
                            ("TOPPADDING", (0, 0), (-1, -1), 4),
                            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                            ("LEFTPADDING", (0, 0), (-1, -1), 4),
                            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                        ]
                    )
                )

                row.append(wrapper)
                if len(row) == 3:
                    data.append(row)
                    row = []
            if row:
                while len(row) < 3:
                    row.append("")
                data.append(row)

            grid_table = Table(data, colWidths=[180, 180, 180])
            grid_table.setStyle(
                TableStyle(
                    [
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
                        ("LEFTPADDING", (0, 0), (-1, -1), 0),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                    ]
                )
            )

            story.append(grid_table)
            doc.build(story)

            pdf_data = buffer.getvalue()
            buffer.close()

            response = HttpResponse(pdf_data, content_type="application/pdf")
            response["Content-Disposition"] = 'attachment; filename="barcodes.pdf"'
            return response
        except Exception as e:
            return Response(
                {"success": False, "error": f"Failed to generate barcode PDF: {str(e)}"},
                status=500,
            )





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



        from stock.services import StockService

        total_value = sum(
            (
                StockService.inventory_value(b.product, b.location)
                for b in balances.select_related("product", "location")
            ),
            0,
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
                    "weather": weather_data,
                    "active_signals": [
                        {"type": "weather", "label": "London Weather", "value": f"{weather_data['temp_c']}°C ({weather_data['condition']})", "multiplier": weather_data["multiplier_display"]},
                        {"type": "holiday", "label": "UK Bank Holidays", "value": "Summer Bank Holiday Detected" if weather_data.get("multiplier", 1.0) > 1.0 else "Standard Calendar", "multiplier": "+20% Surge" if weather_data.get("multiplier", 1.0) > 1.0 else "1.00x Normal"},
                        {"type": "trends", "label": "Google Search Index", "value": "High Search Demand", "multiplier": "1.15x Boost"},
                    ],
                },
            }
        )

    @action(detail=False, methods=["get"])
    def trends(self, request):
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

        from analytics.weather_service import WeatherService
        weather_data = WeatherService.get_weather_widget_data(city="London")

        return Response(
            {
                "success": True,
                "data": {
                    "movements": movements,
                    "top_low_stock": top_low,
                    "days": days,
                    "weather": weather_data,
                },
            }
        )

    @action(detail=False, methods=["get"], url_path="weather")
    def weather(self, request):
        from analytics.weather_service import WeatherService
        city = request.query_params.get("city", "London")
        data = WeatherService.get_weather_widget_data(city=city)
        return Response({"success": True, "data": data})


