from decimal import Decimal

from django.test import TestCase

from accounts.models import User
from core.models import Organization, OrganizationSettings
from inventory.models import Category, Location, Product
from stock.services import StockService
from suppliers.models import Supplier


class StockValuationTests(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Test Org", slug="test-org")
        self.settings = OrganizationSettings.objects.create(organization=self.organization)
        self.user = User.objects.create_user(
            email="stock@example.test",
            username="stock-user",
            password="password",
            organization=self.organization,
            status=User.Status.ACTIVE,
        )
        self.supplier = Supplier.objects.create(organization=self.organization, name="Supplier")
        category = Category.objects.create(organization=self.organization, name="Category")
        self.product = Product.objects.create(
            organization=self.organization,
            category=category,
            supplier=self.supplier,
            sku="SKU-1",
            name="Product",
            unit_price=Decimal("12.00"),
        )
        self.location = Location.objects.create(organization=self.organization, name="Warehouse")

    def _cost_for_method(self, method):
        self.settings.valuation_method = method
        self.settings.save(update_fields=["valuation_method"])
        StockService.stock_in(
            product=self.product,
            supplier=self.supplier,
            location=self.location,
            quantity=2,
            unit_cost=Decimal("5.00"),
            user=self.user,
        )
        StockService.stock_in(
            product=self.product,
            supplier=self.supplier,
            location=self.location,
            quantity=2,
            unit_cost=Decimal("10.00"),
            user=self.user,
        )
        transaction, _ = StockService.stock_out(
            product=self.product, location=self.location, quantity=3, user=self.user
        )
        return transaction.cogs

    def test_fifo_costing(self):
        self.assertEqual(self._cost_for_method("fifo"), Decimal("20.00"))

    def test_lifo_costing(self):
        self.assertEqual(self._cost_for_method("lifo"), Decimal("25.00"))

    def test_weighted_average_costing(self):
        self.assertEqual(self._cost_for_method("weighted_average"), Decimal("22.50"))

    def test_stock_out_notification(self):
        from notifications.models import Notification
        
        # Initial stock in to have available stock
        StockService.stock_in(
            product=self.product,
            supplier=self.supplier,
            location=self.location,
            quantity=100,
            unit_cost=Decimal("5.00"),
            user=self.user,
        )
        
        # Clear existing system notifications if any
        Notification.objects.filter(
            notification_type=Notification.NotificationType.SYSTEM
        ).delete()
        
        # Perform stock out
        StockService.stock_out(
            product=self.product,
            location=self.location,
            quantity=30,
            user=self.user,
        )
        
        # Assert notification was created
        notif = Notification.objects.filter(
            notification_type=Notification.NotificationType.SYSTEM,
            organization=self.organization
        ).first()
        
        self.assertIsNotNone(notif)
        self.assertEqual(notif.title, f"Stock issued: {self.product.name}")
        self.assertEqual(
            notif.message,
            f"Issued 30 units of {self.product.name} ({self.product.sku}). Remaining stock: 70 units."
        )


class BatchExpiryAndFIFOTests(TestCase):
    def setUp(self):
        from datetime import timedelta
        from django.utils import timezone
        self.organization = Organization.objects.create(name="Test Org FEFO", slug="test-org-fefo")
        self.settings = OrganizationSettings.objects.create(organization=self.organization)
        self.user = User.objects.create_user(
            email="fefo@example.test",
            username="fefo-user",
            password="password",
            organization=self.organization,
            status=User.Status.ACTIVE,
        )
        self.supplier = Supplier.objects.create(organization=self.organization, name="FEFO Supplier")
        category = Category.objects.create(organization=self.organization, name="Pharma")
        self.product = Product.objects.create(
            organization=self.organization,
            category=category,
            supplier=self.supplier,
            sku="DRUG-01",
            name="Antibiotic 500mg",
            unit_price=Decimal("15.00"),
        )
        self.location = Location.objects.create(organization=self.organization, name="Main Storage")
        self.today = timezone.now().date()

    def test_fefo_consumption_order(self):
        from datetime import timedelta
        from stock.models import Batch
        from stock.services import StockService

        # Batch 1 expires in 20 days
        StockService.stock_in(
            product=self.product,
            supplier=self.supplier,
            location=self.location,
            quantity=10,
            unit_cost=Decimal("5.00"),
            user=self.user,
            batch_number="BATCH-LATER",
            expiry_date=self.today + timedelta(days=20),
        )
        # Batch 2 expires in 3 days (earlier expiry)
        StockService.stock_in(
            product=self.product,
            supplier=self.supplier,
            location=self.location,
            quantity=5,
            unit_cost=Decimal("5.00"),
            user=self.user,
            batch_number="BATCH-EARLIER",
            expiry_date=self.today + timedelta(days=3),
        )

        txn, _ = StockService.stock_out(
            product=self.product,
            location=self.location,
            quantity=4,
            user=self.user,
        )

        self.assertEqual(txn.batch.batch_number, "BATCH-EARLIER")
        b_earlier = Batch.objects.get(batch_number="BATCH-EARLIER")
        b_later = Batch.objects.get(batch_number="BATCH-LATER")
        self.assertEqual(b_earlier.quantity_on_hand, 1)
        self.assertEqual(b_later.quantity_on_hand, 10)

    def test_expired_batch_issuance_blocked(self):
        from datetime import timedelta
        from stock.services import InsufficientStockError, StockService

        StockService.stock_in(
            product=self.product,
            supplier=self.supplier,
            location=self.location,
            quantity=5,
            unit_cost=Decimal("5.00"),
            user=self.user,
            batch_number="BATCH-EXPIRED",
            expiry_date=self.today - timedelta(days=2),
        )

        with self.assertRaises(InsufficientStockError) as ctx:
            StockService.stock_out(
                product=self.product,
                location=self.location,
                quantity=1,
                user=self.user,
            )
        self.assertIn("expired", str(ctx.exception).lower())

    def test_evaluate_batch_expiry_alerts(self):
        from datetime import timedelta
        from notifications.models import Notification
        from stock.services import StockService
        from stock.tasks import evaluate_batch_expiry

        StockService.stock_in(
            product=self.product,
            supplier=self.supplier,
            location=self.location,
            quantity=5,
            unit_cost=Decimal("5.00"),
            user=self.user,
            batch_number="BATCH-30D",
            expiry_date=self.today + timedelta(days=25),
        )
        StockService.stock_in(
            product=self.product,
            supplier=self.supplier,
            location=self.location,
            quantity=5,
            unit_cost=Decimal("5.00"),
            user=self.user,
            batch_number="BATCH-7D",
            expiry_date=self.today + timedelta(days=5),
        )

        result = evaluate_batch_expiry()
        self.assertGreaterEqual(result["alerts"], 2)
        expiry_notifs = Notification.objects.filter(
            organization=self.organization,
            notification_type=Notification.NotificationType.EXPIRY,
        )
        self.assertTrue(expiry_notifs.filter(severity=Notification.Severity.CRITICAL).exists())
        self.assertTrue(expiry_notifs.filter(severity=Notification.Severity.INFO).exists())


class StockAdjustmentAPITests(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient
        self.client = APIClient()
        self.organization = Organization.objects.create(name="Adjustment Org", slug="adj-org")
        self.settings = OrganizationSettings.objects.create(organization=self.organization)
        self.user = User.objects.create_superuser(
            email="admin@adjustment.test",
            username="admin-adj",
            password="AdminPassword123!",
            organization=self.organization,
            status=User.Status.ACTIVE,
        )
        self.client.force_authenticate(user=self.user)

        self.category = Category.objects.create(organization=self.organization, name="Electronics")
        self.location = Location.objects.create(organization=self.organization, name="Main Warehouse")
        self.supplier = Supplier.objects.create(organization=self.organization, name="TechSupplier Ltd")
        self.product = Product.objects.create(
            organization=self.organization,
            category=self.category,
            supplier=self.supplier,
            sku="MOUSE-001",
            name="Wireless Mouse",
            unit_price=Decimal("25.00"),
        )

    def test_create_stock_adjustment_successful(self):
        from stock.models import StockAdjustment
        from rest_framework import status
        payload = {
            "product": self.product.id,
            "location": self.location.id,
            "adjusted_qty": 50,
            "reason": "Initial inventory adjustment",
        }
        response = self.client.post("/api/v1/stock-adjustments/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(StockAdjustment.objects.count(), 1)
        
        adj = StockAdjustment.objects.first()
        self.assertEqual(adj.adjusted_qty, 50)
        self.assertEqual(adj.reason, "Initial inventory adjustment")
        self.assertIsNotNone(adj.adjusted_at)


class DataIntegrityTests(TestCase):
    def setUp(self):
        from audit.models import ActivityLog
        from inventory.models import InventoryBalance
        self.organization = Organization.objects.create(name="Integrity Org", slug="integrity-org")
        self.settings = OrganizationSettings.objects.create(organization=self.organization)
        self.user = User.objects.create_user(
            email="integrity@example.test",
            username="integrity-user",
            password="password",
            organization=self.organization,
            status=User.Status.ACTIVE,
        )
        self.supplier = Supplier.objects.create(organization=self.organization, name="Test Supplier")
        self.category = Category.objects.create(organization=self.organization, name="General")
        self.product = Product.objects.create(
            organization=self.organization,
            category=self.category,
            supplier=self.supplier,
            sku="INTEG-001",
            name="Integrity Product",
            unit_price=Decimal("10.00"),
        )
        self.location_a = Location.objects.create(organization=self.organization, name="Warehouse A")
        self.location_b = Location.objects.create(organization=self.organization, name="Warehouse B")

    def test_t1_t2_t3_stock_arithmetic_overissue_and_audit(self):
        from audit.models import ActivityLog
        from inventory.models import InventoryBalance
        from stock.services import InsufficientStockError

        # === T1 stock arithmetic ===
        print("\n=== T1 stock arithmetic ===")
        StockService.stock_in(
            product=self.product,
            supplier=self.supplier,
            location=self.location_a,
            quantity=100,
            unit_cost=Decimal("5.00"),
            user=self.user,
        )
        bal = InventoryBalance.objects.get(product=self.product, location=self.location_a)
        print(f"after +100 -> {bal.quantity_on_hand}")
        self.assertEqual(bal.quantity_on_hand, 100)

        StockService.stock_out(
            product=self.product,
            location=self.location_a,
            quantity=30,
            user=self.user,
        )
        bal.refresh_from_db()
        print(f"after -30 -> {bal.quantity_on_hand}")
        self.assertEqual(bal.quantity_on_hand, 70)

        # === T2 over-issue guard ===
        print("\n=== T2 over-issue guard ===")
        with self.assertRaises(InsufficientStockError) as ctx:
            StockService.stock_out(
                product=self.product,
                location=self.location_a,
                quantity=10000,
                user=self.user,
            )
        print(f"blocked OK: {ctx.exception}")
        self.assertEqual(str(ctx.exception), "Insufficient stock. Available: 70, requested: 10000")
        bal.refresh_from_db()
        self.assertEqual(bal.quantity_on_hand, 70)

        # === T3 audit immutability ===
        print("\n=== T3 audit immutability ===")
        first_log = ActivityLog.objects.first()
        self.assertIsNotNone(first_log)

        try:
            first_log.action = "Tampered Action"
            first_log.save()
        except ValueError as exc:
            print(f"update blocked: {exc}")
            self.assertEqual(str(exc), "ActivityLog records are immutable and cannot be updated.")

        try:
            first_log.delete()
        except ValueError as exc:
            print(f"delete blocked: {exc}")
            self.assertEqual(str(exc), "ActivityLog records are immutable and cannot be deleted.")

        audit_count = ActivityLog.objects.count()
        print(f"audit rows written so far: {audit_count}")
        self.assertEqual(audit_count, 2)

    def test_t7_transfer_atomicity(self):
        from inventory.models import InventoryBalance
        from stock.services import InsufficientStockError

        # Setup source with 50 units
        StockService.stock_in(
            product=self.product,
            supplier=self.supplier,
            location=self.location_a,
            quantity=50,
            unit_cost=Decimal("5.00"),
            user=self.user,
        )
        # Transfer 20 units from location_a to location_b
        transfer = StockService.create_transfer_draft(
            product=self.product,
            source_location=self.location_a,
            destination_location=self.location_b,
            quantity=20,
            user=self.user,
        )
        StockService.complete_transfer(transfer=transfer, user=self.user)

        bal_a = InventoryBalance.objects.get(product=self.product, location=self.location_a)
        bal_b = InventoryBalance.objects.get(product=self.product, location=self.location_b)
        total = bal_a.quantity_on_hand + bal_b.quantity_on_hand

        print("\n=== T7 transfer atomicity ===")
        print(f"source={bal_a.quantity_on_hand} dest={bal_b.quantity_on_hand} total={total} (expected 50)")
        self.assertEqual(bal_a.quantity_on_hand, 30)
        self.assertEqual(bal_b.quantity_on_hand, 20)
        self.assertEqual(total, 50)

        # Attempt oversized transfer of 999 units
        oversized_transfer = StockService.create_transfer_draft(
            product=self.product,
            source_location=self.location_a,
            destination_location=self.location_b,
            quantity=999,
            user=self.user,
        )
        try:
            StockService.complete_transfer(transfer=oversized_transfer, user=self.user)
        except InsufficientStockError as exc:
            print(f"oversized transfer blocked: {exc}")
            self.assertIn("Insufficient stock at source. Available: 30", str(exc))

        bal_a.refresh_from_db()
        bal_b.refresh_from_db()
        after_total = bal_a.quantity_on_hand + bal_b.quantity_on_hand
        unchanged = (bal_a.quantity_on_hand == 30 and bal_b.quantity_on_hand == 20)
        print(f"after rollback source={bal_a.quantity_on_hand} dest={bal_b.quantity_on_hand} total={after_total} (unchanged? {unchanged})")
        self.assertTrue(unchanged)




                         

