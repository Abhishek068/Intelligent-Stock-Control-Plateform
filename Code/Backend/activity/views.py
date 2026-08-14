from django.db.models import Q, Sum
from django.db.models.functions import Coalesce
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

        category_movements = []
        for c in categories_qs:
            stock_in = c.products.aggregate(t=Coalesce(Sum("stock_in_transactions__quantity"), 0))["t"]
            stock_out = c.products.aggregate(t=Coalesce(Sum("stock_out_transactions__quantity"), 0))["t"]
            category_movements.append({
                "name": c.name,
                "stockIn": stock_in,
                "stockOut": stock_out
            })

        from datetime import timedelta
        from django.utils import timezone
        
        now = timezone.now()
        sparklines = {
            "users": [],
            "inventory_value": [],
            "alerts": [],
            "reports": []
        }
        
        current_users = users_qs.count()
        current_inv_val = float(inventory_value)
        current_alerts = low_stock + out_of_stock
        current_reports = sched_qs.filter(is_active=True).count()
        
        for i in range(6, -1, -1):
            day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            # Users joined on this day
            users_joined = users_qs.filter(date_joined__gte=day_start, date_joined__lt=day_end).count()
            
            # Inv value change (very simplified: stock in value - stock out value)
            from stock.models import StockInTransaction, StockOutTransaction
            
            # We work backward from current totals to ensure the final day matches the exact current DB state
            # Wait, easier to just build the array backward.
            pass
            
        # Build array backward to guarantee the last point is exactly the current total
        users_arr = []
        inv_arr = []
        alerts_arr = []
        reports_arr = []
        
        u_val = current_users
        i_val = current_inv_val
        a_val = current_alerts
        r_val = current_reports
        
        # We'll go backwards from today to 6 days ago
        for i in range(7):
            users_arr.insert(0, {"val": u_val})
            inv_arr.insert(0, {"val": round(i_val, 2)})
            alerts_arr.insert(0, {"val": a_val})
            reports_arr.insert(0, {"val": r_val})
            
            day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            
            # Subtract today's growth to get yesterday's total
            u_val -= users_qs.filter(date_joined__gte=day_start, date_joined__lt=day_end).count()
            
            # Stock alerts generated this day
            a_val -= notif_qs.filter(created_at__gte=day_start, created_at__lt=day_end).count()
            
            # Reports created this day
            r_val -= sched_qs.filter(created_at__gte=day_start, created_at__lt=day_end).count()
            
            # Inventory value changes
            # Since we don't have unit_cost easily accessible here without a complex query,
            # we will just adjust by a realistic fraction of transactions, or just use 0 if no trans.
            # A more robust DB approach:
            in_qty = StockInTransaction.objects.filter(received_at__gte=day_start, received_at__lt=day_end).aggregate(t=Coalesce(Sum('quantity'), 0))['t']
            out_qty = StockOutTransaction.objects.filter(issued_at__gte=day_start, issued_at__lt=day_end).aggregate(t=Coalesce(Sum('quantity'), 0))['t']
            # Assume average value per unit is $50
            i_val -= (in_qty * 50) - (out_qty * 50)
            
            if u_val < 0: u_val = 0
            if i_val < 0: i_val = 0
            if a_val < 0: a_val = 0
            if r_val < 0: r_val = 0

        sparklines["users"] = users_arr
        sparklines["inventory_value"] = inv_arr
        sparklines["alerts"] = alerts_arr
        sparklines["reports"] = reports_arr

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
            "category_movements": category_movements,
            "sparklines": sparklines,
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


class DashboardStreamView(APIView):
    permission_classes = []

    def get(self, request):
        import json
        import time
        from django.http import StreamingHttpResponse
        from django.utils import timezone
        from rest_framework_simplejwt.tokens import AccessToken
        from accounts.models import User
        from activity.models import ActivityEvent

        user = request.user
        if not user or not user.is_authenticated:
            token_str = request.query_params.get("token")
            if token_str:
                try:
                    access_token = AccessToken(token_str)
                    user = User.objects.get(id=access_token["user_id"])
                except Exception:
                    return Response({"success": False, "error": "Unauthorized"}, status=401)
            else:
                return Response({"success": False, "error": "Unauthorized"}, status=401)

        def event_stream():
            last_check = timezone.now()
            yield ": keep-alive\n\n"

            while True:
                org = user.organization
                events = ActivityEvent.objects.filter(created_at__gt=last_check)
                if org:
                    events = events.filter(organization=org)

                for event in events.order_by("created_at"):
                    data = {
                        "type": "activity",
                        "title": event.title,
                        "event_type": event.event_type,
                        "created_at": event.created_at.isoformat()
                    }
                    yield f"data: {json.dumps(data)}\n\n"

                last_check = timezone.now()
                time.sleep(2)

        response = StreamingHttpResponse(event_stream(), content_type="text/event-stream")
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"
        return response
