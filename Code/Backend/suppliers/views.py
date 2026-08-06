from rest_framework import filters



from core.mixins import OrganizationScopedViewSet

from core.permissions import HasModulePermission

from suppliers.models import Supplier

from suppliers.serializers import SupplierSerializer





class SupplierViewSet(OrganizationScopedViewSet):

    queryset = Supplier.objects.all()

    serializer_class = SupplierSerializer

    pagination_class = None

    module_permission = "suppliers"
    permission_classes = [HasModulePermission]

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]

    search_fields = ["name", "email", "contact_name"]

    ordering_fields = ["name", "lead_time_days"]

