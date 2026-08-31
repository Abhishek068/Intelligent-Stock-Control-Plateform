from datetime import timedelta
from decimal import Decimal

from django.db import models, transaction
from django.db.models import F, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import HasModulePermission
from inventory.models import Location, Product
from suppliers.models import Supplier
from stock.models import (
    Batch,
    StockAdjustment,
    StockInTransaction,
    StockOutTransaction,
    StockTake,
    StockTransfer,
    SupplierReturn,
)
from stock.serializers import (
    BatchSerializer,
    StockAdjustmentSerializer,
    StockInSerializer,
    StockOutSerializer,
    StockTakeCountSerializer,
    StockTakeCreateSerializer,
    StockTakeSerializer,
    StockTransferSerializer,
    SupplierReturnSerializer,
)
from stock.services import InsufficientStockError, StockService, StockTakeService, SupplierReturnService


class StockInViewSet(viewsets.ModelViewSet):
    serializer_class = StockInSerializer
    module_permission = "stock_in"
    permission_classes = [HasModulePermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["product", "supplier", "location"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return StockInTransaction.objects.filter(
            product__organization=self.request.user.organization
        ).select_related("product", "supplier", "location", "created_by", "batch")

    @action(detail=False, methods=["post"], url_path="bulk-receive")
    @transaction.atomic
    def bulk_receive(self, request):
        items = request.data.get("items", [])
        if not items or not isinstance(items, list):
            return Response(
                {"success": False, "error": "No items provided in bulk receive payload."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        default_supplier_id = request.data.get("supplier")
        default_location_id = request.data.get("location")
        default_reference = request.data.get("reference", "")
        default_notes = request.data.get("notes", "")

        created_txns = []
        total_quantity = 0
        total_value = Decimal("0")

        for idx, item in enumerate(items):
            product_id = item.get("product")
            if not product_id:
                return Response(
                    {"success": False, "error": f"Item #{idx + 1} is missing product ID."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                product = Product.objects.get(
                    id=product_id, organization=request.user.organization
                )
            except Product.DoesNotExist:
                return Response(
                    {"success": False, "error": f"Product #{product_id} not found in your organization."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            supplier_id = item.get("supplier") or default_supplier_id
            supplier = None
            if supplier_id:
                supplier = Supplier.objects.filter(
                    id=supplier_id, organization=request.user.organization
                ).first()
            if not supplier:
                supplier = product.supplier

            location_id = item.get("location") or default_location_id
            location = None
            if location_id:
                location = Location.objects.filter(
                    id=location_id, organization=request.user.organization
                ).first()
            if not location:
                location, _ = Location.objects.get_or_create(
                    organization=request.user.organization,
                    name="Central Warehouse",
                    defaults={"location_type": Location.LocationType.WAREHOUSE, "is_active": True},
                )

            try:
                qty = int(item.get("quantity", 1))
            except (ValueError, TypeError):
                qty = 1
            if qty <= 0:
                return Response(
                    {"success": False, "error": f"Quantity must be positive for {product.name}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            unit_cost_val = item.get("unit_cost")
            if unit_cost_val is not None:
                try:
                    unit_cost = Decimal(str(unit_cost_val))
                except Exception:
                    unit_cost = Decimal(product.unit_price or 0)
            else:
                unit_cost = Decimal(product.unit_price or 0)

            batch_number = item.get("batch_number") or ""
            expiry_date = item.get("expiry_date") or None
            reference = item.get("reference") or default_reference
            notes = item.get("notes") or default_notes

            txn, _ = StockService.stock_in(
                product=product,
                supplier=supplier,
                location=location,
                quantity=qty,
                unit_cost=unit_cost,
                batch_number=batch_number,
                expiry_date=expiry_date,
                reference=reference,
                notes=notes,
                user=request.user,
                request=request,
            )
            created_txns.append(StockInSerializer(txn).data)
            total_quantity += qty
            total_value += unit_cost * qty

        return Response(
            {
                "success": True,
                "message": f"Successfully received {len(created_txns)} items ({total_quantity} total units).",
                "total_items": len(created_txns),
                "total_quantity": total_quantity,
                "total_value": float(total_value),
                "transactions": created_txns,
            },
            status=status.HTTP_201_CREATED,
        )


class StockOutViewSet(viewsets.ModelViewSet):
    serializer_class = StockOutSerializer
    module_permission = "stock_out"
    permission_classes = [HasModulePermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["product", "location"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return StockOutTransaction.objects.filter(
            product__organization=self.request.user.organization
        ).select_related("product", "location", "created_by", "batch")

    @action(detail=False, methods=["post"], url_path="bulk-dispatch")
    @transaction.atomic
    def bulk_dispatch(self, request):
        items = request.data.get("items", [])
        if not items or not isinstance(items, list):
            return Response(
                {"success": False, "error": "No items provided in bulk dispatch payload."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        default_location_id = request.data.get("location")
        default_reason = request.data.get("reason", "sale")
        default_reference = request.data.get("reference", "")
        default_notes = request.data.get("notes", "")

        created_txns = []
        total_quantity = 0
        total_value = Decimal("0")

        for idx, item in enumerate(items):
            product_id = item.get("product")
            if not product_id:
                return Response(
                    {"success": False, "error": f"Item #{idx + 1} is missing product ID."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                product = Product.objects.get(
                    id=product_id, organization=request.user.organization
                )
            except Product.DoesNotExist:
                return Response(
                    {"success": False, "error": f"Product #{product_id} not found in your organization."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            location_id = item.get("location") or default_location_id
            location = None
            if location_id:
                location = Location.objects.filter(
                    id=location_id, organization=request.user.organization
                ).first()
            if not location:
                location, _ = Location.objects.get_or_create(
                    organization=request.user.organization,
                    name="Central Warehouse",
                    defaults={"location_type": Location.LocationType.WAREHOUSE, "is_active": True},
                )

            try:
                qty = int(item.get("quantity", 1))
            except (ValueError, TypeError):
                qty = 1
            if qty <= 0:
                return Response(
                    {"success": False, "error": f"Quantity must be positive for {product.name}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            unit_price_val = item.get("unit_price")
            if unit_price_val is not None:
                try:
                    unit_price = Decimal(str(unit_price_val))
                except Exception:
                    unit_price = Decimal(product.unit_price or 0)
            else:
                unit_price = Decimal(product.unit_price or 0)

            batch_id = item.get("batch_id")
            reason = item.get("reason") or default_reason
            reference = item.get("reference") or default_reference
            notes = item.get("notes") or default_notes

            try:
                txn, _ = StockService.stock_out(
                    product=product,
                    location=location,
                    quantity=qty,
                    reason=reason,
                    unit_price=unit_price,
                    batch_id=batch_id,
                    reference=reference,
                    notes=notes,
                    user=request.user,
                    request=request,
                )
            except (ValueError, InsufficientStockError) as exc:
                return Response(
                    {"success": False, "error": f"Error dispatching {product.name}: {str(exc)}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            created_txns.append(StockOutSerializer(txn).data)
            total_quantity += qty
            total_value += unit_price * qty

        return Response(
            {
                "success": True,
                "message": f"Successfully dispatched {len(created_txns)} items ({total_quantity} total units).",
                "total_items": len(created_txns),
                "total_quantity": total_quantity,
                "total_value": float(total_value),
                "transactions": created_txns,
            },
            status=status.HTTP_201_CREATED,
        )


class StockAdjustmentViewSet(viewsets.ModelViewSet):
    serializer_class = StockAdjustmentSerializer
    module_permission = "adjustments"
    permission_classes = [HasModulePermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["product", "location"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return StockAdjustment.objects.filter(
            product__organization=self.request.user.organization
        ).select_related("product", "location", "created_by")


class StockTransferViewSet(viewsets.ModelViewSet):
    serializer_class = StockTransferSerializer
    module_permission = "transfers"
    action_permission_map = {
        "list": "view",
        "retrieve": "view",
        "create": "create",
        "ship": "approve",
        "complete": "approve",
        "cancel": "approve",
        "pdf": "view",
    }
    permission_classes = [HasModulePermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["product", "status"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return StockTransfer.objects.filter(
            product__organization=self.request.user.organization
        ).select_related(
            "product", "source_location", "destination_location", "created_by"
        )

    def _transition(self, request, fn):
        transfer = self.get_object()
        try:
            result = fn(transfer=transfer, user=request.user, request=request)
        except (ValueError, InsufficientStockError) as exc:
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"success": True, "data": StockTransferSerializer(result).data})

    @action(detail=True, methods=["post"])
    def ship(self, request, pk=None):
        transfer = self.get_object()
        scanned_id = request.data.get("product_id")
        if not scanned_id:
            return Response(
                {
                    "success": False,
                    "error": "Scanning product (SKU, barcode, or ID) is required to ship.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        p = transfer.product
        if str(scanned_id).strip() not in [str(p.id), p.sku, p.barcode]:
            return Response(
                {
                    "success": False,
                    "error": "Scanned code does not match this transfer's product.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return self._transition(request, StockService.ship_transfer)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        transfer = self.get_object()
        scanned_id = request.data.get("product_id")
        if not scanned_id:
            return Response(
                {
                    "success": False,
                    "error": "Scanning product (SKU, barcode, or ID) is required to complete receipt.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        p = transfer.product
        if str(scanned_id).strip() not in [str(p.id), p.sku, p.barcode]:
            return Response(
                {
                    "success": False,
                    "error": "Scanned code does not match this transfer's product.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return self._transition(request, StockService.complete_transfer)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._transition(request, StockService.cancel_transfer)

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        transfer = self.get_object()
        
        import io
        from django.http import FileResponse
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        
        styles = getSampleStyleSheet()
        normal = styles["Normal"]
        
        story = []
        
        header_data = [
            [
                Paragraph("<b><font size=20 color='#0d9488'>StockSense</font></b><br/><font size=9 color='#334155'>Inventory Intelligence Systems</font>", normal),
                Paragraph(f"<b><font size=20 color='#0f172a'>STOCK TRANSFER SLIP</font></b><br/><font size=10 color='#334155'>Waybill #: TR-{transfer.id:05d}</font>", normal)
            ]
        ]
        header_table = Table(header_data, colWidths=[270, 270])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 20))
        
        source_name = transfer.source_location.name if transfer.source_location else "Main Warehouse"
        source_addr = getattr(transfer.source_location, "address", "") or "Main Warehouse Facility"
        dest_name = transfer.destination_location.name if transfer.destination_location else "Destination Branch"
        dest_addr = getattr(transfer.destination_location, "address", "") or "Branch Location Facility"
        created_by_name = transfer.created_by.get_full_name() or transfer.created_by.username if transfer.created_by else "System Operator"
        
        metadata_data = [
            [
                Paragraph(f"<b>FROM (SOURCE WAREHOUSE):</b><br/><b>{source_name}</b><br/>{source_addr}", normal),
                Paragraph(f"<b>TO (DESTINATION BRANCH):</b><br/><b>{dest_name}</b><br/>{dest_addr}", normal)
            ],
            [
                Paragraph(f"<b>Date Created:</b> {transfer.created_at.strftime('%Y-%m-%d %H:%M')}<br/><b>Dispatched By:</b> {created_by_name}", normal),
                Paragraph(f"<b>Transfer Status:</b> {transfer.status.upper()}<br/><b>Notes:</b> {transfer.notes or 'Standard Internal Transfer'}", normal)
            ]
        ]
        metadata_table = Table(metadata_data, colWidths=[270, 270])
        metadata_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(metadata_table)
        story.append(Spacer(1, 20))
        
        table_data = [
            [
                Paragraph("<b>Product Name</b>", normal),
                Paragraph("<b>SKU Code</b>", normal),
                Paragraph("<b>Category</b>", normal),
                Paragraph("<b>Quantity Transferred</b>", normal)
            ],
            [
                Paragraph(f"<b>{transfer.product.name}</b>", normal),
                Paragraph(transfer.product.sku, normal),
                Paragraph(transfer.product.category.name if transfer.product.category else "-", normal),
                Paragraph(f"<b>{transfer.quantity} units</b>", normal)
            ]
        ]
        
        items_table = Table(table_data, colWidths=[200, 110, 110, 120])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('TOPPADDING', (0, 0), (-1, 0), 8),
            ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor("#cbd5e1")),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 10),
            ('TOPPADDING', (0, 1), (-1, -1), 10),
            ('LINEBELOW', (0, 1), (-1, -1), 1, colors.HexColor("#e2e8f0")),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(items_table)
        story.append(Spacer(1, 40))
        
        sig_data = [
            [
                Paragraph("<b>Dispatched By (Warehouse Supervisor):</b><br/><br/><br/>_____________________________________<br/>Signature & Date", normal),
                Paragraph("<b>Received & Checked By (Branch Manager):</b><br/><br/><br/>_____________________________________<br/>Signature & Date", normal)
            ]
        ]
        sig_table = Table(sig_data, colWidths=[270, 270])
        sig_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(sig_table)
        
        doc.build(story)
        buffer.seek(0)
        return FileResponse(buffer, as_attachment=True, filename=f"Transfer-TR-{transfer.id:05d}.pdf")


class StockTakeViewSet(viewsets.ModelViewSet):
    module_permission = "stock_take"
    action_permission_map = {
        "list": "view",
        "retrieve": "view",
        "create": "create",
        "destroy": "delete",
        "start": "edit",
        "record_counts": "edit",
        "complete": "approve",
        "cancel": "approve",
    }
    permission_classes = [HasModulePermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status", "location", "assigned_to"]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return (
            StockTake.objects.filter(organization=self.request.user.organization)
            .select_related("location", "assigned_to", "created_by")
            .prefetch_related("lines__product")
        )

    def get_serializer_class(self):
        if self.action == "create":
            return StockTakeCreateSerializer
        return StockTakeSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        stock_take = serializer.save()
        return Response(
            {"success": True, "data": StockTakeSerializer(stock_take).data},
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        stock_take = self.get_object()
        if stock_take.status != StockTake.Status.SCHEDULED:
            return Response(
                {"success": False, "error": "Only scheduled stock-takes can be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    def _run(self, request, fn, **extra):
        stock_take = self.get_object()
        try:
            import inspect

            if "request" in inspect.signature(fn).parameters and "request" not in extra:
                extra["request"] = request
            result = fn(stock_take=stock_take, **extra)
        except ValueError as exc:
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "success": True,
                "data": StockTakeSerializer(self.get_queryset().get(pk=result.pk)).data,
            }
        )

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        return self._run(request, StockTakeService.start)

    @action(detail=True, methods=["post"])
    def record_counts(self, request, pk=None):
        serializer = StockTakeCountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._run(
            request,
            StockTakeService.record_counts,
            counts=serializer.validated_data["counts"],
        )

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        apply_adjustments = request.data.get("apply_adjustments", True)
        if isinstance(apply_adjustments, str):
            apply_adjustments = apply_adjustments.lower() not in ("false", "0", "no")
        return self._run(
            request,
            StockTakeService.complete,
            user=request.user,
            apply_adjustments=bool(apply_adjustments),
        )

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._run(request, StockTakeService.cancel)


class BatchViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BatchSerializer
    module_permission = "stock_in"
    permission_classes = [HasModulePermission]
    pagination_class = None
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["product", "location", "supplier"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs = (
            Batch.objects.filter(product__organization=self.request.user.organization)
            .select_related("product", "supplier", "location")
            .order_by(F("expiry_date").asc(nulls_last=True), "created_at")
        )
        active_only = self.request.query_params.get("active_only", "true").lower()
        if active_only not in ("false", "0", "no"):
            qs = qs.filter(quantity_on_hand__gt=0)
        
        status_param = self.request.query_params.get("status")
        if status_param:
            today = timezone.now().date()
            if status_param == "expired":
                qs = qs.filter(expiry_date__isnull=False, expiry_date__lt=today)
            elif status_param == "critical":
                qs = qs.filter(expiry_date__isnull=False, expiry_date__gte=today, expiry_date__lte=today + timedelta(days=7))
            elif status_param == "warning":
                qs = qs.filter(expiry_date__isnull=False, expiry_date__gt=today + timedelta(days=7), expiry_date__lte=today + timedelta(days=15))
            elif status_param == "attention":
                qs = qs.filter(expiry_date__isnull=False, expiry_date__gt=today + timedelta(days=15), expiry_date__lte=today + timedelta(days=30))
            elif status_param == "healthy":
                qs = qs.filter(Q(expiry_date__isnull=True) | Q(expiry_date__gt=today + timedelta(days=30)))

        expiring_within = self.request.query_params.get("expiring_within")
        if expiring_within is not None:
            try:
                days = int(expiring_within)
            except ValueError:
                days = 30
            today = timezone.now().date()
            qs = qs.filter(
                expiry_date__isnull=False,
                expiry_date__lte=today + timedelta(days=days),
            )
        return qs

    @action(detail=False, methods=["post"])
    def trigger_expiry_scan(self, request):
        from stock.tasks import evaluate_batch_expiry

        result = evaluate_batch_expiry()
        return Response({
            "success": True,
            "message": f"Batch expiry scan completed successfully. {result.get('alerts', 0)} alert(s) dispatched.",
            "data": result,
        })

    @action(detail=False, methods=["get"])
    def expiry_summary(self, request):
        from django.db.models import Q
        from decimal import Decimal

        today = timezone.now().date()
        qs = Batch.objects.filter(
            product__organization=request.user.organization,
            quantity_on_hand__gt=0,
        )
        total_batches = qs.count()
        expired_count = qs.filter(expiry_date__isnull=False, expiry_date__lt=today).count()
        critical_count = qs.filter(
            expiry_date__isnull=False,
            expiry_date__gte=today,
            expiry_date__lte=today + timedelta(days=7),
        ).count()
        warning_count = qs.filter(
            expiry_date__isnull=False,
            expiry_date__gt=today + timedelta(days=7),
            expiry_date__lte=today + timedelta(days=15),
        ).count()
        attention_count = qs.filter(
            expiry_date__isnull=False,
            expiry_date__gt=today + timedelta(days=15),
            expiry_date__lte=today + timedelta(days=30),
        ).count()
        healthy_count = qs.filter(
            Q(expiry_date__isnull=True) | Q(expiry_date__gt=today + timedelta(days=30))
        ).count()

        total_value = sum(
            (Decimal(b.unit_cost or 0) * b.quantity_on_hand for b in qs),
            Decimal("0"),
        )
        expiring_value = sum(
            (
                Decimal(b.unit_cost or 0) * b.quantity_on_hand
                for b in qs.filter(expiry_date__isnull=False, expiry_date__lte=today + timedelta(days=30))
            ),
            Decimal("0"),
        )

        return Response({
            "success": True,
            "data": {
                "total_batches": total_batches,
                "expired_count": expired_count,
                "critical_count": critical_count,
                "warning_count": warning_count,
                "attention_count": attention_count,
                "healthy_count": healthy_count,
                "total_value": float(total_value),
                "expiring_value": float(expiring_value),
            },
        })


class SupplierReturnViewSet(viewsets.ModelViewSet):
    serializer_class = SupplierReturnSerializer
    module_permission = "stock_out"
    action_permission_map = {
        "list": "view",
        "retrieve": "view",
        "create": "create",
        "ship": "approve",
        "complete": "approve",
        "cancel": "approve",
    }
    permission_classes = [HasModulePermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["supplier", "location", "status"]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        return (
            SupplierReturn.objects.filter(
                supplier__organization=self.request.user.organization
            )
            .select_related("supplier", "location", "created_by")
            .prefetch_related("lines__product", "lines__batch")
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ret = serializer.save()
        return Response(
            {
                "success": True,
                "data": SupplierReturnSerializer(
                    self.get_queryset().get(pk=ret.pk)
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def _transition(self, request, fn):
        obj = self.get_object()
        try:
            result = fn(supplier_return=obj, user=request.user, request=request)
        except (ValueError, InsufficientStockError) as exc:
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "success": True,
                "data": SupplierReturnSerializer(
                    self.get_queryset().get(pk=result.pk)
                ).data,
            }
        )

    @action(detail=True, methods=["post"])
    def ship(self, request, pk=None):
        return self._transition(request, SupplierReturnService.ship)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        return self._transition(request, SupplierReturnService.complete)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._transition(request, SupplierReturnService.cancel)
