"""Org-scoped read-only tools for the O3 inventory chatbot."""

from datetime import timedelta
from decimal import Decimal

from django.db.models import Q
from django.utils import timezone

from analytics.models import DemandForecast, PredictiveAlert, ReorderRecommendation
from inventory.models import InventoryBalance, Product
from notifications.models import Notification
from stock.models import Batch
from stock.services import StockService
from suppliers.models import Supplier


def get_inventory_summary(organization, **_kwargs):
    if not organization:
        return {
            "total_inventory_value": 0,
            "total_products": 0,
            "low_stock_count": 0,
            "out_of_stock_count": 0,
            "open_alerts_count": 0,
            "reorder_count": 0,
        }

    products = Product.objects.filter(organization=organization, is_active=True)
    balances = InventoryBalance.objects.filter(
        product__organization=organization
    ).select_related("product", "location")

    total_value = sum(
        (StockService.inventory_value(b.product, b.location) for b in balances),
        Decimal("0"),
    )

    stock_by_product = {}
    for b in balances:
        stock_by_product[b.product_id] = stock_by_product.get(b.product_id, 0) + b.quantity_on_hand

    low_stock = 0
    out_of_stock = 0
    for p in products:
        stock = stock_by_product.get(p.id, 0)
        if stock == 0:
            out_of_stock += 1
        elif stock <= p.minimum_level:
            low_stock += 1

    open_alerts = Notification.objects.filter(
        organization=organization, is_read=False
    ).count()
    reorder_count = (
        ReorderRecommendation.objects.filter(
            product__organization=organization, is_active=True
        )
        .exclude(priority="Low")
        .count()
    )

    return {
        "total_inventory_value": float(total_value),
        "total_products": products.count(),
        "low_stock_count": low_stock,
        "out_of_stock_count": out_of_stock,
        "open_alerts_count": open_alerts,
        "reorder_count": reorder_count,
    }


def get_low_stock_products(organization, limit=10, **_kwargs):
    limit = min(int(limit or 10), 25)
    products = Product.objects.filter(organization=organization, is_active=True)
    balances = InventoryBalance.objects.filter(product__organization=organization)
    stock_by_product = {}
    for b in balances:
        stock_by_product[b.product_id] = stock_by_product.get(b.product_id, 0) + b.quantity_on_hand

    rows = []
    for p in products:
        stock = stock_by_product.get(p.id, 0)
        if stock <= p.minimum_level:
            rows.append(
                {
                    "name": p.name,
                    "sku": p.sku,
                    "stock": stock,
                    "minimum_level": p.minimum_level,
                    "reorder_level": p.reorder_level,
                    "status": "out_of_stock" if stock == 0 else "low_stock",
                }
            )
    rows.sort(key=lambda r: r["stock"])
    return {"count": len(rows), "products": rows[:limit]}


def get_product_stock(organization, query="", **_kwargs):
    query = (query or "").strip()
    if not query:
        return {"error": "Provide a product name or SKU."}

    product = (
        Product.objects.filter(organization=organization, is_active=True)
        .filter(Q(sku__iexact=query) | Q(barcode__iexact=query) | Q(name__icontains=query))
        .first()
    )
    if not product:
        return {"error": f"No product found matching '{query}'."}

    balances = InventoryBalance.objects.filter(product=product).select_related("location")
    locations = [
        {
            "location": b.location.name,
            "quantity_on_hand": b.quantity_on_hand,
            "available": b.available_quantity,
        }
        for b in balances
    ]
    total = sum(b.quantity_on_hand for b in balances)
    return {
        "name": product.name,
        "sku": product.sku,
        "total_on_hand": total,
        "minimum_level": product.minimum_level,
        "reorder_level": product.reorder_level,
        "locations": locations,
    }


def get_reorder_recommendations(organization, limit=10, **_kwargs):
    limit = min(int(limit or 10), 25)
    recs = (
        ReorderRecommendation.objects.filter(
            product__organization=organization, is_active=True
        )
        .select_related("product")
        .order_by("-stockout_risk", "-suggested_quantity")[:limit]
    )
    return {
        "count": len(recs),
        "recommendations": [
            {
                "product": r.product.name,
                "sku": r.product.sku,
                "current_stock": r.current_stock,
                "suggested_quantity": r.suggested_quantity,
                "priority": r.priority,
                "stockout_risk": float(r.stockout_risk or 0),
                "reorder_point": r.reorder_point,
            }
            for r in recs
        ],
    }


def get_open_alerts(organization, limit=10, **_kwargs):
    limit = min(int(limit or 10), 25)
    notifications = list(
        Notification.objects.filter(organization=organization, is_read=False)
        .order_by("-created_at")[:limit]
    )
    predictive = list(
        PredictiveAlert.objects.filter(
            product__organization=organization, is_resolved=False
        )
        .select_related("product")
        .order_by("-generated_at")[:limit]
    )
    return {
        "unread_notifications": [
            {
                "title": n.title,
                "message": n.message,
                "type": n.notification_type,
                "severity": n.severity,
            }
            for n in notifications
        ],
        "predictive_alerts": [
            {
                "product": a.product.name,
                "sku": a.product.sku,
                "severity": a.severity,
                "predicted_stockout_date": a.predicted_stockout_date.isoformat(),
                "explanation": a.explanation_json,
            }
            for a in predictive
        ],
    }


