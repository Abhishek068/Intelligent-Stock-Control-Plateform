from rest_framework import permissions





class IsOrganizationMember(permissions.BasePermission):

    def has_permission(self, request, view):

        return (

            request.user

            and request.user.is_authenticated

            and hasattr(request.user, "organization_id")

            and request.user.organization_id is not None

        )





class IsAdminRole(permissions.BasePermission):

    message = "Admin role required."



    def has_permission(self, request, view):

        return (

            IsOrganizationMember().has_permission(request, view)

            and request.user.role == "admin"

        )





class IsManagerOrAdmin(permissions.BasePermission):

    message = "Manager or Admin role required."



    def has_permission(self, request, view):

        return (

            IsOrganizationMember().has_permission(request, view)

            and request.user.role in ("admin", "manager")

        )





class IsReadOnlyOrElevated(permissions.BasePermission):

                                                  



    def has_permission(self, request, view):

        if not IsOrganizationMember().has_permission(request, view):

            return False

        if request.method in permissions.SAFE_METHODS:

            return True

        return request.user.role in ("admin", "manager")

