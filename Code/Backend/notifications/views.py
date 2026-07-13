from django_filters.rest_framework import DjangoFilterBackend

from rest_framework import status, viewsets

from rest_framework.decorators import action

from rest_framework.response import Response



from core.permissions import IsOrganizationMember

from notifications.models import Notification

from notifications.serializers import NotificationSerializer





class NotificationViewSet(viewsets.ModelViewSet):

    serializer_class = NotificationSerializer

    permission_classes = [IsOrganizationMember]

    filter_backends = [DjangoFilterBackend]

    filterset_fields = ["notification_type", "severity", "is_read"]

    http_method_names = ["get", "patch", "head", "options", "post"]



    def get_queryset(self):

        return Notification.objects.filter(

            organization=self.request.user.organization

        )



    @action(detail=True, methods=["post"])

    def mark_read(self, request, pk=None):

        notification = self.get_object()

        notification.is_read = True

        notification.save(update_fields=["is_read"])

        return Response({"success": True, "data": NotificationSerializer(notification).data})



    @action(detail=False, methods=["post"])

    def mark_all_read(self, request):

        updated = self.get_queryset().filter(is_read=False).update(is_read=True)

        return Response({"success": True, "data": {"updated": updated}})



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

        return Response({"success": True, "data": NotificationSerializer(notification).data})

