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



                         

