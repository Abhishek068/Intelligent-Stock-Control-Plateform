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



        txn = StockOutTransaction.objects.create(

            product=product,

            location=location,

            quantity=quantity,

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

        return txn, balance



    @classmethod

    @transaction.atomic

    def adjust_stock(cls, *, product, location, adjusted_qty, reason, user, request=None, **kwargs):

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

        return adj, balance



    @classmethod

    @transaction.atomic

    def transfer_stock(cls, *, transfer, user, request=None):

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

            before={

                "source": source_before,

                "destination": dest_before,

            },

            after={

                "source": source_balance.quantity_on_hand,

                "destination": dest_balance.quantity_on_hand,

            },

            details=f"Transferred {transfer.quantity} from {transfer.source_location.name} to {transfer.destination_location.name}",

            request=request,

        )

        return transfer

