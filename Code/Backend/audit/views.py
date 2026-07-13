from django_filters.rest_framework import DjangoFilterBackend

from rest_framework import filters, viewsets

from rest_framework.decorators import action

from rest_framework.response import Response



from audit.models import ActivityLog

from audit.serializers import ActivityLogSerializer

from core.permissions import IsManagerOrAdmin





class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):

    serializer_class = ActivityLogSerializer

    permission_classes = [IsManagerOrAdmin]

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    filterset_fields = ["entity_type", "action", "user"]

    search_fields = ["entity_name", "details", "action"]

    ordering_fields = ["created_at"]



    def get_queryset(self):

        return ActivityLog.objects.filter(

            user__organization=self.request.user.organization

        ).select_related("user")



    @action(detail=False, methods=["get"])

    def export(self, request):

        logs = self.filter_queryset(self.get_queryset())[:1000]

        data = ActivityLogSerializer(logs, many=True).data

        return Response({"success": True, "data": data})

