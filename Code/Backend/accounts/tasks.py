from celery import shared_task
from django.utils import timezone

from accounts.models import EmailVerificationToken, PasswordResetToken


@shared_task
def cleanup_expired_tokens():
    now = timezone.now()
    ev = EmailVerificationToken.objects.filter(expires_at__lt=now).delete()
    pr = PasswordResetToken.objects.filter(expires_at__lt=now).delete()
    return {"verification_deleted": ev[0], "reset_deleted": pr[0]}
