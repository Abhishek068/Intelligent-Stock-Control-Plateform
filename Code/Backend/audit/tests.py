from django.test import TestCase
from accounts.models import User
from core.models import Organization
from audit.models import ActivityLog
from audit.services import log_activity


class AuditLogServiceTests(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Audit Org", slug="audit-org")
        self.user = User.objects.create_user(
            email="audit@example.test",
            username="audit-user",
            password="password",
            organization=self.organization,
            status=User.Status.ACTIVE,
        )

    def test_log_activity(self):
        entry = log_activity(
            user=self.user,
            action="Product Deleted",
            entity_type="Product",
            entity_id=42,
            entity_name="Obsolete Item",
        )
        self.assertEqual(ActivityLog.objects.count(), 1)
        self.assertEqual(entry.action, "Product Deleted")
        self.assertEqual(entry.user, self.user)
        self.assertEqual(entry.entity_id, "42")
