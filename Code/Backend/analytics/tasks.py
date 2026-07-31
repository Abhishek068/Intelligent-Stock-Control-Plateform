from datetime import timedelta

from celery import shared_task
from django.db.models import Sum
from django.utils import timezone

from inventory.models import Product
from stock.models import StockOutTransaction


@shared_task
def classify_products_abc():
    since = timezone.now() - timedelta(days=365)
    updated = 0
    products = list(Product.objects.filter(is_active=True))
    by_org = {}
    for product in products:
        by_org.setdefault(product.organization_id, []).append(product)
    for organization_products in by_org.values():
        values = {
            product.id: float(product.unit_price)
            * (
                StockOutTransaction.objects.filter(product=product, issued_at__gte=since)
                .aggregate(total=Sum("quantity"))["total"]
                or 0
            )
            for product in organization_products
        }
        total = sum(values.values()) or 1
        cumulative = 0
        for product in sorted(organization_products, key=lambda item: values[item.id], reverse=True):
            cumulative += values[product.id] / total * 100
            classification = "A" if cumulative <= 80 else "B" if cumulative <= 95 else "C"
            if product.abc_classification != classification:
                product.abc_classification = classification
                product.save(update_fields=["abc_classification", "updated_at"])
                updated += 1
    return {"updated": updated}
