from django.test import TestCase
from accounts.models import User
from core.models import Organization
from notifications.models import Notification
from notifications.services import NotificationService


class NotificationServiceTests(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Notif Org", slug="notif-org")
        self.user = User.objects.create_user(
            email="notif@example.test",
            username="notif-user",
            password="password",
            organization=self.organization,
            status=User.Status.ACTIVE,
        )

    def test_create_notification(self):
        notif = NotificationService.notify(
            organization=self.organization,
            user=self.user,
            title="Low Stock Alert",
            message="Item X is below reorder level.",
            notification_type=Notification.NotificationType.LOW_STOCK,
            severity=Notification.Severity.WARNING,
        )
        self.assertEqual(Notification.objects.count(), 1)
        self.assertEqual(notif.title, "Low Stock Alert")
        self.assertFalse(notif.is_read)

    def test_mark_as_read(self):
        notif = NotificationService.notify(
            organization=self.organization,
            user=self.user,
            title="Test Notification",
            message="Mark read test",
            notification_type=Notification.NotificationType.SYSTEM,
        )
        notif.is_read = True
        notif.save()
        notif.refresh_from_db()
        self.assertTrue(notif.is_read)
