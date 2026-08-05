from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Role, RolePermission, User, UserPermissionOverride
from accounts.permissions_catalog import catalog_as_list
from accounts.serializers import (
    InviteUserSerializer,
    PermissionMatrixSerializer,
    RolePermissionSerializer,
    RoleSerializer,
    UserListSerializer,
    UserPermissionOverrideSerializer,
    UserSerializer,
)
from accounts.services import invite_user
from activity.services import record_activity
from audit.services import log_activity
from core.permissions import HasModulePermission, IsSuperAdmin


class UserViewSet(viewsets.ModelViewSet):
    module_permission = "users"
    action_permission_map = {
        "list": "view",
        "retrieve": "view",
        "create": "create",
        "update": "edit",
        "partial_update": "edit",
        "destroy": "delete",
        "invite": "create",
        "suspend": "manage",
        "activate": "manage",
        "deactivate": "manage",
        "archive": "manage",
        "resend_verification": "manage",
        "overrides": "view",
        "set_roles": "manage",
    }
    permission_classes = [IsAuthenticated, HasModulePermission]
    filterset_classes = None
    filterset_fields = ["status", "roles__name"]
    search_fields = ["email", "first_name", "last_name", "phone"]
    ordering_fields = ["email", "date_joined", "last_login", "status"]

    def get_queryset(self):
        qs = User.objects.prefetch_related("roles").filter(is_superuser=False)
        user = self.request.user
        if user.is_superuser:
            if user.organization_id:
                return qs.filter(
                    Q(organization=user.organization) | Q(organization__isnull=True)
                )
            return qs
        return qs.filter(organization=user.organization)

    def get_serializer_class(self):
        if self.action == "list":
            return UserListSerializer
        return UserSerializer

    def perform_update(self, serializer):
        before = {
            "first_name": serializer.instance.first_name,
            "last_name": serializer.instance.last_name,
            "status": serializer.instance.status,
            "roles": list(serializer.instance.roles.values_list("id", flat=True)),
        }
        user = serializer.save()
        log_activity(
            user=self.request.user,
            action="Update",
            entity_type="User",
            entity_id=user.id,
            entity_name=user.email,
            before=before,
            after={
                "first_name": user.first_name,
                "last_name": user.last_name,
                "status": user.status,
                "roles": list(user.roles.values_list("id", flat=True)),
            },
            request=self.request,
        )
        record_activity(
            organization=self.request.user.organization,
            user=self.request.user,
            event_type="role_updated",
            title=f"Updated user {user.email}",
            entity_type="User",
            entity_id=user.id,
        )

    def perform_destroy(self, instance):
        instance.status = User.Status.ARCHIVED
        instance.is_active = False
        instance.save(update_fields=["status", "is_active"])

    @action(detail=False, methods=["post"])
    def invite(self, request):
        serializer = InviteUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if User.objects.filter(email__iexact=data["email"]).exists():
            return Response(
                {"success": False, "error": "A user with this email already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        role = None
        role_id = data.get("role_id")
        if role_id:
            role = Role.objects.filter(id=role_id).first()
            if not role:
                return Response(
                    {"success": False, "error": "Role not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        from accounts.services import ensure_default_organization

        org = request.user.organization
        if not org and request.user.is_superuser:
            org = ensure_default_organization()
            request.user.organization = org
            request.user.status = User.Status.ACTIVE
            request.user.save(update_fields=["organization", "status"])

        user = invite_user(
            email=data["email"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            phone=data.get("phone", ""),
            address=data.get("address", ""),
            role=role,
            invited_by=request.user,
            organization=org,
        )
        log_activity(
            user=request.user,
            action="Invite",
            entity_type="User",
            entity_id=user.id,
            entity_name=user.email,
            after={"email": user.email, "status": user.status},
            request=request,
        )
        return Response(
            {"success": True, "data": UserSerializer(user).data},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def suspend(self, request, pk=None):
        user = self.get_object()
        user.status = User.Status.SUSPENDED
        user.save(update_fields=["status"])
        return Response({"success": True, "data": UserSerializer(user).data})

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.status = User.Status.ACTIVE
        user.is_active = True
        user.save(update_fields=["status", "is_active"])
        return Response({"success": True, "data": UserSerializer(user).data})

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.status = User.Status.INACTIVE
        user.save(update_fields=["status"])
        return Response({"success": True, "data": UserSerializer(user).data})

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        user = self.get_object()
        user.status = User.Status.ARCHIVED
        user.is_active = False
        user.save(update_fields=["status", "is_active"])
        return Response({"success": True, "data": UserSerializer(user).data})

    @action(detail=True, methods=["post"])
    def resend_verification(self, request, pk=None):
        from accounts.services import create_verification_token, get_frontend_url
        from emails.services import queue_email

        user = self.get_object()
        if user.status not in (
            User.Status.PENDING_VERIFICATION,
            User.Status.VERIFIED,
        ):
            return Response(
                {
                    "success": False,
                    "error": "Verification email can only be resent for pending/verified users.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        token = create_verification_token(user)
        if user.status != User.Status.PENDING_VERIFICATION:
            user.status = User.Status.PENDING_VERIFICATION
            user.save(update_fields=["status"])
        verify_url = f"{get_frontend_url()}/verify-email?token={token.token}"
        queue_email(
            recipient=user.email,
            template_key="verification",
            context={"name": user.display_name, "verify_url": verify_url},
            organization=user.organization,
        )
        return Response(
            {"success": True, "data": {"message": "Verification email queued."}}
        )

    @action(detail=True, methods=["post"])
    def set_roles(self, request, pk=None):
        user = self.get_object()
        role_ids = request.data.get("role_ids", [])
        roles = Role.objects.filter(id__in=role_ids)
        if request.user.organization_id:
            roles = roles.filter(organization=request.user.organization)
        user.roles.set(roles)
        record_activity(
            organization=request.user.organization,
            user=request.user,
            event_type="role_updated",
            title=f"Roles updated for {user.email}",
            entity_type="User",
            entity_id=user.id,
            metadata={"role_ids": list(roles.values_list("id", flat=True))},
        )
        return Response({"success": True, "data": UserSerializer(user).data})

    @action(detail=True, methods=["get", "put"])
    def overrides(self, request, pk=None):
        user = self.get_object()
        if request.method == "PUT":
            if not request.user.is_superuser and not request.user.has_module_permission(
                "users", "manage"
            ):
                return Response(
                    {"success": False, "error": "Manage permission required."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        if request.method == "GET":
            data = UserPermissionOverrideSerializer(
                user.permission_overrides.all(), many=True
            ).data
            return Response({"success": True, "data": data})

        serializer = PermissionMatrixSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.permission_overrides.all().delete()
        created = []
        for item in serializer.validated_data["permissions"]:
            ov = UserPermissionOverride.objects.create(
                user=user,
                module=item["module"],
                action=item["action"],
                allowed=item.get("allowed", True),
                reason=item.get("reason", ""),
                created_by=request.user,
            )
            created.append(ov)
        record_activity(
            organization=request.user.organization,
            user=request.user,
            event_type="permission_changed",
            title=f"Permission overrides updated for {user.email}",
            entity_type="User",
            entity_id=user.id,
        )
        log_activity(
            user=request.user,
            action="Permission Override",
            entity_type="User",
            entity_id=user.id,
            entity_name=user.email,
            after={"overrides": serializer.validated_data["permissions"]},
            request=request,
        )
        return Response(
            {
                "success": True,
                "data": UserPermissionOverrideSerializer(created, many=True).data,
            }
        )


class RoleViewSet(viewsets.ModelViewSet):
    module_permission = "roles"
    action_permission_map = {
        "list": "view",
        "retrieve": "view",
        "create": "create",
        "update": "edit",
        "partial_update": "edit",
        "destroy": "delete",
        "clone": "create",
        "members": "view",
        "assign_members": "manage",
        "permissions": "view",
    }
    permission_classes = [IsAuthenticated, HasModulePermission]
    serializer_class = RoleSerializer
    search_fields = ["name", "description"]

    def get_queryset(self):
        user = self.request.user
        qs = Role.objects.all()
        if user.is_superuser and not user.organization_id:
            return qs
        return qs.filter(organization=user.organization)

    def perform_create(self, serializer):
        from accounts.services import ensure_default_organization

        org = self.request.user.organization
        if not org and self.request.user.is_superuser:
            org = ensure_default_organization()
            self.request.user.organization = org
            self.request.user.save(update_fields=["organization"])
        serializer.save(organization=org, is_system=False)

    def perform_update(self, serializer):
        role = serializer.instance
        if role.is_system and "name" in serializer.validated_data:
            if serializer.validated_data["name"] != role.name:
                from rest_framework.exceptions import ValidationError

                raise ValidationError({"name": "System role names cannot be changed."})
        serializer.save()
        record_activity(
            organization=self.request.user.organization,
            user=self.request.user,
            event_type="role_updated",
            title=f"Updated role {role.name}",
            entity_type="Role",
            entity_id=role.id,
        )

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()
        if role.is_system:
            return Response(
                {"success": False, "error": "System roles cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def clone(self, request, pk=None):
        role = self.get_object()
        new_name = request.data.get("name")
        cloned = role.clone(new_name=new_name)
        record_activity(
            organization=request.user.organization,
            user=request.user,
            event_type="role_updated",
            title=f"Cloned role {role.name} → {cloned.name}",
            entity_type="Role",
            entity_id=cloned.id,
        )
        return Response(
            {"success": True, "data": RoleSerializer(cloned).data},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        role = self.get_object()
        users = role.users.all()
        return Response(
            {"success": True, "data": UserListSerializer(users, many=True).data}
        )

    @action(detail=True, methods=["post"])
    def assign_members(self, request, pk=None):
        role = self.get_object()
        user_ids = request.data.get("user_ids", [])
        users_qs = User.objects.filter(id__in=user_ids, is_superuser=False)
        if request.user.organization_id:
            users_qs = users_qs.filter(organization=request.user.organization)
        users = users_qs
        role.users.set(users)
        record_activity(
            organization=request.user.organization,
            user=request.user,
            event_type="role_updated",
            title=f"Updated members for role {role.name}",
            entity_type="Role",
            entity_id=role.id,
            metadata={"user_ids": list(users.values_list("id", flat=True))},
        )
        return Response(
            {"success": True, "data": UserListSerializer(role.users.all(), many=True).data}
        )

    @action(detail=True, methods=["get", "put"])
    def permissions(self, request, pk=None):
        role = self.get_object()
        if request.method == "PUT":
            if not request.user.is_superuser and not request.user.has_module_permission(
                "roles", "manage"
            ):
                return Response(
                    {"success": False, "error": "Manage permission required."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        if request.method == "GET":
            perms = role.permissions.all()
            return Response(
                {"success": True, "data": RolePermissionSerializer(perms, many=True).data}
            )

        serializer = PermissionMatrixSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        before = list(role.permissions.values("module", "action", "allowed"))
        role.permissions.all().delete()
        created = []
        for item in serializer.validated_data["permissions"]:
            if not item.get("allowed", True):
                continue
            rp = RolePermission.objects.create(
                role=role,
                module=item["module"],
                action=item["action"],
                allowed=True,
            )
            created.append(rp)
        after = list(role.permissions.values("module", "action", "allowed"))
        record_activity(
            organization=request.user.organization,
            user=request.user,
            event_type="permission_changed",
            title=f"Permissions updated for role {role.name}",
            entity_type="Role",
            entity_id=role.id,
        )
        log_activity(
            user=request.user,
            action="Permission Change",
            entity_type="Role",
            entity_id=role.id,
            entity_name=role.name,
            before=before,
            after=after,
            request=request,
        )
        return Response(
            {"success": True, "data": RolePermissionSerializer(created, many=True).data}
        )


class PermissionCatalogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"success": True, "data": catalog_as_list()})
