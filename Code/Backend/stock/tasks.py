from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from accounts.models import User
from emails.services import queue_email
from notifications.models import Notification
from notifications.services import NotificationService
from stock.models import Batch


def _expiry_band(days):
    if days < 0:
        return "overdue"
    if days <= 7:
        return "7"
    if days <= 15:
        return "15"
    if days <= 30:
        return "30"
    return None


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
        band = _expiry_band(days)
        if not band:
            continue
        if batch.last_expiry_alert_at == today and batch.last_expiry_alert_band == band:
            continue

        if band == "overdue":
            severity = Notification.Severity.CRITICAL
            title = f"Expired Batch: {batch.product.name} ({batch.batch_number})"
            message = (
                f"Batch '{batch.batch_number}' expired on {batch.expiry_date} "
                f"({-days} day(s) ago) at {batch.location.name}. Quantity on hand: {batch.quantity_on_hand} units."
            )
        elif band == "7":
            severity = Notification.Severity.CRITICAL
            title = f"Urgent Expiry Alert (≤7 Days): {batch.product.name}"
            message = (
                f"Batch '{batch.batch_number}' expires in {days} day(s) on {batch.expiry_date} "
                f"at {batch.location.name}. Priority dispatch required (Qty: {batch.quantity_on_hand})."
            )
        elif band == "15":
            severity = Notification.Severity.WARNING
            title = f"Expiry Warning (≤15 Days): {batch.product.name}"
            message = (
                f"Batch '{batch.batch_number}' expires in {days} day(s) on {batch.expiry_date} "
                f"at {batch.location.name}. Remaining stock: {batch.quantity_on_hand} units."
            )
        else:  # band == "30"
            severity = Notification.Severity.INFO
            title = f"Expiry Attention (≤30 Days): {batch.product.name}"
            message = (
                f"Batch '{batch.batch_number}' expires in {days} day(s) on {batch.expiry_date} "
                f"at {batch.location.name}. Remaining stock: {batch.quantity_on_hand} units."
            )

        NotificationService.notify(
            organization=batch.product.organization,
            title=title,
            message=message,
            notification_type=Notification.NotificationType.EXPIRY,
            severity=severity,
            priority=Notification.Priority.HIGH if severity == Notification.Severity.CRITICAL else Notification.Priority.NORMAL,
            related_entity_type="Batch",
            related_entity_id=batch.id,
            explanation_json={
                "batch_number": batch.batch_number,
                "expiry_date": str(batch.expiry_date),
                "days_remaining": days,
                "quantity_on_hand": batch.quantity_on_hand,
                "location": batch.location.name,
                "band": band,
            },
        )
        settings = getattr(batch.product.organization, "settings", None)
        recipients = User.objects.filter(
            organization=batch.product.organization,
            id__in=getattr(settings, "expiry_alert_user_ids", []) or [],
        )
        emails = set(getattr(settings, "expiry_alert_emails", []) or [])
        emails.update(recipients.values_list("email", flat=True))
        for email in emails:
            queue_email(
                recipient=email,
                template_key="notification",
                context={"name": email, "title": title, "message": message},
                organization=batch.product.organization,
            )
        batch.last_expiry_alert_at = today
        batch.last_expiry_alert_band = band
        batch.save(update_fields=["last_expiry_alert_at", "last_expiry_alert_band", "updated_at"])
        sent += 1
    return {"alerts": sent}
