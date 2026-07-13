from rest_framework import serializers



from accounts.models import User

from core.models import OrganizationSettings





class UserSerializer(serializers.ModelSerializer):

    display_name = serializers.CharField(read_only=True)



    class Meta:

        model = User

        fields = [

            "id",

            "email",

            "username",

            "first_name",

            "last_name",

            "display_name",

            "role",

            "department",

            "organization",

            "last_login",

        ]

        read_only_fields = ["id", "organization", "last_login"]





class LoginSerializer(serializers.Serializer):

    email = serializers.EmailField()

    password = serializers.CharField(write_only=True)





class OrganizationSettingsSerializer(serializers.ModelSerializer):

    class Meta:

        model = OrganizationSettings

        fields = [

            "id",

            "default_minimum_level",

            "default_reorder_level",

            "enable_predictive_alerts",

            "enable_email_notifications",

            "forecast_model",

            "forecast_horizon_days",

            "company_name",

            "company_address",

            "currency_code",

            "updated_at",

        ]

        read_only_fields = ["id", "updated_at"]

