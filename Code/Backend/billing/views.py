from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from billing.models import Customer, Invoice
from billing.serializers import (
    CustomerSerializer,
    InvoiceCreateSerializer,
    InvoiceSerializer,
    MarkPaidSerializer,
)
from billing.services import InvoiceService
from core.mixins import OrganizationScopedViewSet
from core.permissions import HasModulePermission


class CustomerViewSet(OrganizationScopedViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    module_permission = "customers"
    permission_classes = [HasModulePermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status"]
    search_fields = ["name", "email", "company", "phone"]
    ordering_fields = ["name", "created_at"]


class InvoiceViewSet(viewsets.ModelViewSet):
    module_permission = "invoices"
    action_permission_map = {
        "list": "view",
        "retrieve": "view",
        "create": "create",
        "partial_update": "edit",
        "destroy": "delete",
        "issue": "approve",
        "mark_paid": "approve",
        "cancel": "approve",
    }
    permission_classes = [HasModulePermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "customer"]
    search_fields = ["invoice_number", "customer__name", "notes"]
    ordering_fields = ["created_at", "due_date", "total_amount", "invoice_number"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return (
            Invoice.objects.filter(organization=self.request.user.organization)
            .select_related("customer", "created_by")
            .prefetch_related("lines__product", "payments")
        )

    def list(self, request, *args, **kwargs):
        # Mark overdue unpaid invoices before listing
        for inv in self.get_queryset().filter(status=Invoice.Status.UNPAID):
            inv.refresh_overdue_status()
        return super().list(request, *args, **kwargs)

    def get_serializer_class(self):
        if self.action == "create":
            return InvoiceCreateSerializer
        return InvoiceSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()
        return Response(
            {"success": True, "data": InvoiceSerializer(invoice).data},
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        invoice = self.get_object()
        if invoice.status != Invoice.Status.DRAFT:
            return Response(
                {"success": False, "error": "Only draft invoices can be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        invoice = self.get_object()
        if invoice.status != Invoice.Status.DRAFT:
            return Response(
                {"success": False, "error": "Only draft invoices can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if "notes" in request.data:
            invoice.notes = request.data["notes"] or ""
        if "due_date" in request.data:
            invoice.due_date = request.data["due_date"] or None
        if "issue_date" in request.data and request.data["issue_date"]:
            invoice.issue_date = request.data["issue_date"]
        if "tax_rate" in request.data:
            invoice.tax_rate = request.data["tax_rate"] or 0
        invoice.save()
        if "tax_rate" in request.data:
            invoice.recalculate_totals()
        return Response({"success": True, "data": InvoiceSerializer(invoice).data})

    def _run(self, request, fn, **extra):
        invoice = self.get_object()
        try:
            result = fn(invoice=invoice, **extra)
        except ValueError as exc:
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "success": True,
                "data": InvoiceSerializer(
                    self.get_queryset().get(pk=result.pk)
                ).data,
            }
        )

    @action(detail=True, methods=["post"])
    def issue(self, request, pk=None):
        return self._run(request, InvoiceService.issue)

    @action(detail=True, methods=["post"])
    def mark_paid(self, request, pk=None):
        serializer = MarkPaidSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        return self._run(
            request,
            InvoiceService.mark_paid,
            user=request.user,
            amount=serializer.validated_data.get("amount"),
            method=serializer.validated_data.get("method") or "other",
            notes=serializer.validated_data.get("notes") or "",
        )

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._run(request, InvoiceService.cancel)
