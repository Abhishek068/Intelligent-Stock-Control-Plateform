from django_filters.rest_framework import DjangoFilterBackend

from rest_framework import viewsets



from core.permissions import IsOrganizationMember, IsReadOnlyOrElevated

from stock.models import StockAdjustment, StockInTransaction, StockOutTransaction, StockTransfer

from stock.serializers import (

    StockAdjustmentSerializer,

    StockInSerializer,

    StockOutSerializer,

    StockTransferSerializer,

)





class StockInViewSet(viewsets.ModelViewSet):

    serializer_class = StockInSerializer

    permission_classes = [IsOrganizationMember]

    filter_backends = [DjangoFilterBackend]

    filterset_fields = ["product", "supplier", "location"]

    http_method_names = ["get", "post", "head", "options"]



    def get_queryset(self):

        return StockInTransaction.objects.filter(

            product__organization=self.request.user.organization

        ).select_related("product", "supplier", "location", "created_by")





class StockOutViewSet(viewsets.ModelViewSet):

    serializer_class = StockOutSerializer

    permission_classes = [IsOrganizationMember]

    filter_backends = [DjangoFilterBackend]

    filterset_fields = ["product", "location"]

    http_method_names = ["get", "post", "head", "options"]



    def get_queryset(self):

        return StockOutTransaction.objects.filter(

            product__organization=self.request.user.organization

        ).select_related("product", "location", "created_by")





class StockAdjustmentViewSet(viewsets.ModelViewSet):

    serializer_class = StockAdjustmentSerializer

    permission_classes = [IsReadOnlyOrElevated]

    filter_backends = [DjangoFilterBackend]

    filterset_fields = ["product", "location"]

    http_method_names = ["get", "post", "head", "options"]



    def get_queryset(self):

        return StockAdjustment.objects.filter(

            product__organization=self.request.user.organization

        ).select_related("product", "location", "created_by")





class StockTransferViewSet(viewsets.ModelViewSet):

    serializer_class = StockTransferSerializer

    permission_classes = [IsReadOnlyOrElevated]

    filter_backends = [DjangoFilterBackend]

    filterset_fields = ["product", "status"]

    http_method_names = ["get", "post", "head", "options"]



    def get_queryset(self):

        return StockTransfer.objects.filter(

            product__organization=self.request.user.organization

        ).select_related(

            "product", "source_location", "destination_location", "created_by"

        )

