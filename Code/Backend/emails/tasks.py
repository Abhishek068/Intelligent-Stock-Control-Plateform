from django.utils import timezone

from emails.models import EmailQueue, ScheduledReport
from emails.services import process_pending_emails, queue_email


def process_email_queue():
    return process_pending_emails(limit=100)


def retry_failed_emails():
    EmailQueue.objects.filter(status=EmailQueue.Status.FAILED, attempts__lt=3).update(
        status=EmailQueue.Status.RETRY
    )
    return process_pending_emails(limit=50)


def run_scheduled_reports():
    from datetime import timedelta

    now = timezone.now()
    intervals = {
        ScheduledReport.Frequency.EVERY_5_MIN: timedelta(minutes=5),
        ScheduledReport.Frequency.HOURLY: timedelta(hours=1),
        ScheduledReport.Frequency.DAILY: timedelta(days=1),
        ScheduledReport.Frequency.WEEKLY: timedelta(weeks=1),
        ScheduledReport.Frequency.MONTHLY: timedelta(days=30),
    }
    ran = 0
    for report in ScheduledReport.objects.filter(is_active=True).select_related(
        "organization"
    ):
        interval = intervals.get(report.frequency, timedelta(days=1))
        if report.last_run_at and (now - report.last_run_at) < interval:
            continue
        _deliver_report(report)
        report.last_run_at = now
        report.save(update_fields=["last_run_at", "updated_at"])
        ran += 1
    return {"ran": ran}


def build_report_body(report: ScheduledReport) -> str:
    org = report.organization
    lines = [f"Report: {report.name}", f"Type: {report.get_report_type_display()}", ""]

    try:
        if report.report_type == ScheduledReport.ReportType.INVENTORY:
            from inventory.models import InventoryBalance, Product

            products = Product.objects.filter(organization=org, is_active=True)
            lines.append(f"Active products: {products.count()}")
            balances = InventoryBalance.objects.filter(product__organization=org).select_related(
                "product"
            )[:50]
            for b in balances:
                lines.append(
                    f"- {b.product.sku} {b.product.name}: {b.quantity_on_hand} @ {b.location_id}"
                )

        elif report.report_type == ScheduledReport.ReportType.LOW_STOCK:
            from inventory.models import InventoryBalance, Product

            for p in Product.objects.filter(organization=org, is_active=True):
                qty = sum(
                    InventoryBalance.objects.filter(product=p).values_list(
                        "quantity_on_hand", flat=True
                    )
                )
                if qty <= (p.minimum_level or 0):
                    lines.append(f"- {p.sku} {p.name}: {qty} (min {p.minimum_level})")

        elif report.report_type == ScheduledReport.ReportType.STOCK_IN:
            from stock.models import StockInTransaction

            rows = StockInTransaction.objects.filter(
                product__organization=org
            ).order_by("-received_at")[:30]
            for r in rows:
                lines.append(
                    f"- {r.received_at:%Y-%m-%d} {r.product.sku}: +{r.quantity} (ref {r.reference})"
                )

        elif report.report_type == ScheduledReport.ReportType.STOCK_OUT:
            from stock.models import StockOutTransaction

            rows = StockOutTransaction.objects.filter(
                product__organization=org
            ).order_by("-issued_at")[:30]
            for r in rows:
                lines.append(
                    f"- {r.issued_at:%Y-%m-%d} {r.product.sku}: -{r.quantity} (ref {r.reference})"
                )

        elif report.report_type == ScheduledReport.ReportType.FORECAST:
            from analytics.models import DemandForecast

            rows = DemandForecast.objects.filter(
                product__organization=org
            ).order_by("-generated_at")[:20]
            for r in rows:
                lines.append(
                    f"- {r.product.sku}: predicted {r.predicted_demand} ({r.model_name})"
                )

        elif report.report_type == ScheduledReport.ReportType.REORDER:
            from analytics.models import ReorderRecommendation

            rows = ReorderRecommendation.objects.filter(
                product__organization=org, is_active=True
            ).order_by("-generated_at")[:20]
            for r in rows:
                lines.append(
                    f"- {r.product.sku}: suggest {r.suggested_quantity} ({r.priority})"
                )

        elif report.report_type == ScheduledReport.ReportType.AUDIT:
            from audit.models import ActivityLog

            rows = ActivityLog.objects.filter(user__organization=org).order_by(
                "-created_at"
            )[:30]
            for r in rows:
                lines.append(f"- {r.created_at:%Y-%m-%d %H:%M} {r.action} {r.entity_type} {r.entity_name}")

        else:
            lines.append("No generator for this report type.")
    except Exception as exc:
        lines.append(f"(partial report — {exc})")

    if len(lines) <= 3:
        lines.append("No rows found for this period.")
    return "\n".join(lines)


def _deliver_report(report: ScheduledReport):
    from accounts.models import Role, User
    from notifications.services import NotificationService

    body = build_report_body(report)
    summary = f"{report.get_report_type_display()}: {report.name}\n\n{body[:4000]}"
    emails = set(report.recipient_emails or [])
    user_ids = set(report.recipient_user_ids or [])
    for role_id in report.recipient_role_ids or []:
        role = Role.objects.filter(id=role_id).first()
        if role:
            user_ids.update(role.users.values_list("id", flat=True))

    users = User.objects.filter(id__in=user_ids)
    for u in users:
        emails.add(u.email)

    template_key = {
        ScheduledReport.ReportType.LOW_STOCK: "low_stock",
        ScheduledReport.ReportType.FORECAST: "forecast",
        ScheduledReport.ReportType.REORDER: "reorder",
    }.get(report.report_type, "daily_report")

    if report.delivery in (
        ScheduledReport.Delivery.EMAIL,
        ScheduledReport.Delivery.BOTH,
    ):
        for email in emails:
            queue_email(
                recipient=email,
                template_key=template_key,
                context={
                    "date": timezone.now().date().isoformat(),
                    "report_body": body,
                    "name": email,
                    "product_name": report.name,
                    "quantity": "",
                    "summary": summary[:500],
                    "title": report.name,
                    "message": summary[:1000],
                },
                organization=report.organization,
                subject_override=f"[StockSense] {report.name}",
            )

    if report.delivery in (
        ScheduledReport.Delivery.NOTIFICATION,
        ScheduledReport.Delivery.BOTH,
    ):
        for u in users:
            NotificationService.notify(
                organization=report.organization,
                user=u,
                title=report.name,
                message=summary[:1000],
                notification_type="report",
                severity="info",
                priority="normal",
            )
