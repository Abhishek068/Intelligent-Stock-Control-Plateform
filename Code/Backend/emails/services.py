import logging
from string import Template

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from emails.models import EmailLog, EmailProviderConfig, EmailQueue, EmailTemplate

logger = logging.getLogger(__name__)


DEFAULT_TEMPLATES = {
    EmailTemplate.TemplateKey.VERIFICATION: {
        "subject": "Verify your StockSense account",
        "body_html": "<p>Hello $name,</p><p>Please verify your email by clicking <a href=\"$verify_url\">this link</a>.</p><p>This link expires in 48 hours.</p>",
        "body_text": "Hello $name, verify your email: $verify_url",
    },
    EmailTemplate.TemplateKey.WELCOME: {
        "subject": "Welcome to StockSense",
        "body_html": "<p>Hello $name,</p><p>Your account is verified. Temporary password: <strong>$temp_password</strong></p><p>Please log in and change your password.</p><p><a href=\"$login_url\">Login</a></p>",
        "body_text": "Hello $name, temp password: $temp_password. Login: $login_url",
    },
    EmailTemplate.TemplateKey.PASSWORD_RESET: {
        "subject": "Reset your StockSense password",
        "body_html": "<p>Hello $name,</p><p>Reset your password: <a href=\"$reset_url\">Reset Password</a></p><p>This link expires in 1 hour.</p>",
        "body_text": "Hello $name, reset: $reset_url",
    },
    EmailTemplate.TemplateKey.PASSWORD_CHANGED: {
        "subject": "Your StockSense password was changed",
        "body_html": "<p>Hello $name,</p><p>Your password was changed successfully. If this wasn't you, contact your administrator.</p>",
        "body_text": "Hello $name, your password was changed.",
    },
    EmailTemplate.TemplateKey.DAILY_REPORT: {
        "subject": "StockSense Daily Report — $date",
        "body_html": "<p>Daily report for $date</p><pre>$report_body</pre>",
        "body_text": "Daily report $date\n$report_body",
    },
    EmailTemplate.TemplateKey.LOW_STOCK: {
        "subject": "Low stock alert: $product_name",
        "body_html": "<p>$product_name is below minimum ($quantity remaining).</p>",
        "body_text": "$product_name low stock: $quantity",
    },
    EmailTemplate.TemplateKey.FORECAST: {
        "subject": "Forecast update: $product_name",
        "body_html": "<p>Forecast for $product_name: $summary</p>",
        "body_text": "Forecast $product_name: $summary",
    },
    EmailTemplate.TemplateKey.REORDER: {
        "subject": "Reorder recommendation: $product_name",
        "body_html": "<p>Suggested reorder for $product_name: $quantity units.</p>",
        "body_text": "Reorder $product_name: $quantity",
    },
    EmailTemplate.TemplateKey.NOTIFICATION: {
        "subject": "$title",
        "body_html": "<p>$message</p>",
        "body_text": "$message",
    },
}


def ensure_default_templates(organization=None):
    for key, content in DEFAULT_TEMPLATES.items():
        EmailTemplate.objects.get_or_create(
            organization=organization,
            key=key,
            defaults={
                "subject": content["subject"],
                "body_html": content["body_html"],
                "body_text": content["body_text"],
            },
        )


def render_template(template: EmailTemplate, context: dict) -> tuple[str, str, str]:
    safe = {k: str(v) for k, v in context.items()}
    subject = Template(template.subject).safe_substitute(safe)
    body_html = Template(template.body_html).safe_substitute(safe)
    body_text = Template(template.body_text or "").safe_substitute(safe)
    return subject, body_html, body_text


