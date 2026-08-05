from datetime import timedelta

from django.db import models
from django.db.models import F, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import HasModulePermission
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
