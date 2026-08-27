from django.db import models, transaction
from django.db.models import F, Q
from django.utils import timezone
from decimal import Decimal

from audit.services import log_activity
from inventory.models import InventoryBalance
from stock.models import (
    Batch,
    StockAdjustment,
    StockInTransaction,
    StockOutTransaction,
    StockTransfer,
    SupplierReturn,
    SupplierReturnLine,
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


def _notify_stock_out(product, quantity, remaining_qty, user):
    try:
        from notifications.services import NotificationService

        NotificationService.notify(
            organization=product.organization,
            user=user,
            title=f"Stock issued: {product.name}",
            message=f"Issued {quantity} units of {product.name} ({product.sku}). Remaining stock: {remaining_qty} units.",
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
    def inventory_value(product, location):
        return sum(
            (
                Decimal(batch.unit_cost or 0) * batch.quantity_remaining
                for batch in StockInTransaction.objects.filter(
                    product=product, location=location, quantity_remaining__gt=0
                )
            ),
            Decimal("0"),
        )

    @staticmethod
    def _valuation_method(product):
        try:
            return product.organization.settings.valuation_method
        except Exception:
            return "fifo"

    @staticmethod
    def _next_auto_batch_number(product):
        today = timezone.now().strftime("%Y%m%d")
        prefix = f"AUTO-{product.sku}-{today}-"
        existing = (
            Batch.objects.filter(product=product, batch_number__startswith=prefix)
            .order_by("-batch_number")
            .values_list("batch_number", flat=True)
            .first()
        )
        if existing:
            try:
                n = int(str(existing).rsplit("-", 1)[-1]) + 1
            except ValueError:
                n = 1
        else:
            n = 1
        return f"{prefix}{n}"

    @classmethod
    def _resolve_or_create_batch(
        cls, *, product, supplier, location, quantity, unit_cost, batch_number=None, expiry_date=None
    ):
        number = (batch_number or "").strip() or cls._next_auto_batch_number(product)
        batch, created = Batch.objects.select_for_update().get_or_create(
            product=product,
            location=location,
            batch_number=number,
            defaults={
                "supplier": supplier,
                "expiry_date": expiry_date,
                "quantity_on_hand": quantity,
                "unit_cost": unit_cost or 0,
            },
        )
        if not created:
            batch.quantity_on_hand += quantity
            if unit_cost is not None:
                batch.unit_cost = unit_cost
            if expiry_date is not None:
                batch.expiry_date = expiry_date
            if supplier is not None and batch.supplier_id is None:
                batch.supplier = supplier
            batch.save(
                update_fields=[
                    "quantity_on_hand",
                    "unit_cost",
                    "expiry_date",
                    "supplier",
                    "updated_at",
                ]
            )
        return batch

    @classmethod
    def _consume_batches(cls, product, location, quantity, batch_id=None, allow_expired=False):
        """FEFO consume from Batch.quantity_on_hand. Returns primary batch used."""
        remaining = quantity
        primary = None
        today = timezone.now().date()

        if batch_id:
            batches = list(
                Batch.objects.select_for_update().filter(
                    id=batch_id, product=product, location=location, quantity_on_hand__gt=0
                )
            )
            if not batches:
                raise InsufficientStockError("Selected batch not found or has no quantity.")

            target_batch = batches[0]
            if not allow_expired and target_batch.expiry_date and target_batch.expiry_date < today:
                raise InsufficientStockError(
                    f"Selected batch '{target_batch.batch_number}' expired on {target_batch.expiry_date}. "
                    "Expired stock cannot be issued. Please perform a stock adjustment or supplier return."
                )

            if target_batch.quantity_on_hand < quantity:
                raise InsufficientStockError(
                    f"Insufficient quantity on batch {target_batch.batch_number}. "
                    f"Available: {target_batch.quantity_on_hand}"
                )
        else:
            qs = Batch.objects.select_for_update().filter(
                product=product, location=location, quantity_on_hand__gt=0
            )
            if not allow_expired:
                qs = qs.filter(Q(expiry_date__isnull=True) | Q(expiry_date__gte=today))

            batches = list(
                qs.order_by(F("expiry_date").asc(nulls_last=True), "created_at", "id")
            )

            if not batches and not allow_expired:
                expired_count = Batch.objects.filter(
                    product=product, location=location, quantity_on_hand__gt=0, expiry_date__lt=today
                ).count()
                if expired_count > 0:
                    raise InsufficientStockError(
                        "All available batches for this product have expired and cannot be issued. "
                        "Please adjust or return expired stock."
                    )

        for batch in batches:
            if remaining <= 0:
                break
            taken = min(remaining, batch.quantity_on_hand)
            batch.quantity_on_hand -= taken
            batch.save(update_fields=["quantity_on_hand", "updated_at"])
            if primary is None:
                primary = batch
            remaining -= taken

        if remaining > 0 and batch_id:
            raise InsufficientStockError("Insufficient quantity on selected batch.")
        return primary

    @classmethod
    def _consume_cost_layers(cls, product, location, quantity):
        method = cls._valuation_method(product)
        ordering = ["received_at", "id"] if method != "lifo" else ["-received_at", "-id"]
        batches = list(
            StockInTransaction.objects.select_for_update()
            .filter(product=product, location=location, quantity_remaining__gt=0)
            .order_by(*ordering)
        )
        remaining = quantity
        allocations = []
        if method == "weighted_average":
            available = sum(batch.quantity_remaining for batch in batches)
            total_cost = sum(
                (Decimal(batch.unit_cost or 0) * batch.quantity_remaining for batch in batches),
                Decimal("0"),
            )
            average_cost = total_cost / available if available else Decimal(product.unit_price or 0)
        else:
            average_cost = None

        for batch in batches:
            if remaining <= 0:
                break
            taken = min(remaining, batch.quantity_remaining)
            batch.quantity_remaining -= taken
            batch.save(update_fields=["quantity_remaining", "updated_at"])
            allocations.append((taken, average_cost if average_cost is not None else Decimal(batch.unit_cost or 0)))
            remaining -= taken

        fallback_cost = average_cost
        if fallback_cost is None:
            fallback_cost = Decimal(batches[-1].unit_cost or 0) if batches else Decimal(product.unit_price or 0)
        if remaining:
            allocations.append((remaining, fallback_cost))
        return sum((Decimal(taken) * cost for taken, cost in allocations), Decimal("0")), allocations

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

        batch = cls._resolve_or_create_batch(
            product=product,
            supplier=supplier,
            location=location,
            quantity=quantity,
            unit_cost=unit_cost,
            batch_number=kwargs.get("batch_number"),
            expiry_date=kwargs.get("expiry_date"),
        )

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
            batch=batch,
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
            details=f"Received {quantity} units (batch {batch.batch_number})",
            request=request,
        )
        _record(
            product.organization,
            user,
            "stock_in",
            f"Stock in: {product.name}",
            f"Received {quantity} units (batch {batch.batch_number})",
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

        batch_id = kwargs.get("batch_id") or kwargs.get("batch")
        if hasattr(batch_id, "id"):
            batch_id = batch_id.id
        primary_batch = cls._consume_batches(product, location, quantity, batch_id=batch_id)
        total_cogs, _ = cls._consume_cost_layers(product, location, quantity)

        txn = StockOutTransaction.objects.create(
            product=product,
            location=location,
            quantity=quantity,
            cogs=total_cogs,
            issued_at=kwargs.get("issued_at") or timezone.now(),
            issued_to=kwargs.get("issued_to", ""),
            reference=kwargs.get("reference", ""),
            notes=kwargs.get("notes", ""),
            batch=primary_batch,
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
        try:
            from analytics.services import AnomalyDetectionService

            AnomalyDetectionService.evaluate(txn)
        except Exception:
            pass
        _notify_stock_out(product, quantity, balance.quantity_on_hand, user)
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
        delta = adjusted_qty - before_qty
        balance.quantity_on_hand = adjusted_qty
        balance.save(update_fields=["quantity_on_hand", "updated_at"])

        if delta < 0:
            cls._consume_batches(product, location, abs(delta))
            cls._consume_cost_layers(product, location, abs(delta))
        elif delta > 0:
            existing = StockInTransaction.objects.filter(
                product=product, location=location, quantity_remaining__gt=0
            )
            total_quantity = sum(item.quantity_remaining for item in existing)
            total_cost = sum(
                (Decimal(item.unit_cost or 0) * item.quantity_remaining for item in existing),
                Decimal("0"),
            )
            unit_cost = total_cost / total_quantity if total_quantity else Decimal(product.unit_price or 0)
            batch = cls._resolve_or_create_batch(
                product=product,
                supplier=product.supplier,
                location=location,
                quantity=delta,
                unit_cost=unit_cost,
            )
            StockInTransaction.objects.create(
                product=product,
                supplier=product.supplier,
                location=location,
                quantity=delta,
                quantity_remaining=delta,
                unit_cost=unit_cost,
                reference="stock-adjustment",
                notes=f"Adjustment increase: {reason}",
                received_at=kwargs.get("adjusted_at") or timezone.now(),
                batch=batch,
                created_by=user,
            )

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
        try:
            from analytics.services import AnomalyDetectionService

            AnomalyDetectionService.evaluate(adj)
        except Exception:
            pass
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

        cls._consume_batches(transfer.product, transfer.source_location, transfer.quantity)
        transfer_cost, _ = cls._consume_cost_layers(
            transfer.product, transfer.source_location, transfer.quantity
        )
        unit_cost = transfer_cost / transfer.quantity if transfer.quantity else Decimal("0")
        dest_batch = cls._resolve_or_create_batch(
            product=transfer.product,
            supplier=transfer.product.supplier,
            location=transfer.destination_location,
            quantity=transfer.quantity,
            unit_cost=unit_cost,
            batch_number=f"XFER-{transfer.id}",
        )
        StockInTransaction.objects.create(
            product=transfer.product,
            supplier=transfer.product.supplier,
            location=transfer.destination_location,
            quantity=transfer.quantity,
            quantity_remaining=transfer.quantity,
            unit_cost=unit_cost,
            reference=f"transfer-{transfer.id}",
            notes=f"Transfer from {transfer.source_location.name}",
            received_at=timezone.now(),
            batch=dest_batch,
            created_by=user,
        )

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


class SupplierReturnService:
    @classmethod
    @transaction.atomic
    def create_draft(cls, *, supplier, location, reason, user, lines):
        if not lines:
            raise ValueError("At least one return line is required.")
        ret = SupplierReturn.objects.create(
            supplier=supplier,
            location=location,
            reason=reason,
            created_by=user,
            status=SupplierReturn.Status.DRAFT,
        )
        for line in lines:
            product = line["product"]
            batch = line.get("batch")
            qty = int(line["quantity"])
            unit_cost = line.get("unit_cost")
            if unit_cost is None:
                unit_cost = batch.unit_cost if batch else product.unit_price
            if batch and (batch.product_id != product.id or batch.location_id != location.id):
                raise ValueError(f"Batch {batch.batch_number} does not match product/location.")
            if batch and batch.quantity_on_hand < qty:
                raise ValueError(
                    f"Insufficient batch quantity for {product.name}. "
                    f"Available: {batch.quantity_on_hand}"
                )
            SupplierReturnLine.objects.create(
                supplier_return=ret,
                product=product,
                batch=batch,
                quantity=qty,
                unit_cost=unit_cost or 0,
            )
        _record(
            supplier.organization,
            user,
            "system",
            f"Supplier return draft: {supplier.name}",
            reason,
            "SupplierReturn",
            ret.id,
        )
        return ret

    @classmethod
    @transaction.atomic
    def ship(cls, *, supplier_return, user, request=None):
        if supplier_return.status != SupplierReturn.Status.DRAFT:
            raise ValueError("Only draft returns can be shipped.")
        lines = list(supplier_return.lines.select_related("product", "batch"))
        if not lines:
            raise ValueError("Cannot ship a return with no lines.")

        for line in lines:
            balance = StockService._get_or_create_balance(line.product, supplier_return.location)
            if balance.available_quantity < line.quantity:
                raise InsufficientStockError(
                    f"Insufficient stock for {line.product.name}. "
                    f"Available: {balance.available_quantity}"
                )
            balance.quantity_on_hand -= line.quantity
            balance.save(update_fields=["quantity_on_hand", "updated_at"])
            StockService._consume_batches(
                line.product,
                supplier_return.location,
                line.quantity,
                batch_id=line.batch_id,
            )
            StockService._consume_cost_layers(
                line.product, supplier_return.location, line.quantity
            )

        supplier_return.status = SupplierReturn.Status.SHIPPED
        supplier_return.shipped_at = timezone.now()
        supplier_return.save(update_fields=["status", "shipped_at", "updated_at"])

        log_activity(
            user=user,
            action="Supplier Return Ship",
            entity_type="SupplierReturn",
            entity_id=supplier_return.id,
            entity_name=supplier_return.supplier.name,
            after={"status": supplier_return.status},
            details=supplier_return.reason,
            request=request,
        )
        _record(
            supplier_return.supplier.organization,
            user,
            "system",
            f"Supplier return shipped: {supplier_return.supplier.name}",
            supplier_return.reason,
            "SupplierReturn",
            supplier_return.id,
        )
        for line in lines:
            _evaluate_alerts(line.product)
        return supplier_return

    @classmethod
    @transaction.atomic
    def complete(cls, *, supplier_return, user, request=None):
        if supplier_return.status != SupplierReturn.Status.SHIPPED:
            raise ValueError("Only shipped returns can be completed.")
        supplier_return.status = SupplierReturn.Status.COMPLETED
        supplier_return.completed_at = timezone.now()
        supplier_return.save(update_fields=["status", "completed_at", "updated_at"])
        log_activity(
            user=user,
            action="Supplier Return Complete",
            entity_type="SupplierReturn",
            entity_id=supplier_return.id,
            entity_name=supplier_return.supplier.name,
            after={"status": supplier_return.status},
            request=request,
        )
        return supplier_return

    @classmethod
    @transaction.atomic
    def cancel(cls, *, supplier_return, user, request=None):
        if supplier_return.status != SupplierReturn.Status.DRAFT:
            raise ValueError("Only draft returns can be cancelled.")
        supplier_return.status = SupplierReturn.Status.CANCELLED
        supplier_return.save(update_fields=["status", "updated_at"])
        log_activity(
            user=user,
            action="Supplier Return Cancel",
            entity_type="SupplierReturn",
            entity_id=supplier_return.id,
            entity_name=supplier_return.supplier.name,
            after={"status": supplier_return.status},
            request=request,
        )
        return supplier_return


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
