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
        "pdf": "view",
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

    @action(detail=True, methods=["get"])
    def pdf(self, request, pk=None):
        try:
            invoice = self.get_object()
            
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
                    Paragraph(f"<b><font size=24 color='#0f172a'>INVOICE</font></b><br/><font size=10 color='#334155'># {invoice.invoice_number}</font>", normal)
                ]
            ]
            header_table = Table(header_data, colWidths=[270, 270])
            header_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ]))
            story.append(header_table)
            story.append(Spacer(1, 20))
            
            cust_email = invoice.customer.email or ""
            cust_phone = invoice.customer.phone or ""
            cust_company = invoice.customer.company or ""
            
            metadata_data = [
                [
                    Paragraph(f"<b>BILL TO:</b><br/>{invoice.customer.name}<br/>{cust_email}<br/>{cust_phone}<br/>{cust_company}", normal),
                    Paragraph(f"<b>Invoice Date:</b> {invoice.issue_date or invoice.created_at.date()}<br/><b>Due Date:</b> {invoice.due_date or 'On Receipt'}<br/><b>Status:</b> {invoice.status.upper()}<br/><b>Total Due:</b> GBP {invoice.total_amount}", normal)
                ]
            ]
            metadata_table = Table(metadata_data, colWidths=[270, 270])
            metadata_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            story.append(metadata_table)
            story.append(Spacer(1, 20))
            
            table_data = [
                [
                    Paragraph("<b>Product</b>", normal),
                    Paragraph("<b>Quantity</b>", normal),
                    Paragraph("<b>Unit Price</b>", normal),
                    Paragraph("<b>Line Total</b>", normal)
                ]
            ]
            
            for line in invoice.lines.all():
                desc = line.description or ""
                if line.product and line.product.sku:
                    desc += f" (SKU: {line.product.sku})"
                table_data.append([
                    Paragraph(desc, normal),
                    Paragraph(str(line.quantity), normal),
                    Paragraph(f"£{line.unit_price}", normal),
                    Paragraph(f"£{line.line_total}", normal)
                ])
                
            table_data.append(["", "", Paragraph("<b>Subtotal:</b>", normal), Paragraph(f"£{invoice.subtotal}", normal)])
            table_data.append(["", "", Paragraph("<b>Tax:</b>", normal), Paragraph(f"£{invoice.tax_amount}", normal)])
            table_data.append(["", "", Paragraph("<b>Grand Total:</b>", normal), Paragraph(f"£{invoice.total_amount}", normal)])
            
            items_table = Table(table_data, colWidths=[260, 80, 100, 100])
            items_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('TOPPADDING', (0, 0), (-1, 0), 8),
                ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor("#cbd5e1")),
                ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
                ('TOPPADDING', (0, 1), (-1, -1), 6),
                ('LINEBELOW', (0, 1), (-1, -4), 0.5, colors.HexColor("#e2e8f0")),
                ('LINEABOVE', (2, -3), (3, -3), 1, colors.HexColor("#cbd5e1")),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            story.append(items_table)
            
            doc.build(story)
            buffer.seek(0)
            return FileResponse(buffer, as_attachment=True, filename=f"Invoice-{invoice.invoice_number}.pdf")
        except Exception as e:
            import traceback
            with open("d:\\ajp124-main\\ajp124-main\\ajp124\\error_log.txt", "w") as f:
                f.write(traceback.format_exc())
            raise e
