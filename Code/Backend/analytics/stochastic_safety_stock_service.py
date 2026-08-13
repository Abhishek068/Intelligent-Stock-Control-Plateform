from datetime import timedelta
from decimal import Decimal
import math
import numpy as np

from django.db.models import Sum
from django.utils import timezone

from inventory.models import Product
from procurement.models import PurchaseOrder
from stock.models import StockOutTransaction


class StochasticSafetyStockService:
    """
    Dynamic Safety Stock & Reorder Point Optimization Service (Stochastic Model).
    Uses probabilistic inventory math based on Target Service Level Z-score, 
    daily demand variance (sigma_D), and lead time variance (sigma_L):

      Safety Stock (SS) = Z * sqrt( (Mean_LeadTime * Sigma_D^2) + (Mean_Demand^2 * Sigma_L^2) )
      Reorder Point (ROP) = (Mean_Demand * Mean_LeadTime) + SS
    """

    Z_SCORE_MAP = {
        85.0: 1.036,
        90.0: 1.282,
        95.0: 1.645,
        98.0: 2.054,
        99.0: 2.326,
        99.9: 3.090,
    }

    @classmethod
    def get_z_score(cls, service_level: float) -> float:
        sl = float(service_level)
        if sl in cls.Z_SCORE_MAP:
            return cls.Z_SCORE_MAP[sl]
        # Closest match fallback
        closest = min(cls.Z_SCORE_MAP.keys(), key=lambda k: abs(k - sl))
        return cls.Z_SCORE_MAP[closest]

    @classmethod
    def calculate_for_product(cls, product: Product, target_service_level: float = None):
        sl = target_service_level if target_service_level is not None else float(product.target_service_level or 98.0)
        z = cls.get_z_score(sl)

        now = timezone.now()
        since_90 = now - timedelta(days=90)

        # 1. Calculate Daily Demand Mean (D_bar) & StdDev (Sigma_D)
        txs = list(
            StockOutTransaction.objects.filter(product=product, issued_at__gte=since_90)
            .values("issued_at", "quantity")
        )
        daily_dict = { (now - timedelta(days=i)).date(): 0 for i in range(90) }
        for t in txs:
            d = t["issued_at"].date()
            if d in daily_dict:
                daily_dict[d] += t["quantity"]

        daily_demands = list(daily_dict.values())
        mean_d = float(np.mean(daily_demands)) if daily_demands else 0.0
        sigma_d = float(np.std(daily_demands)) if daily_demands else 0.0

        if mean_d <= 0.0:
            mean_d = float(product.reorder_level or 10) / 14.0
            sigma_d = mean_d * 0.4

        # 2. Calculate Supplier Lead Time Mean (L_bar) & StdDev (Sigma_L)
        lead_times = []
        if product.supplier:
            l_bar = float(product.supplier.lead_time_days or 7)
            received_pos = PurchaseOrder.objects.filter(
                supplier=product.supplier,
                status=PurchaseOrder.Status.RECEIVED,
                submitted_at__isnull=False,
                received_at__isnull=False,
            )
            for po in received_pos:
                delta_days = (po.received_at - po.submitted_at).total_seconds() / 86400.0
                lead_times.append(delta_days)
        else:
            l_bar = 7.0

        sigma_l = float(np.std(lead_times)) if len(lead_times) >= 2 else 1.5
        if sigma_l <= 0.1:
            sigma_l = 1.0

        # 3. Apply Stochastic Safety Stock Formula
        # SS = Z * sqrt( L_bar * (sigma_d^2) + (mean_d^2) * (sigma_l^2) )
        variance_term = (l_bar * (sigma_d ** 2)) + ((mean_d ** 2) * (sigma_l ** 2))
        safety_stock = int(round(z * math.sqrt(max(0.001, variance_term))))
        safety_stock = max(1, safety_stock)

        # 4. Stochastic Reorder Point (ROP = D_bar * L_bar + SS)
        rop = int(round((mean_d * l_bar) + safety_stock))
        rop = max(product.reorder_level or 1, rop)

        # Update product record
        product.target_service_level = Decimal(str(round(sl, 2)))
        product.stochastic_safety_stock = safety_stock
        product.dynamic_reorder_point = rop
        product.demand_std_dev = Decimal(str(round(sigma_d, 2)))
        product.lead_time_std_dev = Decimal(str(round(sigma_l, 2)))
        product.save(
            update_fields=[
                "target_service_level",
                "stochastic_safety_stock",
                "dynamic_reorder_point",
                "demand_std_dev",
                "lead_time_std_dev",
                "updated_at",
            ]
        )

        return {
            "product_id": product.id,
            "product_name": product.name,
            "target_service_level": round(sl, 1),
            "z_score": round(z, 3),
            "stochastic_safety_stock": safety_stock,
            "dynamic_reorder_point": rop,
            "mean_daily_demand": round(mean_d, 2),
            "demand_std_dev": round(sigma_d, 2),
            "mean_lead_time_days": round(l_bar, 1),
            "lead_time_std_dev": round(sigma_l, 2),
            "formula_explanation": f"SS = {z:.3f} * sqrt({l_bar:.1f}*{sigma_d:.2f}^2 + {mean_d:.2f}^2*{sigma_l:.2f}^2) = {safety_stock} units",
        }

    @classmethod
    def calculate_all_products(cls, organization, target_service_level: float = None):
        products = Product.objects.filter(organization=organization, is_active=True)
        results = []
        for p in products:
            res = cls.calculate_for_product(p, target_service_level=target_service_level)
            results.append(res)
        return results
