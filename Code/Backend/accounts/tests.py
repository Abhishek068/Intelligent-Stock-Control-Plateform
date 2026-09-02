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


class SecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.org_a = Organization.objects.create(name="Security Org A", slug="sec-org-a")
        self.settings_a = OrganizationSettings.objects.create(
            organization=self.org_a,
            max_login_attempts=5,
            lockout_duration_minutes=30
        )
        self.user_a = User.objects.create_user(
            email="victim@sec-a.test",
            username="victim-a",
            password="CorrectPassword123!",
            organization=self.org_a,
            status=User.Status.ACTIVE,
        )

        self.org_b = Organization.objects.create(name="Security Org B", slug="sec-org-b")
        self.user_b = User.objects.create_user(
            email="attacker@sec-b.test",
            username="attacker-b",
            password="AttackerPassword123!",
            organization=self.org_b,
            status=User.Status.ACTIVE,
        )

    def test_brute_force_lockout_after_five_failed_attempts(self):
        # 4 wrong attempts -> HTTP 401
        for _ in range(4):
            res = self.client.post(
                "/api/v1/auth/login/",
                {"email": "victim@sec-a.test", "password": "WrongPassword!"},
                format="json",
            )
            self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

        # 5th wrong attempt -> triggers account lockout
        res5 = self.client.post(
            "/api/v1/auth/login/",
            {"email": "victim@sec-a.test", "password": "WrongPassword!"},
            format="json",
        )
        self.assertEqual(res5.status_code, status.HTTP_401_UNAUTHORIZED)

        # Subsequent attempt with correct password is now locked out -> HTTP 423 Locked
        res_locked = self.client.post(
            "/api/v1/auth/login/",
            {"email": "victim@sec-a.test", "password": "CorrectPassword123!"},
            format="json",
        )
        self.assertEqual(res_locked.status_code, status.HTTP_423_LOCKED)
        self.assertIn("temporarily locked", res_locked.data["error"])

    def test_jwt_token_blacklisting_on_logout(self):
        # Login to obtain token pair
        login_res = self.client.post(
            "/api/v1/auth/login/",
            {"email": "victim@sec-a.test", "password": "CorrectPassword123!"},
            format="json",
        )
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
        access_token = login_res.data["data"]["access"]
        refresh_token = login_res.data["data"]["refresh"]

        # Logout with refresh token (adds to token blacklist)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        logout_res = self.client.post("/api/v1/auth/logout/", {"refresh": refresh_token}, format="json")
        self.assertEqual(logout_res.status_code, status.HTTP_200_OK)

        # Attempt to use blacklisted refresh token -> rejected with HTTP 401
        self.client.credentials()  # clear auth header
        refresh_res = self.client.post("/api/v1/auth/token/refresh/", {"refresh": refresh_token}, format="json")
        self.assertEqual(refresh_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_multi_tenant_data_isolation(self):
        from suppliers.models import Supplier
        # Create confidential supplier in Org A
        supplier_a = Supplier.objects.create(organization=self.org_a, name="Secret Org A Supplier")

        # Authenticate as user from Org B
        self.client.force_authenticate(user=self.user_b)
        res = self.client.get("/api/v1/suppliers/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        # Ensure Org B user CANNOT see Org A's confidential supplier
        suppliers_list = res.data.get("data", res.data) if isinstance(res.data, dict) else res.data
        supplier_ids = [s["id"] for s in (suppliers_list if isinstance(suppliers_list, list) else [])]
        self.assertNotIn(supplier_a.id, supplier_ids)

