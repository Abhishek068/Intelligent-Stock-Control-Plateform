from django.db import transaction
from django.utils import timezone

from audit.services import log_activity
from inventory.models import InventoryBalance
from stock.models import (
    StockAdjustment,
    StockInTransaction,
    StockOutTransaction,
    StockTransfer,
)


class InsufficientStockError(Exception):
    pass


def _record(organization, user, event_type, title, description="", entity_type="", entity_id=""):
    try:
        from activity.services import record_activity

        record_activity(
            organization=organization,
            user=user,
            event_type=event_type,
            title=title,
            description=description,
            entity_type=entity_type,
            entity_id=entity_id,
        )
    except Exception:
        pass


def _evaluate_alerts(product):
    try:
        from analytics.services import AlertService

        AlertService.evaluate_product(product, product.organization)
    except Exception:
        pass


def _notify_stock_in(product, quantity, user):
    try:
        from notifications.services import NotificationService

        NotificationService.notify(
            organization=product.organization,
            user=user,
            title=f"Stock received: {product.name}",
            message=f"Received {quantity} units of {product.name} ({product.sku}).",
            notification_type="system",
            severity="info",
            priority="normal",
            related_entity_type="Product",
            related_entity_id=str(product.id),
        )
    except Exception:
        pass


class StockService:
    @staticmethod
    def _get_or_create_balance(product, location):
        balance, _ = InventoryBalance.objects.select_for_update().get_or_create(
            product=product,
            location=location,
            defaults={"quantity_on_hand": 0, "reserved_qty": 0},
        )
        return balance

    @classmethod
    @transaction.atomic
    def stock_in(cls, *, product, supplier, location, quantity, unit_cost, user, request=None, **kwargs):
        balance = cls._get_or_create_balance(product, location)
        before_qty = balance.quantity_on_hand
        balance.quantity_on_hand += quantity
        balance.save(update_fields=["quantity_on_hand", "updated_at"])

        txn = StockInTransaction.objects.create(
            product=product,
            supplier=supplier,
            location=location,
            quantity=quantity,
            unit_cost=unit_cost,
            quantity_remaining=quantity,
            received_at=kwargs.get("received_at") or timezone.now(),
            reference=kwargs.get("reference", ""),
            notes=kwargs.get("notes", ""),
            created_by=user,
        )

        log_activity(
            user=user,
            action="Stock In",
            entity_type="Product",
            entity_id=product.id,
            entity_name=product.name,
            before={"quantity": before_qty},
            after={"quantity": balance.quantity_on_hand},
            details=f"Received {quantity} units",
            request=request,
        )
        _record(
            product.organization,
            user,
            "stock_in",
            f"Stock in: {product.name}",
            f"Received {quantity} units",
            "Product",
            product.id,
        )
        _notify_stock_in(product, quantity, user)
        return txn, balance

    @classmethod
    @transaction.atomic
    def stock_out(cls, *, product, location, quantity, user, request=None, **kwargs):
        balance = cls._get_or_create_balance(product, location)
        if balance.available_quantity < quantity:
            raise InsufficientStockError(
                f"Insufficient stock. Available: {balance.available_quantity}, requested: {quantity}"
            )

        before_qty = balance.quantity_on_hand
        balance.quantity_on_hand -= quantity
        balance.save(update_fields=["quantity_on_hand", "updated_at"])

        qty_to_deduct = quantity
        total_cogs = 0.0

        batches = StockInTransaction.objects.select_for_update().filter(
            product=product,
            location=location,
            quantity_remaining__gt=0
        ).order_by("received_at", "id")

        for batch in batches:
            if qty_to_deduct <= 0:
                break
            take = min(qty_to_deduct, batch.quantity_remaining)
            batch.quantity_remaining -= take
            batch.save(update_fields=["quantity_remaining", "updated_at"])
            total_cogs += float(batch.unit_cost or 0) * take
            qty_to_deduct -= take

        if qty_to_deduct > 0:
            total_cogs += float(product.unit_price or 0) * qty_to_deduct

        txn = StockOutTransaction.objects.create(
            product=product,
            location=location,
            quantity=quantity,
            cogs=total_cogs,
            issued_at=kwargs.get("issued_at") or timezone.now(),
            issued_to=kwargs.get("issued_to", ""),
            reference=kwargs.get("reference", ""),
            notes=kwargs.get("notes", ""),
            created_by=user,
        )

        log_activity(
            user=user,
            action="Stock Out",
            entity_type="Product",
            entity_id=product.id,
            entity_name=product.name,
            before={"quantity": before_qty},
            after={"quantity": balance.quantity_on_hand},
            details=f"Issued {quantity} units",
            request=request,
        )
        _record(
            product.organization,
            user,
            "stock_out",
            f"Stock out: {product.name}",
            f"Issued {quantity} units",
            "Product",
            product.id,
        )
        _evaluate_alerts(product)
        return txn, balance

    @classmethod
    @transaction.atomic
    def adjust_stock(cls, *, product, location, adjusted_qty, reason, user, request=None, **kwargs):
        reason = (reason or "").strip()
        if not reason:
            raise ValueError("Adjustment reason is required.")

        balance = cls._get_or_create_balance(product, location)
        before_qty = balance.quantity_on_hand
        balance.quantity_on_hand = adjusted_qty
        balance.save(update_fields=["quantity_on_hand", "updated_at"])

        adj = StockAdjustment.objects.create(
            product=product,
            location=location,
            previous_qty=before_qty,
            adjusted_qty=adjusted_qty,
            reason=reason,
            adjusted_at=kwargs.get("adjusted_at") or timezone.now(),
            created_by=user,
        )

        log_activity(
            user=user,
            action="Adjustment",
            entity_type="Product",
            entity_id=product.id,
            entity_name=product.name,
            before={"quantity": before_qty},
            after={"quantity": adjusted_qty},
            details=reason,
            request=request,
        )
        _record(
            product.organization,
            user,
            "system",
            f"Stock adjustment: {product.name}",
            f"{before_qty} → {adjusted_qty}: {reason}",
            "Product",
            product.id,
        )
        _evaluate_alerts(product)
        return adj, balance

    @classmethod
    @transaction.atomic
    def create_transfer_draft(cls, *, product, source_location, destination_location, quantity, user, notes="", request=None):
        if source_location.id == destination_location.id:
            raise ValueError("Source and destination locations must differ.")
        transfer = StockTransfer.objects.create(
            product=product,
            source_location=source_location,
            destination_location=destination_location,
            quantity=quantity,
            status=StockTransfer.Status.DRAFT,
            notes=notes,
            created_by=user,
        )
        _record(
            product.organization,
            user,
            "system",
            f"Transfer draft: {product.name}",
            f"{quantity} units pending transfer",
            "StockTransfer",
            transfer.id,
        )
        return transfer

    @classmethod
    @transaction.atomic
    def ship_transfer(cls, *, transfer, user, request=None):
        if transfer.status != StockTransfer.Status.DRAFT:
            raise ValueError("Only draft transfers can be marked in transit.")
        source_balance = cls._get_or_create_balance(transfer.product, transfer.source_location)
        if source_balance.available_quantity < transfer.quantity:
            raise InsufficientStockError(
                f"Insufficient stock at source. Available: {source_balance.available_quantity}"
            )
        transfer.status = StockTransfer.Status.IN_TRANSIT
        transfer.save(update_fields=["status", "updated_at"])
        log_activity(
            user=user,
            action="Transfer Ship",
            entity_type="StockTransfer",
            entity_id=transfer.id,
            entity_name=transfer.product.name,
            after={"status": transfer.status},
            request=request,
        )
        return transfer

    @classmethod
    @transaction.atomic
    def complete_transfer(cls, *, transfer, user, request=None):
        if transfer.status not in (
            StockTransfer.Status.DRAFT,
            StockTransfer.Status.IN_TRANSIT,
        ):
            raise ValueError("Only draft or in-transit transfers can be completed.")

        if transfer.source_location_id == transfer.destination_location_id:
            raise ValueError("Source and destination locations must differ.")

        source_balance = cls._get_or_create_balance(transfer.product, transfer.source_location)
        if source_balance.available_quantity < transfer.quantity:
            raise InsufficientStockError(
                f"Insufficient stock at source. Available: {source_balance.available_quantity}"
            )

        dest_balance = cls._get_or_create_balance(transfer.product, transfer.destination_location)
        source_before = source_balance.quantity_on_hand
        dest_before = dest_balance.quantity_on_hand

        source_balance.quantity_on_hand -= transfer.quantity
        dest_balance.quantity_on_hand += transfer.quantity
        source_balance.save(update_fields=["quantity_on_hand", "updated_at"])
        dest_balance.save(update_fields=["quantity_on_hand", "updated_at"])

        transfer.status = StockTransfer.Status.COMPLETED
        transfer.transferred_at = timezone.now()
        transfer.save(update_fields=["status", "transferred_at", "updated_at"])

        log_activity(
            user=user,
            action="Stock Transfer",
            entity_type="Product",
            entity_id=transfer.product_id,
            entity_name=transfer.product.name,
            before={"source": source_before, "destination": dest_before},
            after={
                "source": source_balance.quantity_on_hand,
                "destination": dest_balance.quantity_on_hand,
            },
            details=(
                f"Transferred {transfer.quantity} from {transfer.source_location.name} "
                f"to {transfer.destination_location.name}"
            ),
            request=request,
        )
        _record(
            transfer.product.organization,
            user,
            "system",
            f"Transfer completed: {transfer.product.name}",
            f"{transfer.quantity} units moved",
            "StockTransfer",
            transfer.id,
        )
        _evaluate_alerts(transfer.product)
        return transfer

    @classmethod
    @transaction.atomic
    def cancel_transfer(cls, *, transfer, user, request=None):
        if transfer.status not in (
            StockTransfer.Status.DRAFT,
            StockTransfer.Status.IN_TRANSIT,
        ):
            raise ValueError("Only draft or in-transit transfers can be cancelled.")
        transfer.status = StockTransfer.Status.CANCELLED
        transfer.save(update_fields=["status", "updated_at"])
        log_activity(
            user=user,
            action="Transfer Cancel",
            entity_type="StockTransfer",
            entity_id=transfer.id,
            entity_name=transfer.product.name,
            after={"status": transfer.status},
            request=request,
        )
        return transfer

    @classmethod
    def transfer_stock(cls, *, transfer, user, request=None):
        return cls.complete_transfer(transfer=transfer, user=user, request=request)


