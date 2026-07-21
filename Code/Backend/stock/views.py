from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import HasModulePermission
from stock.models import (
    StockAdjustment,
    StockInTransaction,
    StockOutTransaction,
    StockTake,
    StockTransfer,
)
from stock.serializers import (
    StockAdjustmentSerializer,
    StockInSerializer,
    StockOutSerializer,
    StockTakeCountSerializer,
    StockTakeCreateSerializer,
    StockTakeSerializer,
    StockTransferSerializer,
)
from stock.services import InsufficientStockError, StockService, StockTakeService


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
        ).select_related("product", "supplier", "location", "created_by")


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
        ).select_related("product", "location", "created_by")


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
                {"success": False, "error": "Scanning product (SKU, barcode, or ID) is required to ship."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        p = transfer.product
        if str(scanned_id).strip() not in [str(p.id), p.sku, p.barcode]:
            return Response(
                {"success": False, "error": "Scanned code does not match this transfer's product."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return self._transition(request, StockService.ship_transfer)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        transfer = self.get_object()
        scanned_id = request.data.get("product_id")
        if not scanned_id:
            return Response(
                {"success": False, "error": "Scanning product (SKU, barcode, or ID) is required to complete receipt."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        p = transfer.product
        if str(scanned_id).strip() not in [str(p.id), p.sku, p.barcode]:
            return Response(
                {"success": False, "error": "Scanned code does not match this transfer's product."},
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
            result = fn(stock_take=stock_take, **extra)
        except ValueError as exc:
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "success": True,
                "data": StockTakeSerializer(
                    self.get_queryset().get(pk=result.pk)
                ).data,
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
            request=request,
            apply_adjustments=bool(apply_adjustments),
        )

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._run(request, StockTakeService.cancel)
