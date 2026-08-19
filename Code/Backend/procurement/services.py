from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from procurement.models import PurchaseOrder, PurchaseOrderLine
from stock.services import StockService


class PurchaseOrderService:
    @staticmethod
    def next_po_number(organization):
        year = timezone.now().year
        prefix = f"PO-{year}-"
        last = (
            PurchaseOrder.objects.filter(
                organization=organization, po_number__startswith=prefix
            )
            .order_by("-po_number")
            .first()
        )
        if not last:
            return f"{prefix}001"
        try:
            seq = int(last.po_number.split("-")[-1]) + 1
        except ValueError:
            seq = PurchaseOrder.objects.filter(organization=organization).count() + 1
        return f"{prefix}{seq:03d}"

    @classmethod
    @transaction.atomic
    def create_order(
        cls,
        *,
        organization,
        supplier,
        user,
        lines,
        location=None,
        expected_delivery=None,
        notes="",
    ):
        if not expected_delivery:
            from datetime import timedelta
            lead_days = getattr(supplier, "lead_time_days", 7) or 7
            expected_delivery = (timezone.now() + timedelta(days=lead_days)).date()

        po = PurchaseOrder.objects.create(
            organization=organization,
            po_number=cls.next_po_number(organization),
            supplier=supplier,
            location=location,
            expected_delivery=expected_delivery,
            notes=notes or "",
            created_by=user,
            status=PurchaseOrder.Status.DRAFT,
        )
        for line in lines:
            PurchaseOrderLine.objects.create(
                purchase_order=po,
                product=line["product"],
                quantity_ordered=line["quantity_ordered"],
                unit_cost=line.get("unit_cost") or line["product"].unit_price,
                notes=line.get("notes", ""),
            )
        po.recalculate_total()
        try:
            from suppliers.risk_prediction_service import SupplierRiskPredictionService
            tot_vol = sum(line["quantity_ordered"] for line in lines)
            risk_res = SupplierRiskPredictionService.predict_po_risk(
                supplier=supplier,
                total_volume=tot_vol,
                total_amount=po.total_amount,
                expected_delivery=expected_delivery,
                location=location,
            )
            po.delay_probability = Decimal(str(risk_res["delay_probability"]))
            po.risk_score = Decimal(str(risk_res["risk_score"]))
            po.risk_level = risk_res["risk_level"]
            po.risk_factors = risk_res["risk_factors"]
            po.save(update_fields=["delay_probability", "risk_score", "risk_level", "risk_factors", "updated_at"])
        except Exception as exc:
            pass
        return po

    @classmethod
    @transaction.atomic
    def submit(cls, *, purchase_order, user=None):
        if purchase_order.status != PurchaseOrder.Status.DRAFT:
            raise ValueError("Only draft purchase orders can be submitted.")
        if not purchase_order.lines.exists():
            raise ValueError("Add at least one line before submitting.")
        
        if not purchase_order.expected_delivery:
            from datetime import timedelta
            lead_days = getattr(purchase_order.supplier, "lead_time_days", 7) or 7
            purchase_order.expected_delivery = (timezone.now() + timedelta(days=lead_days)).date()

        purchase_order.status = PurchaseOrder.Status.SENT
        purchase_order.submitted_at = timezone.now()
        purchase_order.save(update_fields=["status", "submitted_at", "expected_delivery", "updated_at"])
        return purchase_order

    @classmethod
    @transaction.atomic
    def cancel(cls, *, purchase_order):
        if purchase_order.status in (
            PurchaseOrder.Status.RECEIVED,
            PurchaseOrder.Status.CANCELLED,
        ):
            raise ValueError("Cannot cancel a received or already cancelled PO.")
        purchase_order.status = PurchaseOrder.Status.CANCELLED
        purchase_order.save(update_fields=["status", "updated_at"])
        return purchase_order

    @classmethod
    @transaction.atomic
    def receive(
        cls,
        *,
        purchase_order,
        user,
        location=None,
        line_receipts=None,
        request=None,
    ):
        if purchase_order.status not in (
            PurchaseOrder.Status.SENT,
            PurchaseOrder.Status.PARTIAL,
        ):
            raise ValueError("Only sent or partially received POs can be received.")

        receive_location = location or purchase_order.location
        if not receive_location:
            raise ValueError("A receive location is required.")

        lines = {line.id: line for line in purchase_order.lines.select_related("product")}
        if line_receipts:
            receipts = [
                (lines[item["line_id"]], int(item["quantity"]))
                for item in line_receipts
                if item.get("line_id") in lines and int(item.get("quantity", 0)) > 0
            ]
        else:
            receipts = [
                (line, line.quantity_remaining)
                for line in lines.values()
                if line.quantity_remaining > 0
            ]

        if not receipts:
            raise ValueError("Nothing left to receive.")

        for line, qty in receipts:
            remaining = line.quantity_remaining
            if qty > remaining:
                raise ValueError(
                    f"Cannot receive {qty} of {line.product.name}; remaining {remaining}."
                )
            StockService.stock_in(
                product=line.product,
                supplier=purchase_order.supplier,
                location=receive_location,
                quantity=qty,
                unit_cost=line.unit_cost,
                user=user,
                request=request,
                reference=purchase_order.po_number,
                notes=f"PO receive: {purchase_order.po_number}",
            )
            line.quantity_received += qty
            line.save(update_fields=["quantity_received", "updated_at"])

        purchase_order.refresh_from_db()
        all_done = all(
            line.quantity_received >= line.quantity_ordered
            for line in purchase_order.lines.all()
        )
        any_received = any(
            line.quantity_received > 0 for line in purchase_order.lines.all()
        )
        if all_done:
            purchase_order.status = PurchaseOrder.Status.RECEIVED
            purchase_order.received_at = timezone.now()
            purchase_order.save(
                update_fields=["status", "received_at", "updated_at"]
            )
            try:
                supplier = purchase_order.supplier
                received_pos = PurchaseOrder.objects.filter(
                    supplier=supplier,
                    status=PurchaseOrder.Status.RECEIVED,
                    submitted_at__isnull=False,
                    received_at__isnull=False
                )
                total_days = 0.0
                count = 0
                for po in received_pos:
                    delta = po.received_at - po.submitted_at
                    total_days += delta.total_seconds() / 86400.0
                    count += 1
                if count > 0:
                    avg_days = max(1, int(round(total_days / count)))
                    supplier.lead_time_days = avg_days
                    supplier.save(update_fields=["lead_time_days", "updated_at"])
            except Exception:
                pass
            from suppliers.services import SupplierPerformanceService

            SupplierPerformanceService.recalculate(purchase_order.supplier)
        elif any_received:
            purchase_order.status = PurchaseOrder.Status.PARTIAL
            purchase_order.save(update_fields=["status", "updated_at"])

        return purchase_order
