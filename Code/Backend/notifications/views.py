from django.db.models import Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.permissions import HasModulePermission
from notifications.models import DeviceToken, Notification
from notifications.serializers import NotificationSerializer


class DeviceTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeviceToken
        fields = ["id", "token", "platform", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    module_permission = "notifications"
    permission_classes = [HasModulePermission]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["notification_type", "severity", "is_read", "priority", "channel"]
    http_method_names = ["get", "patch", "head", "options", "post"]

    def get_queryset(self):
        user = self.request.user
        org = user.organization
        qs = Notification.objects.all()
        if org:
            qs = qs.filter(organization=org)
        # User sees own notifications + org-wide (user is null)
        qs = qs.filter(Q(user=user) | Q(user__isnull=True))
        # Hide expired unless explicitly requested
        if self.request.query_params.get("include_expired") != "1":
            qs = qs.filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now()))
        return qs.order_by("-created_at")

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=["is_read"])
        return Response(
            {"success": True, "data": NotificationSerializer(notification).data}
        )

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({"success": True, "data": {"updated": updated}})

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"success": True, "data": {"count": count}})

    def create(self, request, *args, **kwargs):
        return Response(
            {"success": False, "error": "Notifications are system-generated."},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )

    def partial_update(self, request, *args, **kwargs):
        notification = self.get_object()
        if "is_read" in request.data:
            notification.is_read = request.data["is_read"]
            notification.save(update_fields=["is_read"])
        return Response(
            {"success": True, "data": NotificationSerializer(notification).data}
        )


class DeviceTokenViewSet(viewsets.ModelViewSet):
    serializer_class = DeviceTokenSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        return DeviceToken.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        token = request.data.get("token")
        platform = request.data.get("platform", "web")
        if not token:
            return Response(
                {"success": False, "error": "token is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        obj, _ = DeviceToken.objects.update_or_create(
            user=request.user,
            token=token,
            defaults={"platform": platform, "is_active": True},
        )
        return Response(
            {"success": True, "data": DeviceTokenSerializer(obj).data},
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        obj.is_active = False
        obj.save(update_fields=["is_active", "updated_at"])
        return Response({"success": True, "data": {"message": "Device unregistered."}})
