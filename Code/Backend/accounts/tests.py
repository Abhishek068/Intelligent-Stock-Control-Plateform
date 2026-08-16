from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from accounts.models import User, Role, RolePermission, UserPermissionOverride
from core.models import Organization, OrganizationSettings
from accounts.services import validate_password_policy
from django.core.exceptions import ValidationError


class AccountsAuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.organization = Organization.objects.create(name="Test Org Accounts", slug="test-org-accounts")
        self.settings = OrganizationSettings.objects.create(organization=self.organization)
        self.user = User.objects.create_user(
            email="user@example.test",
            username="user-test",
            password="SecurePassword123!",
            organization=self.organization,
            status=User.Status.ACTIVE,
        )

    def test_user_login_success(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "user@example.test", "password": "SecurePassword123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        self.assertIn("access", response.data["data"])
        self.assertIn("refresh", response.data["data"])

    def test_user_login_invalid_password(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "user@example.test", "password": "WrongPassword!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(response.data["success"])

    def test_password_policy_validation(self):
        with self.assertRaises(ValidationError):
            validate_password_policy("short", user=self.user, org_settings=self.settings)

    def test_role_permission_and_override(self):
        role = Role.objects.create(organization=self.organization, name="Manager")
        RolePermission.objects.create(role=role, module="products", action="edit", allowed=True)
        self.user.roles.add(role)

        self.assertTrue(self.user.has_module_permission("products", "edit"))
        self.assertFalse(self.user.has_module_permission("products", "delete"))

        UserPermissionOverride.objects.create(
            user=self.user, module="products", action="delete", allowed=True
        )
        self.assertTrue(self.user.has_module_permission("products", "delete"))
