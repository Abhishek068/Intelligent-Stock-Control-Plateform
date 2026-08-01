from datetime import timedelta

from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import PasswordResetToken, User
from accounts.serializers import (
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    ResetPasswordSerializer,
    UserSerializer,
    VerifyEmailSerializer,
)
from accounts.services import (
    clear_failed_logins,
    complete_email_verification,
    create_reset_token,
    get_org_settings,
    register_failed_login,
    validate_password_policy,
)
from activity.services import record_activity
from audit.services import get_client_ip, log_activity
from emails.services import queue_email


def _tokens_for_user(user, remember_me=False):
    refresh = RefreshToken.for_user(user)
    settings_obj = get_org_settings(user)
    if remember_me:
        days = settings_obj.remember_me_days if settings_obj else 30
        refresh.set_exp(lifetime=timedelta(days=days))
    return refresh


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"].lower().strip()
        password = serializer.validated_data["password"]
        remember_me = serializer.validated_data.get("remember_me", False)

        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"success": False, "error": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if user_obj.is_locked:
            return Response(
                {
                    "success": False,
                    "error": "Account is temporarily locked due to too many failed login attempts.",
                },
                status=status.HTTP_423_LOCKED,
            )

        if user_obj.status in (
            User.Status.SUSPENDED,
            User.Status.ARCHIVED,
            User.Status.INACTIVE,
        ):
            return Response(
                {"success": False, "error": f"Account is {user_obj.status}."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if user_obj.status == User.Status.PENDING_VERIFICATION:
            return Response(
                {
                    "success": False,
                    "error": "Please verify your email before logging in.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        user = authenticate(request, username=email, password=password)
        if user is None:
            if not user_obj.check_password(password):
                register_failed_login(user_obj)
                return Response(
                    {"success": False, "error": "Invalid email or password."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            user = user_obj

        if not user.is_active:
            return Response(
                {"success": False, "error": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        clear_failed_logins(user)
        user.last_login_ip = get_client_ip(request)
        user.save(update_fields=["last_login_ip"])

        refresh = _tokens_for_user(user, remember_me=remember_me)
        log_activity(
            user=user,
            action="Login",
            entity_type="User",
            entity_id=user.id,
            entity_name=user.display_name,
            request=request,
        )
        record_activity(
            organization=user.organization,
            user=user,
            event_type="user_login",
            title=f"{user.display_name} logged in",
            entity_type="User",
            entity_id=user.id,
        )

        return Response(
            {
                "success": True,
                "data": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "remember_me": remember_me,
                    "user": UserSerializer(user).data,
                },
            }
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"success": True, "data": UserSerializer(request.user).data})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception:
                pass
        log_activity(
            user=request.user,
            action="Logout",
            entity_type="User",
            entity_id=request.user.id,
            entity_name=request.user.display_name,
            request=request,
        )
        record_activity(
            organization=request.user.organization,
            user=request.user,
            event_type="user_logout",
            title=f"{request.user.display_name} logged out",
            entity_type="User",
            entity_id=request.user.id,
        )
        return Response(
            {"success": True, "data": {"message": "Logged out successfully."}}
        )


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].lower().strip()

        try:
            user = User.objects.get(email=email)
            token = create_reset_token(user)
            from accounts.services import get_frontend_url

            reset_url = f"{get_frontend_url()}/reset-password?token={token.token}"
            queue_email(
                recipient=user.email,
                template_key="password_reset",
                context={"name": user.display_name, "reset_url": reset_url},
                organization=user.organization,
            )
        except User.DoesNotExist:
            pass

        return Response(
            {
                "success": True,
                "data": {
                    "message": "If an account exists for that email, a reset link has been sent."
                },
            }
        )


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token_str = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        try:
            token = PasswordResetToken.objects.select_related("user").get(token=token_str)
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"success": False, "error": "Invalid or expired reset token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not token.is_valid():
            return Response(
                {"success": False, "error": "Invalid or expired reset token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = token.user
        try:
            validate_password_policy(
                new_password, user=user, org_settings=get_org_settings(user)
            )
        except DjangoValidationError as exc:
            return Response(
                {"success": False, "error": " ".join(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.must_change_password = False
        if user.status == User.Status.VERIFIED:
            user.status = User.Status.ACTIVE
        user.save(update_fields=["password", "must_change_password", "status"])
        token.used_at = timezone.now()
        token.save(update_fields=["used_at"])

        queue_email(
            recipient=user.email,
            template_key="password_changed",
            context={"name": user.display_name},
            organization=user.organization,
        )
        record_activity(
            organization=user.organization,
            user=user,
            event_type="password_changed",
            title=f"Password reset for {user.email}",
            entity_type="User",
            entity_id=user.id,
        )
        return Response(
            {"success": True, "data": {"message": "Password has been reset."}}
        )


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        current = serializer.validated_data.get("current_password") or ""
        new_password = serializer.validated_data["new_password"]

        if not user.must_change_password:
            if not current or not user.check_password(current):
                return Response(
                    {"success": False, "error": "Current password is incorrect."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            validate_password_policy(
                new_password, user=user, org_settings=get_org_settings(user)
            )
        except DjangoValidationError as exc:
            return Response(
                {"success": False, "error": " ".join(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(new_password)
        user.must_change_password = False
        if user.status in (User.Status.VERIFIED, User.Status.PENDING_VERIFICATION):
            user.status = User.Status.ACTIVE
        user.save(update_fields=["password", "must_change_password", "status"])

        queue_email(
            recipient=user.email,
            template_key="password_changed",
            context={"name": user.display_name},
            organization=user.organization,
        )
        record_activity(
            organization=user.organization,
            user=user,
            event_type="password_changed",
            title=f"Password changed for {user.email}",
            entity_type="User",
            entity_id=user.id,
        )
        return Response(
            {"success": True, "data": {"message": "Password changed successfully.", "user": UserSerializer(user).data}}
        )


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = complete_email_verification(serializer.validated_data["token"])
        except Exception as exc:
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            {
                "success": True,
                "data": {
                    "message": "Email verified. A temporary password has been sent to your inbox.",
                    "email": user.email,
                },
            }
        )


class DebugPermsView(APIView):
    permission_classes = []

    def get(self, request):
        from accounts.models import User, Role, RolePermission, UserPermissionOverride
        staff_user = User.objects.filter(email="staff@stocksense.com").first()
        deleted_overrides = 0
        if staff_user:
            deleted_overrides, _ = UserPermissionOverride.objects.filter(user=staff_user).delete()
        user_perm_map = staff_user.permission_map() if staff_user else {}
        return Response({
            "deleted_overrides": deleted_overrides,
            "staff_user_perm_map": user_perm_map,
        })
