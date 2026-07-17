from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from billing.models import Invoice, InvoiceLine, InvoicePayment


class InvoiceService:
    @staticmethod
    def next_invoice_number(organization):
        year = timezone.now().year
        prefix = f"INV-{year}-"
        last = (
            Invoice.objects.filter(
                organization=organization, invoice_number__startswith=prefix
            )
            .order_by("-invoice_number")
            .first()
        )
        if not last:
            return f"{prefix}001"
        try:
            seq = int(last.invoice_number.split("-")[-1]) + 1
        except ValueError:
            seq = Invoice.objects.filter(organization=organization).count() + 1
        return f"{prefix}{seq:03d}"

    @classmethod
    @transaction.atomic
    def create_invoice(
        cls,
        *,
        organization,
        customer,
        user,
        lines,
        due_date=None,
        issue_date=None,
        notes="",
        tax_rate=Decimal("0.00"),
    ):
        invoice = Invoice.objects.create(
            organization=organization,
            invoice_number=cls.next_invoice_number(organization),
            customer=customer,
            due_date=due_date,
            issue_date=issue_date or timezone.localdate(),
            notes=notes or "",
            tax_rate=tax_rate or Decimal("0.00"),
            created_by=user,
            status=Invoice.Status.DRAFT,
        )
        for line in lines:
            InvoiceLine.objects.create(
                invoice=invoice,
                product=line.get("product"),
                description=line["description"],
                quantity=line["quantity"],
                unit_price=line["unit_price"],
            )
        invoice.recalculate_totals()
        return invoice

    @classmethod
    @transaction.atomic
    def issue(cls, *, invoice):
        if invoice.status != Invoice.Status.DRAFT:
            raise ValueError("Only draft invoices can be issued.")
        if not invoice.lines.exists():
            raise ValueError("Add at least one line before issuing.")
        invoice.status = Invoice.Status.UNPAID
        if not invoice.issue_date:
            invoice.issue_date = timezone.localdate()
        invoice.save(update_fields=["status", "issue_date", "updated_at"])
        invoice.refresh_overdue_status()
        return invoice

    @classmethod
    @transaction.atomic
    def mark_paid(cls, *, invoice, user, amount=None, method="other", notes=""):
        if invoice.status not in (
            Invoice.Status.UNPAID,
            Invoice.Status.OVERDUE,
            Invoice.Status.PAID,
        ):
            raise ValueError("Only issued invoices can be marked paid.")
        pay_amount = amount if amount is not None else invoice.total_amount
        InvoicePayment.objects.create(
            invoice=invoice,
            amount=pay_amount,
            method=method or "other",
            notes=notes or "",
            recorded_by=user,
        )
        invoice.status = Invoice.Status.PAID
        invoice.paid_at = timezone.now()
        invoice.save(update_fields=["status", "paid_at", "updated_at"])
        return invoice

    @classmethod
    @transaction.atomic
    def cancel(cls, *, invoice):
        if invoice.status == Invoice.Status.PAID:
            raise ValueError("Cannot cancel a paid invoice.")
        if invoice.status == Invoice.Status.CANCELLED:
            raise ValueError("Invoice is already cancelled.")
        invoice.status = Invoice.Status.CANCELLED
        invoice.save(update_fields=["status", "updated_at"])
        return invoice
