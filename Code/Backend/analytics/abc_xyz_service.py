from datetime import timedelta
from decimal import Decimal
import numpy as np

from django.db.models import Sum
from django.utils import timezone

from inventory.models import Product
from stock.models import StockOutTransaction


class AbcXyzClassificationService:
    """
    Automated ABC/XYZ Inventory Classification Engine
    - ABC Analysis: Revenue ranking (A=80%, B=15%, C=5%)
    - XYZ Analysis: Demand volatility using Coefficient of Variation CV = StdDev / Mean
      (X <= 0.5, Y 0.5-1.0, Z > 1.0)
    - 3x3 Matrix Policy:
      - AX, AY, BX -> Automated Reordering
      - AZ, BY, CX -> Review Required
      - BZ, CY, CZ -> Manual / JIT Review
    """

    POLICY_MAP = {
        "AX": Product.ReorderPolicy.AUTOMATED,
        "AY": Product.ReorderPolicy.AUTOMATED,
        "BX": Product.ReorderPolicy.AUTOMATED,
        "AZ": Product.ReorderPolicy.REVIEW_REQUIRED,
        "BY": Product.ReorderPolicy.REVIEW_REQUIRED,
        "CX": Product.ReorderPolicy.REVIEW_REQUIRED,
        "BZ": Product.ReorderPolicy.MANUAL,
        "CY": Product.ReorderPolicy.MANUAL,
        "CZ": Product.ReorderPolicy.MANUAL,
    }

    @classmethod
    def classify_organization_products(cls, organization):
        now = timezone.now()
        since_year = now - timedelta(days=365)
        since_90 = now - timedelta(days=90)

        products = list(Product.objects.filter(organization=organization, is_active=True))
        if not products:
            return {"total": 0, "updated": 0, "matrix": {}}

        revenue_map = {}
        for p in products:
            total_qty = (
                StockOutTransaction.objects.filter(product=p, issued_at__gte=since_year)
                .aggregate(total=Sum("quantity"))["total"]
                or 0
            )
            revenue = float(p.unit_price) * float(total_qty)
            revenue_map[p.id] = revenue

        total_rev = sum(revenue_map.values())
        sorted_prods = sorted(products, key=lambda x: revenue_map[x.id], reverse=True)

        cum_rev = 0.0
        abc_map = {}
        for p in sorted_prods:
            rev = revenue_map[p.id]
            if total_rev > 0:
                cum_rev += (rev / total_rev) * 100.0
            else:
                cum_rev = 100.0

            if cum_rev <= 80.0 or rev == total_rev:
                abc = "A"
            elif cum_rev <= 95.0:
                abc = "B"
            else:
                abc = "C"
            abc_map[p.id] = abc

        xyz_map = {}
        cv_map = {}
        std_map = {}
        for p in products:
            txs = list(
                StockOutTransaction.objects.filter(product=p, issued_at__gte=since_90)
                .values("issued_at", "quantity")
            )
            daily_dict = {}
            for i in range(90):
                d = (now - timedelta(days=i)).date()
                daily_dict[d] = 0

            for t in txs:
                d = t["issued_at"].date()
                if d in daily_dict:
                    daily_dict[d] += t["quantity"]

            daily_demand = list(daily_dict.values())
            mean_d = float(np.mean(daily_demand))
            std_d = float(np.std(daily_demand))
            std_map[p.id] = std_d

            if mean_d > 0.001:
                cv = std_d / mean_d
            else:
                cv = 1.2 if len(txs) == 0 else 0.4

            cv_map[p.id] = cv
            if cv <= 0.5:
                xyz = "X"
            elif cv <= 1.0:
                xyz = "Y"
            else:
                xyz = "Z"
            xyz_map[p.id] = xyz

        updated = 0
        matrix_counts = {}
        for p in products:
            abc = abc_map[p.id]
            xyz = xyz_map[p.id]
            abc_xyz = f"{abc}{xyz}"
            policy = cls.POLICY_MAP.get(abc_xyz, Product.ReorderPolicy.AUTOMATED)
            cv = Decimal(str(round(cv_map[p.id], 4)))
            std_d = Decimal(str(round(std_map[p.id], 2)))

            matrix_counts[abc_xyz] = matrix_counts.get(abc_xyz, 0) + 1

            if (
                p.abc_classification != abc
                or p.xyz_classification != xyz
                or p.abc_xyz_class != abc_xyz
                or p.automated_reorder_policy != policy
                or p.demand_coefficient_of_variation != cv
            ):
                p.abc_classification = abc
                p.xyz_classification = xyz
                p.abc_xyz_class = abc_xyz
                p.automated_reorder_policy = policy
                p.demand_coefficient_of_variation = cv
                p.demand_std_dev = std_d
                p.save(
                    update_fields=[
                        "abc_classification",
                        "xyz_classification",
                        "abc_xyz_class",
                        "automated_reorder_policy",
                        "demand_coefficient_of_variation",
                        "demand_std_dev",
                        "updated_at",
                    ]
                )
                updated += 1

        return {
            "total_products": len(products),
            "updated_products": updated,
            "matrix_distribution": matrix_counts,
        }
