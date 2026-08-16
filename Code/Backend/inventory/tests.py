from decimal import Decimal
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from core.models import Organization
from inventory.models import Category, Location, Product
from suppliers.models import Supplier


class InventoryManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organization = Organization.objects.create(name="Inventory Org", slug="inv-org")
        self.user = User.objects.create_superuser(
            email="admin@inventory.test",
            username="admin-inv",
            password="AdminPassword123!",
            organization=self.organization,
            status=User.Status.ACTIVE,
        )
        self.client.force_authenticate(user=self.user)

        self.category = Category.objects.create(organization=self.organization, name="Electronics")
        self.location = Location.objects.create(organization=self.organization, name="Main Warehouse")
        self.supplier = Supplier.objects.create(organization=self.organization, name="TechSupplier Ltd")

    def test_create_product(self):
        payload = {
            "name": "Wireless Mouse",
            "sku": "MOUSE-001",
            "category": self.category.id,
            "supplier": self.supplier.id,
            "unit_price": "25.00",
            "reorder_level": 10,
            "minimum_level": 5,
        }
        response = self.client.post("/api/v1/products/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.count(), 1)
        self.assertEqual(Product.objects.get().sku, "MOUSE-001")

    def test_duplicate_sku_rejection(self):
        Product.objects.create(
            organization=self.organization,
            category=self.category,
            supplier=self.supplier,
            sku="UNIQUE-SKU",
            name="Keyboard",
            unit_price=Decimal("45.00"),
        )
        payload = {
            "name": "Gaming Keyboard",
            "sku": "UNIQUE-SKU",
            "category": self.category.id,
            "supplier": self.supplier.id,
            "unit_price": "55.00",
        }
        response = self.client.post("/api/v1/products/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_product_lookup_by_sku(self):
        product = Product.objects.create(
            organization=self.organization,
            category=self.category,
            supplier=self.supplier,
            sku="LOOKUP-SKU-99",
            name="Monitor",
            unit_price=Decimal("150.00"),
        )
        response = self.client.get(f"/api/v1/products/lookup_by_sku/?sku={product.sku}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(response.data["data"]["sku"], "LOOKUP-SKU-99")

    def test_location_comparison_endpoint(self):
        response = self.client.get("/api/v1/locations/comparison/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertEqual(len(response.data["data"]), 1)
