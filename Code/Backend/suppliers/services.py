from decimal import Decimal
from datetime import timedelta

from procurement.models import PurchaseOrder


class SupplierPerformanceService:
    @classmethod
    def recalculate(cls, supplier):
        orders = (
            PurchaseOrder.objects.filter(
                supplier=supplier,
                status=PurchaseOrder.Status.RECEIVED,
                submitted_at__isnull=False,
                received_at__isnull=False,
            )
            .prefetch_related("lines")
            .order_by("-received_at")
        )
        order_count = orders.count()
        if not order_count:
            return supplier

        on_time = 0
        ordered = 0
        received = 0
        for order in orders:
            due_date = order.expected_delivery
            if due_date is None:
                due_date = (order.submitted_at + timedelta(days=supplier.lead_time_days)).date()
            if order.received_at.date() <= due_date:
                on_time += 1
            for line in order.lines.all():
                ordered += line.quantity_ordered
                received += min(line.quantity_received, line.quantity_ordered)

        delivery_rate = Decimal(on_time * 100) / order_count
        order_accuracy = Decimal(received * 100) / ordered if ordered else Decimal("0")
        performance_score = (delivery_rate + order_accuracy) / 2
        supplier.delivery_rate = delivery_rate.quantize(Decimal("0.01"))
        supplier.delivery_reliability = supplier.delivery_rate
        supplier.order_accuracy = order_accuracy.quantize(Decimal("0.01"))
        supplier.performance_score = performance_score.quantize(Decimal("0.01"))
        supplier.performance_breakdown = {
            "completed_orders": order_count,
            "on_time_orders": on_time,
            "ordered_units": ordered,
            "received_units": received,
        }
        supplier.save(
            update_fields=[
                "delivery_rate",
                "delivery_reliability",
                "order_accuracy",
                "performance_score",
                "performance_breakdown",
                "updated_at",
            ]
        )
        return supplier
