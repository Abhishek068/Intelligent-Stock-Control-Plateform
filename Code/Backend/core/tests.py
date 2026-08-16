from django.test import TestCase
from core.models import Organization, OrganizationSettings


class CoreModelsTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="Core Test Organization", slug="core-test-org")

    def test_organization_creation(self):
        self.assertEqual(self.org.name, "Core Test Organization")
        self.assertEqual(self.org.slug, "core-test-org")
        self.assertTrue(self.org.is_active)
        self.assertEqual(str(self.org), "Core Test Organization")

    def test_organization_settings_defaults(self):
        settings = OrganizationSettings.objects.create(organization=self.org)
        self.assertEqual(settings.organization, self.org)
        self.assertEqual(settings.currency_code, "GBP")
        self.assertEqual(settings.valuation_method, OrganizationSettings.ValuationMethod.FIFO)
        self.assertEqual(settings.default_minimum_level, 10)
        self.assertEqual(settings.default_reorder_level, 20)
        self.assertEqual(str(settings), f"Settings for {self.org.name}")
