from django.db.models import Q
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import HasModulePermission, IsSuperAdmin
from emails.models import (
    EmailLog,
    EmailProviderConfig,
    EmailQueue,
    EmailTemplate,
    ScheduledReport,
)
from emails.services import process_pending_emails, process_queue_item


class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = [
            "id",
            "key",
            "subject",
            "body_html",
            "body_text",
            "is_active",
            "organization",
            "updated_at",
        ]
        read_only_fields = ["id", "organization", "updated_at"]


class EmailQueueSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailQueue
        fields = [
            "id",
            "template_key",
            "recipient",
            "subject",
            "body_html",
            "body_text",
            "status",
            "attempts",
            "error_message",
            "scheduled_at",
            "sent_at",
            "created_at",
        ]


class EmailLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailLog
        fields = [
            "id",
            "recipient",
            "subject",
            "status",
            "provider_response",
            "created_at",
            "queue_item",
        ]


class EmailProviderConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailProviderConfig
        fields = [
            "id",
            "provider",
            "api_key",
            "sender_email",
            "sender_name",
            "reply_to",
            "is_active",
            "environment",
            "updated_at",
        ]
        read_only_fields = ["id", "updated_at"]
        extra_kwargs = {"api_key": {"write_only": True, "required": False}}


class ScheduledReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduledReport
        fields = [
            "id",
            "name",
            "report_type",
            "frequency",
            "delivery",
            "recipient_user_ids",
            "recipient_role_ids",
            "recipient_emails",
            "is_active",
            "last_run_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "last_run_at", "created_at", "updated_at"]


class EmailTemplateViewSet(viewsets.ModelViewSet):
    module_permission = "emails"
    permission_classes = [IsAuthenticated, HasModulePermission]
    serializer_class = EmailTemplateSerializer

    def get_queryset(self):
        org = self.request.user.organization
        if org:
            return EmailTemplate.objects.filter(Q(organization=org) | Q(organization__isnull=True))
        return EmailTemplate.objects.filter(organization__isnull=True)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.user.organization)


class EmailQueueViewSet(viewsets.ReadOnlyModelViewSet):
    module_permission = "emails"
    permission_classes = [IsAuthenticated, HasModulePermission]
    serializer_class = EmailQueueSerializer

    def get_queryset(self):
        qs = EmailQueue.objects.all()
        if self.request.user.organization_id:
            qs = qs.filter(organization=self.request.user.organization)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=["post"])
    def retry(self, request, pk=None):
        item = self.get_object()
        item.status = EmailQueue.Status.RETRY
        item.save(update_fields=["status", "updated_at"])
        process_queue_item(item)
        return Response({"success": True, "data": EmailQueueSerializer(item).data})

    @action(detail=False, methods=["post"])
    def process(self, request):
        if not request.user.is_superuser:
            return Response({"success": False, "error": "Super Admin required."}, status=403)
        results = process_pending_emails()
        return Response({"success": True, "data": results})


class EmailLogViewSet(viewsets.ReadOnlyModelViewSet):
    module_permission = "emails"
    permission_classes = [IsAuthenticated, HasModulePermission]
    serializer_class = EmailLogSerializer

    def get_queryset(self):
        qs = EmailLog.objects.all()
        if self.request.user.organization_id:
            qs = qs.filter(organization=self.request.user.organization)
        return qs


class EmailProviderConfigViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsSuperAdmin]

    def list(self, request):
        org = request.user.organization
        if not org:
            return Response({"success": True, "data": None})
        config, _ = EmailProviderConfig.objects.get_or_create(organization=org)
        return Response(
            {"success": True, "data": EmailProviderConfigSerializer(config).data}
        )

    def create(self, request):
        org = request.user.organization
        if not org:
            return Response({"success": False, "error": "No organization."}, status=400)
        config, _ = EmailProviderConfig.objects.get_or_create(organization=org)
        serializer = EmailProviderConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "data": serializer.data})

    def partial_update(self, request, pk=None):
        return self.create(request)


class ScheduledReportViewSet(viewsets.ModelViewSet):
    module_permission = "reports"
    action_permission_map = {
        "list": "view",
        "retrieve": "view",
        "create": "manage",
        "update": "manage",
        "partial_update": "manage",
        "destroy": "manage",
        "run_now": "manage",
    }
    permission_classes = [IsAuthenticated, HasModulePermission]
    serializer_class = ScheduledReportSerializer

    def perform_create(self, serializer):
        from accounts.services import ensure_default_organization

        org = self.request.user.organization
        if not org and self.request.user.is_superuser:
            org = ensure_default_organization()
            self.request.user.organization = org
            self.request.user.save(update_fields=["organization"])
        serializer.save(
            organization=org,
            created_by=self.request.user,
        )

    def get_queryset(self):
        user = self.request.user
        if user.organization_id:
            return ScheduledReport.objects.filter(organization=user.organization)
        if user.is_superuser:
            return ScheduledReport.objects.all()
        return ScheduledReport.objects.none()

    @action(detail=True, methods=["post"])
    def run_now(self, request, pk=None):
        from emails.tasks import _deliver_report
        from django.utils import timezone

        report = self.get_object()
        _deliver_report(report)
        report.last_run_at = timezone.now()
        report.save(update_fields=["last_run_at", "updated_at"])
        return Response(
            {"success": True, "data": ScheduledReportSerializer(report).data}
        )