class StockTakeService:
    @classmethod
    @transaction.atomic
    def create(
        cls,
        *,
        organization,
        location,
        scheduled_date,
        user,
        assigned_to=None,
        notes="",
    ):
        from stock.models import StockTake

        return StockTake.objects.create(
            organization=organization,
            location=location,
            scheduled_date=scheduled_date,
            assigned_to=assigned_to,
            notes=notes or "",
            created_by=user,
            status=StockTake.Status.SCHEDULED,
        )

    @classmethod
    @transaction.atomic
    def start(cls, *, stock_take):
        from inventory.models import InventoryBalance, Product
        from stock.models import StockTake, StockTakeLine

        if stock_take.status != StockTake.Status.SCHEDULED:
            raise ValueError("Only scheduled stock-takes can be started.")

        balances = {
            b.product_id: b.quantity_on_hand
            for b in InventoryBalance.objects.filter(location=stock_take.location)
        }
        products = Product.objects.filter(
            organization=stock_take.organization, is_active=True
        )
        product_ids = list(balances.keys())
        if product_ids:
            products = products.filter(id__in=product_ids)
        StockTakeLine.objects.filter(stock_take=stock_take).delete()
        lines = [
            StockTakeLine(
                stock_take=stock_take,
                product=p,
                system_qty=balances.get(p.id, 0),
            )
            for p in products
        ]
        if not lines:
            lines = [
                StockTakeLine(stock_take=stock_take, product=p, system_qty=0)
                for p in Product.objects.filter(
                    organization=stock_take.organization, is_active=True
                )[:500]
            ]
        if not lines:
            raise ValueError("No products available to count at this location.")

        StockTakeLine.objects.bulk_create(lines)
        stock_take.status = StockTake.Status.IN_PROGRESS
        stock_take.started_at = timezone.now()
        stock_take.save(update_fields=["status", "started_at", "updated_at"])
        return stock_take

    @classmethod
    @transaction.atomic
    def record_counts(cls, *, stock_take, counts):
        from stock.models import StockTake, StockTakeLine

        if stock_take.status != StockTake.Status.IN_PROGRESS:
            raise ValueError("Counts can only be recorded while in progress.")

        lines = {line.id: line for line in stock_take.lines.all()}
        for item in counts:
            line_id = item.get("line_id") or item.get("id")
            if line_id not in lines:
                continue
            line = lines[line_id]
            qty = item.get("counted_qty")
            if qty is None:
                continue
            qty = int(qty)
            if qty < 0:
                raise ValueError("Counted quantity cannot be negative.")
            line.counted_qty = qty
            if "notes" in item:
                line.notes = item.get("notes") or ""
            line.save(update_fields=["counted_qty", "notes", "updated_at"])
        return stock_take

    @classmethod
    @transaction.atomic
    def complete(cls, *, stock_take, user, request=None, apply_adjustments=True):
        from stock.models import StockTake

        if stock_take.status != StockTake.Status.IN_PROGRESS:
            raise ValueError("Only in-progress stock-takes can be completed.")

        uncounted = stock_take.lines.filter(counted_qty__isnull=True).count()
        if uncounted:
            raise ValueError(
                f"{uncounted} line(s) still uncounted. Record all counts before completing."
            )

        if apply_adjustments:
            for line in stock_take.lines.select_related("product"):
                if not line.has_variance:
                    continue
                adj, _ = StockService.adjust_stock(
                    product=line.product,
                    location=stock_take.location,
                    adjusted_qty=line.counted_qty,
                    reason=(
                        f"Stock-take #{stock_take.id} variance "
                        f"({line.system_qty} → {line.counted_qty})"
                        + (f": {line.notes}" if line.notes else "")
                    ),
                    user=user,
                    request=request,
                )
                line.adjustment = adj
                line.save(update_fields=["adjustment", "updated_at"])

        stock_take.status = StockTake.Status.COMPLETED
        stock_take.completed_at = timezone.now()
        stock_take.save(update_fields=["status", "completed_at", "updated_at"])
        _record(
            stock_take.organization,
            user,
            "system",
            f"Stock-take completed: {stock_take.location.name}",
            f"Take #{stock_take.id} with {stock_take.lines.count()} lines",
            "StockTake",
            stock_take.id,
        )
        return stock_take

    @classmethod
    @transaction.atomic
    def cancel(cls, *, stock_take):
        from stock.models import StockTake

        if stock_take.status in (
            StockTake.Status.COMPLETED,
            StockTake.Status.CANCELLED,
        ):
            raise ValueError("Cannot cancel a completed or already cancelled stock-take.")
        stock_take.status = StockTake.Status.CANCELLED
        stock_take.save(update_fields=["status", "updated_at"])
        return stock_take
