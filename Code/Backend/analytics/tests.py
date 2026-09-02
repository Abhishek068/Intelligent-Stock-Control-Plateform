from decimal import Decimal
from django.test import TestCase
from accounts.models import User
from core.models import Organization
from inventory.models import Category, Location, Product
from suppliers.models import Supplier
from analytics.services import ForecastingService


class AnalyticsServicesTests(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Analytics Org", slug="analytics-org")
        self.user = User.objects.create_user(
            email="analytics@example.test",
            username="analytics-user",
            password="password",
            organization=self.organization,
            status=User.Status.ACTIVE,
        )
        self.supplier = Supplier.objects.create(organization=self.organization, name="Supplier")
        self.category = Category.objects.create(organization=self.organization, name="Category")
        self.product = Product.objects.create(
            organization=self.organization,
            category=self.category,
            supplier=self.supplier,
            sku="AN-PRODUCT-1",
            name="Analytics Test Product",
            unit_price=Decimal("50.00"),
            reorder_level=15,
            minimum_level=5,
        )
        self.location = Location.objects.create(organization=self.organization, name="Warehouse")

    def test_forecast_product_creation(self):
        forecast = ForecastingService.forecast_product(self.product, horizon_days=7)
        self.assertIsNotNone(forecast)
        self.assertEqual(forecast.product, self.product)
        self.assertIsNotNone(forecast.forecast_period_end)


class AnomalyDetectionTests(TestCase):
    def setUp(self):
        from django.utils import timezone
        self.organization = Organization.objects.create(name="Anomaly Org", slug="anomaly-org")
        self.user = User.objects.create_user(
            email="anomaly@example.test",
            username="anomaly-user",
            password="password",
            organization=self.organization,
            status=User.Status.ACTIVE,
        )
        self.supplier = Supplier.objects.create(organization=self.organization, name="Anomaly Supplier")
        self.category = Category.objects.create(organization=self.organization, name="Anomaly Category")
        self.product = Product.objects.create(
            organization=self.organization,
            category=self.category,
            supplier=self.supplier,
            sku="ANOM-001",
            name="Anomaly Test Product",
            unit_price=Decimal("20.00"),
        )
        self.location = Location.objects.create(organization=self.organization, name="Anomaly Warehouse")
        self.now = timezone.now()

    def test_insufficient_history_returns_none(self):
        from stock.models import StockOutTransaction
        from analytics.services import AnomalyDetectionService

        # Only 1 transaction (less than MINIMUM_HISTORY=10)
        txn = StockOutTransaction.objects.create(
            product=self.product,
            location=self.location,
            quantity=5,
            issued_at=self.now,
            created_by=self.user,
        )
        score, is_anomaly = AnomalyDetectionService.evaluate(txn)
        self.assertIsNone(score)
        self.assertFalse(is_anomaly)

    def test_outlier_transaction_detected_as_anomaly(self):
        from stock.models import StockOutTransaction
        from analytics.services import AnomalyDetectionService
        from notifications.models import Notification

        # Create baseline history of 15 typical transactions (quantities 2 to 10)
        for i in range(15):
            StockOutTransaction.objects.create(
                product=self.product,
                location=self.location,
                quantity=5 + (i % 4),
                issued_at=self.now,
                created_by=self.user,
            )

        # Create an extreme outlier transaction (quantity 50,000)
        outlier_txn = StockOutTransaction.objects.create(
            product=self.product,
            location=self.location,
            quantity=50000,
            issued_at=self.now,
            created_by=self.user,
        )

        score, is_anomaly = AnomalyDetectionService.evaluate(outlier_txn)
        outlier_txn.refresh_from_db()

        self.assertIsNotNone(score)
        self.assertTrue(is_anomaly)
        self.assertTrue(outlier_txn.is_anomaly)

        # Verify automated security/anomaly notification was sent
        anomaly_notif = Notification.objects.filter(
            organization=self.organization,
            notification_type=Notification.NotificationType.ANOMALY,
        ).first()
        self.assertIsNotNone(anomaly_notif)
        self.assertIn("Suspicious", anomaly_notif.title)

