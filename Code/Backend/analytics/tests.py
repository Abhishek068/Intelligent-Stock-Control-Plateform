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