def get_supplier_performance(organization, query="", **_kwargs):
    qs = Supplier.objects.filter(
        organization=organization, status=Supplier.Status.ACTIVE
    )
    query = (query or "").strip()
    if query:
        qs = qs.filter(name__icontains=query)
    suppliers = list(qs.order_by("-performance_score")[:10])
    if not suppliers:
        return {"error": f"No suppliers found matching '{query}'." if query else "No suppliers found."}
    return {
        "suppliers": [
            {
                "name": s.name,
                "performance_score": float(s.performance_score or 0),
                "delivery_rate": float(s.delivery_rate or 0),
                "order_accuracy": float(s.order_accuracy or 0),
                "lead_time_days": s.lead_time_days,
            }
            for s in suppliers
        ]
    }


def get_forecast_summary(organization, query="", **_kwargs):
    query = (query or "").strip()
    forecasts = DemandForecast.objects.filter(
        product__organization=organization
    ).select_related("product").order_by("-generated_at")

    if query:
        product = (
            Product.objects.filter(organization=organization, is_active=True)
            .filter(Q(sku__iexact=query) | Q(name__icontains=query))
            .first()
        )
        if not product:
            return {"error": f"No product found matching '{query}'."}
        latest = forecasts.filter(product=product).first()
        if not latest:
            return {"error": f"No forecast available for {product.name}."}
        return {
            "product": product.name,
            "sku": product.sku,
            "model": latest.model_name,
            "predicted_demand": float(latest.predicted_demand),
            "period_start": latest.forecast_period_start.isoformat(),
            "period_end": latest.forecast_period_end.isoformat(),
            "mae": float(latest.mae) if latest.mae is not None else None,
        }

    seen = set()
    rows = []
    for f in forecasts:
        if f.product_id in seen:
            continue
        seen.add(f.product_id)
        rows.append(
            {
                "product": f.product.name,
                "sku": f.product.sku,
                "model": f.model_name,
                "predicted_demand": float(f.predicted_demand),
            }
        )
        if len(rows) >= 10:
            break
    return {"count": len(rows), "forecasts": rows}


def get_expiring_batches(organization, days=30, **_kwargs):
    days = min(max(int(days or 30), 1), 90)
    today = timezone.now().date()
    batches = (
        Batch.objects.filter(
            product__organization=organization,
            quantity_on_hand__gt=0,
            expiry_date__isnull=False,
            expiry_date__lte=today + timedelta(days=days),
        )
        .select_related("product", "location")
        .order_by("expiry_date")[:25]
    )
    return {
        "window_days": days,
        "count": len(batches),
        "batches": [
            {
                "batch_number": b.batch_number,
                "product": b.product.name,
                "sku": b.product.sku,
                "location": b.location.name,
                "quantity_on_hand": b.quantity_on_hand,
                "expiry_date": b.expiry_date.isoformat(),
                "days_to_expiry": (b.expiry_date - today).days,
            }
            for b in batches
        ],
    }


TOOL_REGISTRY = {
    "get_inventory_summary": get_inventory_summary,
    "get_low_stock_products": get_low_stock_products,
    "get_product_stock": get_product_stock,
    "get_reorder_recommendations": get_reorder_recommendations,
    "get_open_alerts": get_open_alerts,
    "get_supplier_performance": get_supplier_performance,
    "get_forecast_summary": get_forecast_summary,
    "get_expiring_batches": get_expiring_batches,
}

OPENAI_TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_inventory_summary",
            "description": "Get total inventory valuation, product counts, low/out-of-stock counts, alerts and reorder queue size.",
            "parameters": {"type": "object", "properties": {}, "additionalProperties": False},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_low_stock_products",
            "description": "List products at or below minimum stock level.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Max products to return (default 10)."},
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_product_stock",
            "description": "Look up on-hand stock for a product by name, SKU, or barcode.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Product name, SKU, or barcode."},
                },
                "required": ["query"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_reorder_recommendations",
            "description": "List active smart reorder recommendations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer"},
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_open_alerts",
            "description": "List unread notifications and unresolved predictive alerts.",
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer"}},
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_supplier_performance",
            "description": "Get supplier performance scores. Optionally filter by supplier name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Optional supplier name filter."},
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_forecast_summary",
            "description": "Get demand forecast summary, optionally for one product.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Optional product name or SKU."},
                },
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_expiring_batches",
            "description": "List batches expiring within a number of days (default 30).",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "description": "Lookahead window in days."},
                },
                "additionalProperties": False,
            },
        },
    },
]


def run_tool(name, organization, arguments=None):
    fn = TOOL_REGISTRY.get(name)
    if not fn:
        return {"error": f"Unknown tool: {name}"}
    try:
        return fn(organization, **(arguments or {}))
    except Exception as exc:
        return {"error": str(exc)}
