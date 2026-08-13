from rest_framework import filters, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.mixins import OrganizationScopedViewSet
from core.permissions import HasModulePermission
from inventory.models import Location
from procurement.models import PurchaseOrder
from suppliers.models import Supplier
from suppliers.risk_prediction_service import SupplierRiskPredictionService
from suppliers.serializers import PredictSupplierRiskSerializer, SupplierSerializer


class SupplierViewSet(OrganizationScopedViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    pagination_class = None
    module_permission = "suppliers"
    permission_classes = [HasModulePermission]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "email", "contact_name"]
    ordering_fields = ["name", "lead_time_days"]

    @action(detail=True, methods=["get"], url_path="scorecard")
    def scorecard(self, request, pk=None):
        supplier = self.get_object()

        rel = float(supplier.delivery_reliability or 90.0)
        acc = float(supplier.order_accuracy or 90.0)
        perf = float(supplier.performance_score or 90.0)

        if perf >= 90:
            grade = "A+"
            grade_color = "emerald"
        elif perf >= 80:
            grade = "B"
            grade_color = "blue"
        elif perf >= 70:
            grade = "C"
            grade_color = "amber"
        else:
            grade = "D"
            grade_color = "red"

        lt_info = SupplierRiskPredictionService.predict_actual_lead_time(supplier)

        total_orders = PurchaseOrder.objects.filter(supplier=supplier).count()
        completed_orders = PurchaseOrder.objects.filter(supplier=supplier, status=PurchaseOrder.Status.RECEIVED).count()

        return Response({
            "success": True,
            "data": {
                "supplier_name": supplier.name,
                "grade": grade,
                "grade_color": grade_color,
                "performance_score": perf,
                "delivery_reliability": rel,
                "order_accuracy": acc,
                "defect_rate": round(100.0 - acc, 1),
                "total_orders": total_orders,
                "completed_orders": completed_orders,
                "lead_time_info": lt_info,
                "breakdown": supplier.performance_breakdown or {},
            }
        })

    @action(detail=False, methods=["post"], url_path="bulk-import")
    def bulk_import(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response({"success": False, "error": "No CSV file uploaded"}, status=400)

        import csv
        import io

        try:
            decoded_file = file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)

            created_count = 0
            org = request.user.organization

            for row in reader:
                name = row.get("name") or row.get("Name")
                if name:
                    Supplier.objects.get_or_create(
                        organization=org,
                        name=name.strip(),
                        defaults={
                            "contact_name": row.get("contact_name", ""),
                            "email": row.get("email", ""),
                            "phone": row.get("phone", ""),
                            "lead_time_days": int(row.get("lead_time_days", 7) or 7),
                        }
                    )
                    created_count += 1

            return Response({"success": True, "data": {"imported_count": created_count}})
        except Exception as e:
            return Response({"success": False, "error": f"Failed to parse CSV: {str(e)}"}, status=400)


    @action(detail=False, methods=["post"], url_path="predict-risk")
    def predict_risk(self, request):
        serializer = PredictSupplierRiskSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        org = request.user.organization
        try:
            supplier = Supplier.objects.get(id=serializer.validated_data["supplier"], organization=org)
        except Supplier.DoesNotExist:
            return Response({"supplier": "Supplier not found."}, status=status.HTTP_404_NOT_FOUND)

        location = None
        loc_id = serializer.validated_data.get("location")
        if loc_id:
            location = Location.objects.filter(id=loc_id, organization=org).first()

        res = SupplierRiskPredictionService.predict_po_risk(
            supplier=supplier,
            total_volume=serializer.validated_data.get("total_volume", 1),
            total_amount=serializer.validated_data.get("total_amount", 0.0),
            expected_delivery=serializer.validated_data.get("expected_delivery"),
            location=location,
        )
        return Response({"success": True, "data": res})

    @action(detail=True, methods=["get"], url_path="risk-analytics")
    def risk_analytics(self, request, pk=None):
        supplier = self.get_object()
        pos = PurchaseOrder.objects.filter(supplier=supplier).order_by("-created_at")[:20]
        recent_orders = [
            {
                "id": po.id,
                "po_number": po.po_number,
                "status": po.status,
                "delay_probability": float(po.delay_probability),
                "risk_score": float(po.risk_score),
                "risk_level": po.risk_level,
                "created_at": po.created_at.isoformat(),
            }
            for po in pos
        ]
        prediction = SupplierRiskPredictionService.predict_po_risk(
            supplier=supplier,
            total_volume=100,
            total_amount=5000.0,
        )
        return Response({
            "success": True,
            "data": {
                "supplier_id": supplier.id,
                "supplier_name": supplier.name,
                "lead_time_days": supplier.lead_time_days,
                "delivery_reliability": float(supplier.delivery_reliability),
                "order_accuracy": float(supplier.order_accuracy),
                "current_risk_assessment": prediction,
                "recent_orders": recent_orders,
            }
        })

