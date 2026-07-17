from datetime import timedelta

from decimal import Decimal



import numpy as np

import pandas as pd

from django.db.models import Sum

from django.utils import timezone

from statsmodels.tsa.holtwinters import ExponentialSmoothing



from analytics.models import DemandForecast, PredictiveAlert, ReorderRecommendation

from inventory.models import InventoryBalance, Product

from notifications.models import Notification

from notifications.services import NotificationService

from stock.models import StockOutTransaction





class ForecastingService:

    @staticmethod

    def _daily_demand_series(product, days=90):

        end = timezone.now()

        start = end - timedelta(days=days)

        txns = (

            StockOutTransaction.objects.filter(

                product=product,

                issued_at__gte=start,

                issued_at__lte=end,

            )

            .values("issued_at__date")

            .annotate(total=Sum("quantity"))

            .order_by("issued_at__date")

        )

        if not txns:

            return pd.Series(dtype=float)



        df = pd.DataFrame(list(txns))

        df["issued_at__date"] = pd.to_datetime(df["issued_at__date"])

        df = df.set_index("issued_at__date").asfreq("D", fill_value=0)

        return df["total"].astype(float)



    @classmethod

    def forecast_product(cls, product, horizon_days=30):

        series = cls._daily_demand_series(product)

        model_name = "naive_baseline"

        mae = rmse = mape = None

        predicted_total = Decimal("0")



        if len(series) >= 14:

            train = series.iloc[:-7] if len(series) > 7 else series

            test = series.iloc[-7:] if len(series) > 7 else pd.Series(dtype=float)



            try:

                if train.sum() > 0 and train.std() > 0:

                    model = ExponentialSmoothing(

                        train, trend="add", seasonal=None, initialization_method="estimated"

                    )

                    fitted = model.fit(optimized=True)

                    forecast = fitted.forecast(horizon_days)

                    predicted_total = Decimal(str(max(0, forecast.sum())))

                    model_name = "exponential_smoothing"



                    if len(test) > 0:

                        naive_pred = pd.Series([train.iloc[-1]] * len(test), index=test.index)

                        model_pred = fitted.forecast(len(test))

                        mae = float(np.mean(np.abs(test.values - model_pred.values)))

                        rmse = float(np.sqrt(np.mean((test.values - model_pred.values) ** 2)))

                        naive_mae = float(np.mean(np.abs(test.values - naive_pred.values)))

                        if mae >= naive_mae:

                            predicted_total = Decimal(str(max(0, naive_pred.sum() * (horizon_days / max(len(test), 1)))))

                            model_name = "naive_baseline"

                            mae = naive_mae

                            rmse = float(np.sqrt(np.mean((test.values - naive_pred.values) ** 2)))

                        if test.sum() > 0:

                            mape = float(np.mean(np.abs((test.values - model_pred.values) / np.maximum(test.values, 1))) * 100)

                else:

                    avg_daily = float(train.mean()) if len(train) else 0

                    predicted_total = Decimal(str(max(0, avg_daily * horizon_days)))

                    model_name = "average_demand"

            except Exception:

                avg_daily = float(series.mean()) if len(series) else 0

                predicted_total = Decimal(str(max(0, avg_daily * horizon_days)))

                model_name = "average_demand"

        elif len(series) > 0:

            avg_daily = float(series.mean())

            predicted_total = Decimal(str(max(0, avg_daily * horizon_days)))

            model_name = "average_demand"

        else:

            predicted_total = Decimal("0")

            model_name = "no_history"



        today = timezone.now().date()

        forecast = DemandForecast.objects.create(

            product=product,

            forecast_period_start=today,

            forecast_period_end=today + timedelta(days=horizon_days),

            predicted_demand=predicted_total,

            model_name=model_name,

            mae=Decimal(str(round(mae, 4))) if mae is not None else None,

            rmse=Decimal(str(round(rmse, 4))) if rmse is not None else None,

            mape=Decimal(str(round(mape, 4))) if mape is not None else None,

        )

        return forecast



    @classmethod

    def get_chart_data(cls, product, days=90):

        series = cls._daily_demand_series(product, days=days)

        if series.empty:

            return {"history": [], "forecast": [], "metrics": {}}



        history = [

            {"date": idx.strftime("%Y-%m-%d"), "actual": float(val)}

            for idx, val in series.items()

        ]



        forecast_record = (

            DemandForecast.objects.filter(product=product).order_by("-generated_at").first()

        )

        forecast_points = []

        if forecast_record and len(series) > 0:

            daily_pred = float(forecast_record.predicted_demand) / max(

                (forecast_record.forecast_period_end - forecast_record.forecast_period_start).days, 1

            )

            last_date = series.index[-1]

            for i in range(1, 31):

                d = last_date + timedelta(days=i)

                forecast_points.append({"date": d.strftime("%Y-%m-%d"), "predicted": daily_pred})



        metrics = {}

        if forecast_record:

            metrics = {

                "mae": float(forecast_record.mae) if forecast_record.mae else None,

                "rmse": float(forecast_record.rmse) if forecast_record.rmse else None,

                "mape": float(forecast_record.mape) if forecast_record.mape else None,

                "model_name": forecast_record.model_name,

            }



        return {"history": history, "forecast": forecast_points, "metrics": metrics}





