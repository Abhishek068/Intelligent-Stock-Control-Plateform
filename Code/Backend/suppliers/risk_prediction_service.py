from datetime import datetime, timedelta
from decimal import Decimal
import numpy as np
from sklearn.ensemble import RandomForestClassifier

from procurement.models import PurchaseOrder
from suppliers.models import Supplier


class SupplierRiskPredictionService:
    """
    MSc-level Machine Learning Classification Service using RandomForestClassifier
    to predict Purchase Order delay probability (0-100%), calculate a dynamic 
    Supplier Risk Score, determine Risk Level (Low/Medium/High/Critical), and 
    extract key contributing risk factors.
    """

    _cached_model = None
    _last_trained_at = None

    @classmethod
    def _extract_features(cls, supplier, total_volume, total_amount, expected_delivery=None, submitted_at=None, location=None):
        now = submitted_at or datetime.now()
        month = now.month
        day_of_week = now.weekday()
        is_q4 = 1 if month in [10, 11, 12] else 0

        lead_time = float(supplier.lead_time_days or 7)
        reliability = float(supplier.delivery_reliability or 90.0)
        accuracy = float(supplier.order_accuracy or 90.0)

        # Historical delay rate calculation for this supplier
        completed_pos = PurchaseOrder.objects.filter(
            supplier=supplier,
            status=PurchaseOrder.Status.RECEIVED,
            submitted_at__isnull=False,
            received_at__isnull=False,
        )
        total_completed = completed_pos.count()
        delayed_count = 0
        if total_completed > 0:
            for po in completed_pos:
                due = po.expected_delivery or (po.submitted_at + timedelta(days=supplier.lead_time_days)).date()
                if po.received_at.date() > due:
                    delayed_count += 1
            delay_rate = (delayed_count / total_completed) * 100.0
        else:
            delay_rate = 100.0 - reliability

        location_type_code = 1
        if location and hasattr(location, "location_type"):
            mapping = {"warehouse": 1, "store": 2, "office": 3}
            location_type_code = mapping.get(str(location.location_type).lower(), 1)

        return [
            lead_time,
            reliability,
            accuracy,
            float(delay_rate),
            float(total_volume or 1),
            float(total_amount or 0.0),
            float(month),
            float(is_q4),
            float(day_of_week),
            float(location_type_code),
        ], delay_rate

    @classmethod
    def _generate_synthetic_training_data(cls):
        """Generates domain-calibrated training data when historical records < 15."""
        np.random.seed(42)
        n_samples = 400
        X = []
        y = []

        for _ in range(n_samples):
            lead_time = np.random.uniform(2, 30)
            reliability = np.random.uniform(50, 99)
            accuracy = np.random.uniform(60, 100)
            delay_rate = np.random.uniform(0, 50)
            volume = np.random.uniform(5, 1000)
            amount = volume * np.random.uniform(10, 200)
            month = np.random.randint(1, 13)
            is_q4 = 1 if month in [10, 11, 12] else 0
            day_of_week = np.random.randint(0, 7)
            location_code = np.random.choice([1, 2, 3])

            # Domain logic for delay probability
            risk_points = 0.0
            if reliability < 75:
                risk_points += 0.30
            if delay_rate > 20:
                risk_points += 0.25
            if volume > 400:
                risk_points += 0.15
            if is_q4:
                risk_points += 0.20
            if lead_time > 14:
                risk_points += 0.10

            is_delayed = 1 if (risk_points + np.random.uniform(-0.15, 0.15)) > 0.40 else 0
            X.append([lead_time, reliability, accuracy, delay_rate, volume, amount, month, is_q4, day_of_week, location_code])
            y.append(is_delayed)

        return np.array(X), np.array(y)

    @classmethod
    def get_or_train_model(cls):
        now = datetime.now()
        if cls._cached_model and cls._last_trained_at and (now - cls._last_trained_at).total_seconds() < 300:
            return cls._cached_model

        # Extract actual POs if available
        completed_pos = PurchaseOrder.objects.filter(
            status=PurchaseOrder.Status.RECEIVED,
            submitted_at__isnull=False,
            received_at__isnull=False,
        ).select_related("supplier", "location").prefetch_related("lines")

        if completed_pos.count() >= 15:
            X, y = [], []
            for po in completed_pos:
                tot_vol = sum(line.quantity_ordered for line in po.lines.all())
                feat, _ = cls._extract_features(
                    supplier=po.supplier,
                    total_volume=tot_vol,
                    total_amount=po.total_amount,
                    submitted_at=po.submitted_at,
                    location=po.location,
                )
                due = po.expected_delivery or (po.submitted_at + timedelta(days=po.supplier.lead_time_days)).date()
                is_delayed = 1 if po.received_at.date() > due else 0
                X.append(feat)
                y.append(is_delayed)
            X = np.array(X)
            y = np.array(y)
        else:
            X, y = cls._generate_synthetic_training_data()

        model = RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42)
        model.fit(X, y)
        cls._cached_model = model
        cls._last_trained_at = now
        return model

    @classmethod
    def predict_po_risk(cls, supplier, total_volume, total_amount, expected_delivery=None, submitted_at=None, location=None):
        features, delay_rate = cls._extract_features(
            supplier=supplier,
            total_volume=total_volume,
            total_amount=total_amount,
            expected_delivery=expected_delivery,
            submitted_at=submitted_at,
            location=location,
        )

        model = cls.get_or_train_model()
        probs = model.predict_proba([features])[0]
        delay_prob = float(probs[1]) * 100.0 if len(probs) > 1 else float(probs[0]) * 100.0

        # Dynamic Risk Score (0-100)
        reliability = float(supplier.delivery_reliability or 90.0)
        unreliability = max(0.0, 100.0 - reliability)
        vol_factor = min(100.0, (float(total_volume or 1) / 500.0) * 100.0)

        risk_score = round((0.50 * delay_prob) + (0.35 * unreliability) + (0.15 * vol_factor), 2)
        risk_score = min(100.0, max(0.0, risk_score))

        # Risk Level Classification
        if risk_score < 25.0:
            risk_level = "low"
        elif risk_score < 50.0:
            risk_level = "medium"
        elif risk_score < 75.0:
            risk_level = "high"
        else:
            risk_level = "critical"

        # Risk Drivers / Contributing Factors
        factors = []
        month = (submitted_at or datetime.now()).month
        if month in [10, 11, 12]:
            factors.append({
                "factor": "Q4 Peak Seasonality",
                "impact": "High holiday order demand surge (+20% delay probability)",
                "severity": "high"
            })
        if delay_rate > 15.0:
            factors.append({
                "factor": "Supplier Historical Delays",
                "impact": f"{delay_rate:.1f}% of recent orders arrived past target delivery",
                "severity": "high" if delay_rate > 30 else "medium"
            })
        if total_volume and total_volume > 300:
            factors.append({
                "factor": "Large Order Volume",
                "impact": f"Bulk shipment ({total_volume} units) increases processing and transit time",
                "severity": "medium"
            })
        if supplier.lead_time_days and supplier.lead_time_days > 14:
            factors.append({
                "factor": "Extended Lead Time",
                "impact": f"Baseline lead time is {supplier.lead_time_days} days",
                "severity": "low"
            })
        if not factors:
            factors.append({
                "factor": "Consistent Supplier History",
                "impact": "Low variance and strong historical performance",
                "severity": "low"
            })

        return {
            "delay_probability": round(delay_prob, 2),
            "risk_score": round(risk_score, 2),
            "risk_level": risk_level,
            "risk_factors": {
                "drivers": factors,
                "historical_delay_rate": round(delay_rate, 2),
                "supplier_reliability": round(reliability, 2),
                "order_volume": total_volume,
            }
        }

    @classmethod
    def predict_actual_lead_time(cls, supplier):
        """
        Predicts actual expected supplier lead time (in days) based on historical PO fulfillment telemetry.
        """
        base_days = float(supplier.lead_time_days or 7)
        reliability = float(supplier.delivery_reliability or 90.0)

        completed_pos = PurchaseOrder.objects.filter(
            supplier=supplier,
            status=PurchaseOrder.Status.RECEIVED,
            submitted_at__isnull=False,
            received_at__isnull=False,
        )

        lead_times = []
        for po in completed_pos:
            delta_days = (po.received_at - po.submitted_at).total_seconds() / 86400.0
            if delta_days > 0:
                lead_times.append(delta_days)

        if lead_times:
            actual_mean = float(np.mean(lead_times))
            std_dev = float(np.std(lead_times)) if len(lead_times) >= 2 else 1.2
        else:
            delay_penalty = max(0.0, (100.0 - reliability) * 0.15)
            actual_mean = base_days + delay_penalty
            std_dev = 1.5

        predicted_days = max(1.0, round(actual_mean, 1))
        delay_bias = round(predicted_days - base_days, 1)

        if delay_bias > 1.5:
            status = "Consistently Late"
            status_color = "red"
        elif delay_bias < -1.5:
            status = "Delivers Early"
            status_color = "emerald"
        else:
            status = "On Time / Consistent"
            status_color = "blue"

        return {
            "contracted_lead_time_days": int(base_days),
            "predicted_lead_time_days": predicted_days,
            "delay_bias_days": delay_bias,
            "lead_time_std_dev": round(std_dev, 2),
            "status": status,
            "status_color": status_color,
            "historical_po_count": len(lead_times),
        }

