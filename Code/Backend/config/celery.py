import os

from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("stocksense")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.beat_schedule = {
    "process-email-queue": {
        "task": "emails.tasks.process_email_queue",
        "schedule": 60.0,
    },
    "retry-failed-emails": {
        "task": "emails.tasks.retry_failed_emails",
        "schedule": 300.0,
    },
    "run-scheduled-reports": {
        "task": "emails.tasks.run_scheduled_reports",
        "schedule": 300.0,
    },
    "cleanup-expired-tokens": {
        "task": "accounts.tasks.cleanup_expired_tokens",
        "schedule": crontab(hour=3, minute=0),
    },
}
