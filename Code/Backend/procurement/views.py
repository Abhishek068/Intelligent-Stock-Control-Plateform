from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import HasModulePermission
from inventory.models import Location
from procurement.models import PurchaseOrder
from procurement.serializers import (
    PurchaseOrderCreateSerializer,
    PurchaseOrderSerializer,
    ReceiveLinesSerializer,
)
from procurement.services import PurchaseOrderService


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    module_permission = "purchase_orders"
    action_permission_map = {
        "list": "view",
        "retrieve": "view",
        "create": "create",
        "update": "edit",
        "partial_update": "edit",
        "destroy": "delete",
        "submit": "approve",
        "receive": "approve",
        "cancel": "approve",
        "from_reorder": "create",
    }
    permission_classes = [HasModulePermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "supplier"]
    search_fields = ["po_number", "supplier__name", "notes"]
    ordering_fields = ["created_at", "expected_delivery", "total_amount", "po_number"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return (
            PurchaseOrder.objects.filter(organization=self.request.user.organization)
            .select_related("supplier", "location", "created_by")
            .prefetch_related("lines__product")
        )

    def get_serializer_class(self):
        if self.action == "create":
            return PurchaseOrderCreateSerializer
        return PurchaseOrderSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        po = serializer.save()
        return Response(
            {"success": True, "data": PurchaseOrderSerializer(po).data},
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        po = self.get_object()
        if po.status != PurchaseOrder.Status.DRAFT:
            return Response(
                {"success": False, "error": "Only draft POs can be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        po = self.get_object()
        if po.status != PurchaseOrder.Status.DRAFT:
            return Response(
                {"success": False, "error": "Only draft POs can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if "location" in request.data:
            loc_id = request.data["location"]
            if loc_id:
                loc = Location.objects.filter(
                    id=loc_id, organization=request.user.organization
                ).first()
                if not loc:
                    return Response(
                        {"success": False, "error": "Location not found."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                po.location = loc
            else:
                po.location = None
        if "notes" in request.data:
            po.notes = request.data["notes"] or ""
        if "expected_delivery" in request.data:
            po.expected_delivery = request.data["expected_delivery"] or None
        po.save()
        return Response({"success": True, "data": PurchaseOrderSerializer(po).data})

    def _transition(self, request, fn, **extra):
        po = self.get_object()
        try:
            result = fn(purchase_order=po, **extra)
        except ValueError as exc:
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"success": True, "data": PurchaseOrderSerializer(result).data})

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        return self._transition(request, PurchaseOrderService.submit, user=request.user)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._transition(request, PurchaseOrderService.cancel)

    @action(detail=True, methods=["post"])
    def receive(self, request, pk=None):
        serializer = ReceiveLinesSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        location = None
        loc_id = serializer.validated_data.get("location")
        if loc_id:
            location = Location.objects.filter(
                id=loc_id, organization=request.user.organization
            ).first()
            if not location:
                return Response(
                    {"success": False, "error": "Location not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        line_receipts = serializer.validated_data.get("lines") or None
        if line_receipts:
            normalized = []
            for item in line_receipts:
                line_id = item.get("line_id") or item.get("id")
                qty = item.get("quantity") or item.get("qty")
                if line_id and qty:
                    normalized.append({"line_id": int(line_id), "quantity": int(qty)})
            line_receipts = normalized or None
        return self._transition(
            request,
            PurchaseOrderService.receive,
            user=request.user,
            location=location,
            line_receipts=line_receipts,
            request=request,
        )

    @action(detail=False, methods=["post"])
    def from_reorder(self, request):
        """Create a draft PO from reorder recommendation product IDs."""
        from analytics.models import ReorderRecommendation
        from inventory.models import Product

        product_ids = request.data.get("product_ids") or []
        supplier_id = request.data.get("supplier")
        location_id = request.data.get("location")
        org = request.user.organization

        if not product_ids and not supplier_id:
            return Response(
                {"success": False, "error": "product_ids or supplier required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        recs = ReorderRecommendation.objects.filter(
            product__organization=org,
            is_active=True,
            product_id__in=product_ids,
        ).select_related("product", "product__supplier")

        if not recs and product_ids:
            products = Product.objects.filter(organization=org, id__in=product_ids)
            lines_by_supplier = {}
            for p in products:
                lines_by_supplier.setdefault(p.supplier_id, []).append(
                    {
                        "product": p,
                        "quantity_ordered": max(p.reorder_level, 1),
                        "unit_cost": p.unit_price,
                    }
                )
        else:
            lines_by_supplier = {}
            for rec in recs:
                sid = rec.product.supplier_id
                lines_by_supplier.setdefault(sid, []).append(
                    {
                        "product": rec.product,
                        "quantity_ordered": max(rec.suggested_quantity, 1),
                        "unit_cost": rec.product.unit_price,
                    }
                )

        if supplier_id:
            lines_by_supplier = {
                int(supplier_id): lines_by_supplier.get(int(supplier_id), [])
            }

        location = None
        if location_id:
            location = Location.objects.filter(
                id=location_id, organization=org
            ).first()

        created = []
        for sid, lines in lines_by_supplier.items():
            if not lines:
                continue
            from suppliers.models import Supplier

            supplier = Supplier.objects.filter(id=sid, organization=org).first()
            if not supplier:
                continue
            po = PurchaseOrderService.create_order(
                organization=org,
                supplier=supplier,
                location=location,
                user=request.user,
                lines=lines,
                notes="Created from reorder recommendations",
            )
            created.append(po)

        return Response(
            {
                "success": True,
                "data": PurchaseOrderSerializer(created, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )
