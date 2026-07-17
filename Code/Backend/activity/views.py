from django.db.models import Q
from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from activity.models import ActivityEvent
from core.permissions import IsOrganizationMember


class ActivityEventSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True, default=None)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = ActivityEvent
        fields = [
            "id",
            "event_type",
            "title",
            "description",
            "entity_type",
            "entity_id",
            "metadata",
            "user",
            "user_email",
            "user_name",
            "created_at",
        ]

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.display_name
        return None


class ActivityEventViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    serializer_class = ActivityEventSerializer
    filterset_fields = ["event_type"]
    search_fields = ["title", "description"]

    def get_queryset(self):
        qs = ActivityEvent.objects.select_related("user")
        user = self.request.user
        if user.is_superuser and not user.organization_id:
            return qs
        return qs.filter(organization=user.organization)


class AdminDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from accounts.models import Role, User
        from emails.models import EmailQueue, ScheduledReport
        from inventory.models import Category, InventoryBalance, Product
        from notifications.models import Notification
        from suppliers.models import Supplier

        user = request.user
        if not user.is_superuser and not user.has_module_permission("dashboard", "view"):
            return Response({"success": False, "error": "Permission denied."}, status=403)

        org = user.organization
        users_qs = User.objects.filter(is_superuser=False)
        if org:
            users_qs = users_qs.filter(organization=org)

        products_qs = Product.objects.all()
        if org:
            products_qs = products_qs.filter(organization=org)

        balances = InventoryBalance.objects.filter(product__in=products_qs)
        low_stock = 0
        out_of_stock = 0
        inventory_value = 0.0
        for b in balances.select_related("product"):
            qty = b.quantity_on_hand
            inventory_value += float(b.product.unit_price or 0) * qty
            if qty <= 0:
                out_of_stock += 1
            elif qty <= (b.product.minimum_level or 0):
                low_stock += 1

        email_qs = EmailQueue.objects.all()
        notif_qs = Notification.objects.all()
        activity_qs = ActivityEvent.objects.all()
        roles_qs = Role.objects.all()
        sched_qs = ScheduledReport.objects.all()
        categories_qs = Category.objects.all()
        suppliers_qs = Supplier.objects.all()
        if org:
            email_qs = email_qs.filter(organization=org)
            notif_qs = notif_qs.filter(organization=org)
            activity_qs = activity_qs.filter(organization=org)
            roles_qs = roles_qs.filter(organization=org)
            sched_qs = sched_qs.filter(organization=org)
            categories_qs = categories_qs.filter(organization=org)
            suppliers_qs = suppliers_qs.filter(organization=org)

        managers = users_qs.filter(roles__name__iexact="Manager").distinct().count()
        staff = users_qs.filter(roles__name__iexact="Staff").distinct().count()

        data = {
            "users": {
                "total": users_qs.count(),
                "managers": managers,
                "staff": staff,
                "pending_verification": users_qs.filter(
                    status=User.Status.PENDING_VERIFICATION
                ).count(),
                "inactive": users_qs.filter(status=User.Status.INACTIVE).count(),
                "suspended": users_qs.filter(status=User.Status.SUSPENDED).count(),
                "active": users_qs.filter(status=User.Status.ACTIVE).count(),
            },
            "roles": {"total": roles_qs.count()},
            "recent_invitations": list(
                users_qs.filter(invited_by__isnull=False)
                .order_by("-date_joined")[:5]
                .values("id", "email", "status", "date_joined")
            ),
            "emails": {
                "queued": email_qs.filter(status=EmailQueue.Status.QUEUED).count(),
                "processing": email_qs.filter(status=EmailQueue.Status.PROCESSING).count(),
                "sent": email_qs.filter(status=EmailQueue.Status.SENT).count(),
                "failed": email_qs.filter(status=EmailQueue.Status.FAILED).count(),
                "retry": email_qs.filter(status=EmailQueue.Status.RETRY).count(),
            },
            "notifications": {
                "unread": notif_qs.filter(is_read=False).count(),
                "total": notif_qs.count(),
            },
            "scheduled_reports": {
                "active": sched_qs.filter(is_active=True).count(),
                "total": sched_qs.count(),
            },
            "inventory": {
                "products": products_qs.count(),
                "categories": categories_qs.count(),
                "suppliers": suppliers_qs.count(),
                "inventory_value": round(inventory_value, 2),
                "low_stock": low_stock,
                "out_of_stock": out_of_stock,
            },
            "activity": ActivityEventSerializer(
                activity_qs.select_related("user")[:15], many=True
            ).data,
            "is_superuser": user.is_superuser,
        }
        return Response({"success": True, "data": data})


class GlobalSearchView(APIView):
    permission_classes = [IsAuthenticated, IsOrganizationMember]

    def get(self, request):
        from accounts.models import User
        from inventory.models import Product
        from suppliers.models import Supplier

        q = (request.query_params.get("q") or "").strip()
        if len(q) < 2:
            return Response({"success": True, "data": {"results": []}})

        org = request.user.organization
        results = []

        product_filter = Q(name__icontains=q) | Q(sku__icontains=q) | Q(barcode__icontains=q)
        products = Product.objects.filter(product_filter)
        if org:
            products = products.filter(organization=org)
        for p in products[:10]:
            results.append(
                {
                    "type": "product",
                    "id": p.id,
                    "title": p.name,
                    "subtitle": p.sku,
                    "url": f"/products/{p.id}",
                }
            )

        suppliers = Supplier.objects.filter(name__icontains=q)
        if org:
            suppliers = suppliers.filter(organization=org)
        for s in suppliers[:8]:
            results.append(
                {
                    "type": "supplier",
                    "id": s.id,
                    "title": s.name,
                    "subtitle": s.email or "",
                    "url": "/suppliers",
                }
            )

        if request.user.is_superuser or request.user.has_module_permission("users", "view"):
            users = User.objects.filter(
                Q(email__icontains=q)
                | Q(first_name__icontains=q)
                | Q(last_name__icontains=q),
                is_superuser=False,
            )
            if org:
                users = users.filter(organization=org)
            for u in users[:8]:
                results.append(
                    {
                        "type": "user",
                        "id": u.id,
                        "title": u.display_name,
                        "subtitle": u.email,
                        "url": "/users",
                    }
                )

        return Response({"success": True, "data": {"results": results, "query": q}})
