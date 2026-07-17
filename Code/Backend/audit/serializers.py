from rest_framework import serializers



from audit.models import ActivityLog





class ActivityLogSerializer(serializers.ModelSerializer):

    user_name = serializers.CharField(source="user.display_name", read_only=True)

    user_role = serializers.SerializerMethodField()

    def get_user_role(self, obj):
        return obj.user.primary_role_name() if obj.user_id else None



    class Meta:

        model = ActivityLog

        fields = [

            "id",

            "user",

            "user_name",

            "user_role",

            "entity_type",

            "entity_id",

            "entity_name",

            "action",

            "before_json",

            "after_json",

            "details",

            "ip_address",

            "created_at",

        ]

        read_only_fields = fields

