from rest_framework import serializers

from notifications.models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "severity",
            "channel",
            "priority",
            "related_entity_type",
            "related_entity_id",
            "explanation_json",
            "is_read",
            "expires_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
