from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from accounts.models import User
from emails.services import queue_email
from notifications.models import Notification
from notifications.services import NotificationService
from stock.models import Batch


@shared_task
def evaluate_batch_expiry():
    today = timezone.now().date()
    upcoming = Batch.objects.filter(
        quantity_on_hand__gt=0,
        expiry_date__isnull=False,
        expiry_date__lte=today + timedelta(days=30),
    ).select_related("product", "location", "product__organization")
    sent = 0
    for batch in upcoming:
        days = (batch.expiry_date - today).days
        severity = Notification.Severity.CRITICAL if days <= 7 else Notification.Severity.WARNING
        title = f"Expiry alert: {batch.product.name}"
        message = f"Batch {batch.batch_number} expires in {days} day(s) at {batch.location.name}."
        NotificationService.notify(
            organization=batch.product.organization,
            title=title,
            message=message,
            notification_type=Notification.NotificationType.EXPIRY,
            severity=severity,
            priority=Notification.Priority.HIGH,
            related_entity_type="Batch",
            related_entity_id=batch.id,
        )
        recipients = User.objects.filter(
            organization=batch.product.organization,
            id__in=getattr(batch.product.organization.settings, "expiry_alert_user_ids", []),
        )
        emails = set(getattr(batch.product.organization.settings, "expiry_alert_emails", []))
        emails.update(recipients.values_list("email", flat=True))
        for email in emails:
            queue_email(
                recipient=email,
                template_key="notification",
                context={"name": email, "title": title, "message": message},
                organization=batch.product.organization,
            )
        sent += 1
    return {"alerts": sent}