def queue_email(
    *,
    recipient: str,
    template_key: str,
    context: dict | None = None,
    organization=None,
    subject_override: str | None = None,
):
    context = context or {}
    template = (
        EmailTemplate.objects.filter(
            key=template_key, organization=organization, is_active=True
        ).first()
        or EmailTemplate.objects.filter(
            key=template_key, organization__isnull=True, is_active=True
        ).first()
    )
    if template:
        subject, body_html, body_text = render_template(template, context)
    else:
        defaults = DEFAULT_TEMPLATES.get(template_key, DEFAULT_TEMPLATES["notification"])
        safe = {k: str(v) for k, v in context.items()}
        subject = Template(defaults["subject"]).safe_substitute(safe)
        body_html = Template(defaults["body_html"]).safe_substitute(safe)
        body_text = Template(defaults["body_text"]).safe_substitute(safe)

    if subject_override:
        subject = subject_override

    item = EmailQueue.objects.create(
        organization=organization,
        template_key=template_key,
        recipient=recipient,
        subject=subject,
        body_html=body_html,
        body_text=body_text,
        context_json=context,
        status=EmailQueue.Status.QUEUED,
    )
    try:
        process_queue_item(item)
    except Exception:
        logger.exception("Failed to process queue item synchronously")
    return item


def _send_via_brevo(config: EmailProviderConfig, item: EmailQueue) -> tuple[bool, str]:
    try:
        import urllib.request
        import json

        payload = {
            "sender": {
                "name": config.sender_name or "StockSense",
                "email": config.sender_email or settings.DEFAULT_FROM_EMAIL,
            },
            "to": [{"email": item.recipient}],
            "subject": item.subject,
            "htmlContent": item.body_html,
            "textContent": item.body_text or item.subject,
        }
        if config.reply_to:
            payload["replyTo"] = {"email": config.reply_to}

        req = urllib.request.Request(
            "https://api.brevo.com/v3/smtp/email",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "api-key": config.api_key,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            return True, body
    except Exception as exc:
        logger.exception("Brevo send failed")
        return False, str(exc)


def _send_via_console(item: EmailQueue) -> tuple[bool, str]:
    try:
        send_mail(
            subject=item.subject,
            message=item.body_text or item.subject,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@stocksense.local"),
            recipient_list=[item.recipient],
            html_message=item.body_html,
            fail_silently=False,
        )
        return True, "sent via django email backend"
    except Exception as exc:
        logger.exception("Console/Django email send failed")
        return False, str(exc)


def process_queue_item(item: EmailQueue) -> bool:
    item.status = EmailQueue.Status.PROCESSING
    item.attempts += 1
    item.save(update_fields=["status", "attempts", "updated_at"])

    config = None
    if item.organization_id:
        config = EmailProviderConfig.objects.filter(
            organization=item.organization, is_active=True
        ).first()

    # Prefer org Brevo key; fall back to BREVO_API_KEY from settings
    api_key = (config.api_key if config else "") or getattr(settings, "BREVO_API_KEY", "")
    if api_key:
        from emails.models import EmailProviderConfig as EPC

        effective = config or EPC(
            provider="brevo",
            api_key=api_key,
            sender_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@stocksense.local"),
            sender_name="StockSense",
            is_active=True,
        )
        if not getattr(effective, "api_key", None):
            effective.api_key = api_key
        ok, response = _send_via_brevo(effective, item)
    else:
        ok, response = _send_via_console(item)

    EmailLog.objects.create(
        queue_item=item,
        organization=item.organization,
        recipient=item.recipient,
        subject=item.subject,
        status="sent" if ok else "failed",
        provider_response=response[:5000],
    )

    if ok:
        item.status = EmailQueue.Status.SENT
        item.sent_at = timezone.now()
        item.error_message = ""
        item.save(update_fields=["status", "sent_at", "error_message", "updated_at"])
        return True

    item.error_message = response[:2000]
    if item.attempts >= item.max_attempts:
        item.status = EmailQueue.Status.FAILED
    else:
        item.status = EmailQueue.Status.RETRY
    item.save(update_fields=["status", "error_message", "updated_at"])
    return False


def process_pending_emails(limit: int = 50):
    items = EmailQueue.objects.filter(
        status__in=[EmailQueue.Status.QUEUED, EmailQueue.Status.RETRY]
    ).order_by("created_at")[:limit]
    results = {"sent": 0, "failed": 0}
    for item in items:
        if process_queue_item(item):
            results["sent"] += 1
        else:
            results["failed"] += 1
    return results
