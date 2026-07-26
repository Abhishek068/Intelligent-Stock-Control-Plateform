import logging

from django.utils import timezone

from notifications.models import DeviceToken, Notification

logger = logging.getLogger(__name__)


class NotificationService:
    @staticmethod
    def notify(
        *,
        organization,
        title: str,
        message: str,
        user=None,
        notification_type=Notification.NotificationType.SYSTEM,
        severity=Notification.Severity.INFO,
        channel=Notification.Channel.IN_APP,
        priority=Notification.Priority.NORMAL,
        related_entity_type="",
        related_entity_id="",
        explanation_json=None,
        expires_at=None,
        send_email=False,
        send_push=False,
    ):
        notification = Notification.objects.create(
            organization=organization,
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            severity=severity,
            channel=channel,
            priority=priority,
            related_entity_type=related_entity_type,
            related_entity_id=str(related_entity_id) if related_entity_id else "",
            explanation_json=explanation_json,
            expires_at=expires_at,
        )

        if send_email and user and user.email:
            try:
                from emails.services import queue_email

                queue_email(
                    recipient=user.email,
                    template_key="notification",
                    context={"title": title, "message": message, "name": user.display_name},
                    organization=organization,
                )
            except Exception:
                logger.exception("Failed to queue notification email")

        if send_push and user:
            NotificationService._send_push(user, title, message)

        try:
            from activity.services import record_activity

            record_activity(
                organization=organization,
                user=user,
                event_type="notification_sent",
                title=title,
                description=message[:500],
                entity_type="Notification",
                entity_id=notification.id,
            )
        except Exception:
            pass

        return notification

    @staticmethod
    def _send_push(user, title, message):
        tokens = DeviceToken.objects.filter(user=user, is_active=True)
        from django.conf import settings as dj_settings

        firebase_cred = getattr(dj_settings, "FIREBASE_CREDENTIALS_PATH", "")
        if not firebase_cred:
            logger.info(
                "Push stub: would send to %s device(s) for user %s — %s",
                tokens.count(),
                user.email,
                title,
            )
            return
        logger.info("Firebase push not fully configured; skipping send.")
