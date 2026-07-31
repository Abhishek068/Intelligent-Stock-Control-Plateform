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



                         