class ReorderService:

    @staticmethod

    def _total_stock(product):

        return (

            InventoryBalance.objects.filter(product=product).aggregate(

                total=Sum("quantity_on_hand")

            )["total"]

            or 0

        )



    @staticmethod

    def _avg_daily_demand(product, days=30):

        end = timezone.now()

        start = end - timedelta(days=days)

        total = (

            StockOutTransaction.objects.filter(

                product=product, issued_at__gte=start, issued_at__lte=end

            ).aggregate(total=Sum("quantity"))["total"]

            or 0

        )

        return total / max(days, 1)



    @classmethod

    def generate_for_product(cls, product):

        current_stock = cls._total_stock(product)

        lead_time = product.supplier.lead_time_days

        avg_daily = cls._avg_daily_demand(product)

        safety_stock = max(1, int(avg_daily * 2))

        reorder_point = max(product.reorder_level, int(avg_daily * lead_time + safety_stock))



        latest_forecast = (

            DemandForecast.objects.filter(product=product).order_by("-generated_at").first()

        )

        predicted_demand = (

            float(latest_forecast.predicted_demand) if latest_forecast else avg_daily * 30

        )



        suggested = max(0, reorder_point - current_stock + int(predicted_demand / 30))

        if suggested == 0 and current_stock <= product.minimum_level:

            suggested = max(product.reorder_level, reorder_point - current_stock)



        if current_stock <= 0:

            priority = ReorderRecommendation.Priority.CRITICAL

            stockout_risk = Decimal("95")

        elif current_stock <= product.minimum_level:

            priority = ReorderRecommendation.Priority.HIGH

            stockout_risk = Decimal("75")

        elif current_stock <= reorder_point:

            priority = ReorderRecommendation.Priority.MEDIUM

            stockout_risk = Decimal("50")

        else:

            priority = ReorderRecommendation.Priority.LOW

            stockout_risk = Decimal("20")



        explanation = {

            "current_stock": current_stock,

            "lead_time_days": lead_time,

            "avg_daily_demand": round(avg_daily, 2),

            "safety_stock": safety_stock,

            "reorder_point_formula": "avg_daily_demand * lead_time + safety_stock",

            "predicted_demand_30d": round(predicted_demand, 2),

        }



        ReorderRecommendation.objects.filter(product=product, is_active=True).update(is_active=False)



        return ReorderRecommendation.objects.create(

            product=product,

            current_stock=current_stock,

            lead_time_days=lead_time,

            predicted_demand=Decimal(str(round(predicted_demand, 2))),

            reorder_point=reorder_point,

            suggested_quantity=max(suggested, 1) if current_stock <= reorder_point else suggested,

            priority=priority,

            stockout_risk=stockout_risk,

            explanation_json=explanation,

        )



    @classmethod

    def generate_all(cls, organization):

        products = Product.objects.filter(organization=organization, is_active=True)

        return [cls.generate_for_product(p) for p in products]





class AlertService:

    @classmethod

    def evaluate_product(cls, product, organization):

        current_stock = (

            InventoryBalance.objects.filter(product=product).aggregate(

                total=Sum("quantity_on_hand")

            )["total"]

            or 0

        )

        avg_daily = ReorderService._avg_daily_demand(product)

        lead_time = product.supplier.lead_time_days

        alerts_created = []



        if current_stock == 0:

            notif = NotificationService.notify(
                organization=organization,
                notification_type=Notification.NotificationType.OUT_OF_STOCK,
                title="Out of Stock",
                message=f"{product.name} is completely out of stock.",
                severity=Notification.Severity.CRITICAL,
                priority="urgent",
                related_entity_type="Product",
                related_entity_id=str(product.id),
                explanation_json={"current_stock": 0},
                send_email=True,
            )

            alerts_created.append(notif)

        elif current_stock <= product.minimum_level:

            notif = NotificationService.notify(
                organization=organization,
                notification_type=Notification.NotificationType.LOW_STOCK,
                title="Low Stock Warning",
                message=f"{product.name} has dropped below minimum level ({product.minimum_level} units).",
                severity=Notification.Severity.WARNING,
                priority="high",
                related_entity_type="Product",
                related_entity_id=str(product.id),
                explanation_json={
                    "current_stock": current_stock,
                    "minimum_level": product.minimum_level,
                    "lead_time": lead_time,
                },
                send_email=True,
            )

            alerts_created.append(notif)



        if avg_daily > 0:

            days_until_stockout = current_stock / avg_daily

            if days_until_stockout <= lead_time and current_stock > 0:

                stockout_date = timezone.now().date() + timedelta(days=int(days_until_stockout))

                threshold_date = timezone.now().date() + timedelta(days=lead_time)



                PredictiveAlert.objects.filter(product=product, is_resolved=False).update(

                    is_resolved=True

                )

                pa = PredictiveAlert.objects.create(

                    product=product,

                    predicted_stockout_date=stockout_date,

                    threshold_date=threshold_date,

                    severity=(

                        PredictiveAlert.Severity.CRITICAL

                        if days_until_stockout <= lead_time / 2

                        else PredictiveAlert.Severity.WARNING

                    ),

                    explanation_json={

                        "current_stock": current_stock,

                        "avg_daily_demand": round(avg_daily, 2),

                        "days_until_stockout": round(days_until_stockout, 1),

                        "lead_time_days": lead_time,

                    },

                )

                notif = NotificationService.notify(
                    organization=organization,
                    notification_type=Notification.NotificationType.PREDICTIVE,
                    title="Predictive Stockout Alert",
                    message=f"{product.name} is predicted to stock out in {int(days_until_stockout)} days.",
                    severity=(
                        Notification.Severity.CRITICAL
                        if days_until_stockout <= lead_time / 2
                        else Notification.Severity.WARNING
                    ),
                    priority="high",
                    related_entity_type="Product",
                    related_entity_id=str(product.id),
                    explanation_json=pa.explanation_json,
                    send_email=True,
                )

                alerts_created.append(notif)



        return alerts_created



    @classmethod

    def evaluate_organization(cls, organization):

        products = Product.objects.filter(organization=organization, is_active=True)

        all_alerts = []

        for product in products:

            all_alerts.extend(cls.evaluate_product(product, organization))

        return all_alerts

