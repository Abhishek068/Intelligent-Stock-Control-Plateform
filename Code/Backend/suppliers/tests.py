from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User
from core.models import Organization
from suppliers.models import Supplier


class SupplierManagementTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organization = Organization.objects.create(name="Supplier Org", slug="supplier-org")
        self.user = User.objects.create_superuser(
            email="admin@supplier.test",
            username="admin-supplier",
            password="AdminPassword123!",
            organization=self.organization,
            status=User.Status.ACTIVE,
        )
        self.client.force_authenticate(user=self.user)

    def test_create_supplier(self):
        payload = {
            "name": "Global Components Inc.",
            "email": "contact@globalcomp.com",
            "phone": "+441234567890",
        }
        response = self.client.post("/api/v1/suppliers/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Supplier.objects.count(), 1)
        self.assertEqual(Supplier.objects.get().name, "Global Components Inc.")

    def test_supplier_list_filter(self):
        Supplier.objects.create(organization=self.organization, name="Supplier Alpha", status=Supplier.Status.ACTIVE)
        Supplier.objects.create(organization=self.organization, name="Supplier Beta", status=Supplier.Status.INACTIVE)

        response = self.client.get("/api/v1/suppliers/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
