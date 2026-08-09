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

from stock.models import StockAdjustment, StockOutTransaction





class AnomalyDetectionService:
    MINIMUM_HISTORY = 10

    @staticmethod
    def _features(quantity, occurred_at, user_id, reason_length=0):
        return [float(quantity), occurred_at.hour, occurred_at.weekday(), float(user_id or 0), float(reason_length)]

    @classmethod
    def score(cls, transaction):
        from sklearn.ensemble import IsolationForest

        is_adjustment = isinstance(transaction, StockAdjustment)
        organization = transaction.product.organization
        adjustments = StockAdjustment.objects.filter(product__organization=organization).select_related("created_by")
        stock_outs = StockOutTransaction.objects.filter(product__organization=organization).select_related("created_by")
        history = [
            cls._features(
                abs(item.adjusted_qty - item.previous_qty),
                item.adjusted_at,
                item.created_by_id,
                len(item.reason or ""),
            )
            for item in adjustments
        ] + [
            cls._features(item.quantity, item.issued_at, item.created_by_id)
            for item in stock_outs
        ]
        if len(history) < cls.MINIMUM_HISTORY:
            return None, False

        current = cls._features(
            abs(transaction.adjusted_qty - transaction.previous_qty)
            if is_adjustment
            else transaction.quantity,
            transaction.adjusted_at if is_adjustment else transaction.issued_at,
            transaction.created_by_id,
            len(transaction.reason or "") if is_adjustment else 0,
        )
        model = IsolationForest(contamination="auto", random_state=42)
        model.fit(history)
        score = float(model.score_samples([current])[0])
        is_anomaly = bool(model.predict([current])[0] == -1)
        return score, is_anomaly

    @classmethod
    def evaluate(cls, transaction):
        score, is_anomaly = cls.score(transaction)
        if score is None:
            return None, False
        transaction.anomaly_score = Decimal(str(round(score, 4)))
        transaction.is_anomaly = is_anomaly
        transaction.save(update_fields=["anomaly_score", "is_anomaly", "updated_at"])
        if is_anomaly:
            NotificationService.notify(
                organization=transaction.product.organization,
                user=transaction.created_by,
                title="Suspicious stock transaction detected",
                message=f"Review {transaction.product.name}; anomaly score {score:.4f}.",
                notification_type=Notification.NotificationType.ANOMALY,
                severity=Notification.Severity.WARNING,
                priority=Notification.Priority.HIGH,
                related_entity_type=transaction.__class__.__name__,
                related_entity_id=transaction.id,
                explanation_json={"anomaly_score": round(score, 4)},
            )
        return score, is_anomaly


class ForecastingService:

    @staticmethod

    def _daily_demand_series(product=None, org=None, days=90):

        end = timezone.now()

        start = end - timedelta(days=days)
        
        qs = StockOutTransaction.objects.filter(
            issued_at__gte=start,
            issued_at__lte=end,
        )
        if product:
            qs = qs.filter(product=product)
        elif org:
            qs = qs.filter(product__organization=org)

        txns = (

            qs

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
                    import math
                    from statsmodels.tsa.arima.model import ARIMA

                    model_hw = ExponentialSmoothing(
                        train, trend="add", seasonal=None, initialization_method="estimated"
                    )
                    fitted_hw = model_hw.fit(optimized=True)
                    pred_hw = fitted_hw.forecast(len(test)) if len(test) > 0 else pd.Series(dtype=float)

                    model_arima = ARIMA(train, order=(1, 1, 0))
                    fitted_arima = model_arima.fit()
                    pred_arima = fitted_arima.forecast(len(test)) if len(test) > 0 else pd.Series(dtype=float)

                    pred_naive = pd.Series([train.iloc[-1]] * len(test), index=test.index) if len(test) > 0 else pd.Series(dtype=float)
                    sma_window = min(7, len(train))
                    sma_value = float(train.iloc[-sma_window:].mean())
                    pred_sma = pd.Series([sma_value] * len(test), index=test.index) if len(test) > 0 else pd.Series(dtype=float)

                    mae_hw = float(np.mean(np.abs(test.values - pred_hw.values))) if len(test) > 0 else 999999.0
                    mae_arima = float(np.mean(np.abs(test.values - pred_arima.values))) if len(test) > 0 else 999999.0
                    mae_naive = float(np.mean(np.abs(test.values - pred_naive.values))) if len(test) > 0 else 999999.0
                    mae_sma = float(np.mean(np.abs(test.values - pred_sma.values))) if len(test) > 0 else 999999.0

                    best_model = min(
                        (mae_hw, "exponential_smoothing", fitted_hw),
                        (mae_arima, "arima", fitted_arima),
                        (mae_naive, "naive_baseline", None),
                        (mae_sma, "simple_moving_average", None),
                        key=lambda x: x[0]
                    )

                    mae, model_name, fitted_model = best_model

                    if model_name == "exponential_smoothing":
                        forecast_res = fitted_model.forecast(horizon_days)
                        predicted_total = Decimal(str(max(0, forecast_res.sum())))
                        if len(test) > 0:
                            rmse = float(np.sqrt(np.mean((test.values - pred_hw.values) ** 2)))
                            mape = float(np.mean(np.abs((test.values - pred_hw.values) / np.maximum(test.values, 1.0))) * 100)
                    elif model_name == "arima":
                        forecast_res = fitted_model.forecast(horizon_days)
                        predicted_total = Decimal(str(max(0, forecast_res.sum())))
                        if len(test) > 0:
                            rmse = float(np.sqrt(np.mean((test.values - pred_arima.values) ** 2)))
                            mape = float(np.mean(np.abs((test.values - pred_arima.values) / np.maximum(test.values, 1.0))) * 100)
                    elif model_name == "simple_moving_average":
                        forecast_res = pd.Series([sma_value] * horizon_days)
                        predicted_total = Decimal(str(max(0, forecast_res.sum())))
                        if len(test) > 0:
                            rmse = float(np.sqrt(np.mean((test.values - pred_sma.values) ** 2)))
                            mape = float(np.mean(np.abs((test.values - pred_sma.values) / np.maximum(test.values, 1.0))) * 100)
                    else:
                        predicted_total = Decimal(str(max(0, pred_naive.sum() * (horizon_days / max(len(test), 1)))))
                        if len(test) > 0:
                            rmse = float(np.sqrt(np.mean((test.values - pred_naive.values) ** 2)))
                            mape = float(np.mean(np.abs((test.values - pred_naive.values) / np.maximum(test.values, 1.0))) * 100)

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

        from analytics.weather_service import WeatherService
        weather_multiplier, weather_context = WeatherService.get_weather_impact(city="London")
        
        from analytics.holiday_service import HolidayService
        holiday_multiplier, holiday_context = HolidayService.get_holiday_impact(horizon_days=horizon_days, country_code="GB")
        
        from analytics.events_service import EventsService
        events_multiplier, events_context = EventsService.get_events_impact(city="London", country_code="GB", horizon_days=horizon_days)
        
        from analytics.trends_service import TrendsService
        product_name = product.name if hasattr(product, 'name') else str(product)
        trends_multiplier, trends_context = TrendsService.get_trends_impact(product_name=product_name)
        
        compound_multiplier = weather_multiplier * holiday_multiplier * events_multiplier * trends_multiplier
        if compound_multiplier != 1.0:
            predicted_total = Decimal(str(max(0, float(predicted_total) * compound_multiplier)))
            
            adjusted_parts = []
            if weather_multiplier != 1.0:
                adjusted_parts.append("weather")
            if holiday_multiplier != 1.0:
                adjusted_parts.append("holiday")
            if events_multiplier != 1.0:
                adjusted_parts.append("events")
            if trends_multiplier != 1.0:
                adjusted_parts.append("trends")
            model_name = f"{model_name}_{'_'.join(adjusted_parts)}_adjusted"
            
        if holiday_context.get("upcoming_holidays"):
            weather_context["holiday_event"] = holiday_context
        if events_context.get("total_events_found", 0) > 0:
            weather_context["local_events"] = events_context
        if trends_context.get("trend_ratio"):
            weather_context["google_trends"] = trends_context




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
            weather_context=weather_context
        )

        return forecast



    @classmethod

    def get_chart_data(cls, product=None, org=None, days=90):

        series = cls._daily_demand_series(product=product, org=org, days=days)

        if series.empty:

            return {"history": [], "forecast": [], "metrics": {}}



        history = [

            {"date": idx.strftime("%Y-%m-%d"), "actual": float(val)}

            for idx, val in series.items()

        ]



        forecast_points = []
        metrics = {}

        if product:
            forecast_record = (

                DemandForecast.objects.filter(product=product).order_by("-generated_at").first()

            )

            if forecast_record and len(series) > 0:

                daily_pred = float(forecast_record.predicted_demand) / max(

                    (forecast_record.forecast_period_end - forecast_record.forecast_period_start).days, 1

                )

                last_date = series.index[-1]

                for i in range(1, 31):

                    d = last_date + timedelta(days=i)

                    forecast_points.append({"date": d.strftime("%Y-%m-%d"), "predicted": daily_pred})



            if forecast_record:

                metrics = {

                    "mae": float(forecast_record.mae) if forecast_record.mae else None,

                    "rmse": float(forecast_record.rmse) if forecast_record.rmse else None,

                    "mape": float(forecast_record.mape) if forecast_record.mape else None,

                    "model_name": forecast_record.model_name,

                }
        elif org:
            total_daily_pred = 0
            for p in Product.objects.filter(organization=org):
                record = DemandForecast.objects.filter(product=p).order_by("-generated_at").first()
                if record:
                    days_diff = max((record.forecast_period_end - record.forecast_period_start).days, 1)
                    total_daily_pred += float(record.predicted_demand) / days_diff
            
            if len(series) > 0:
                last_date = series.index[-1]
                for i in range(1, 31):
                    d = last_date + timedelta(days=i)
                    forecast_points.append({"date": d.strftime("%Y-%m-%d"), "predicted": total_daily_pred})
            metrics = {"model_name": "aggregate"}



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



        annual_demand = avg_daily * 365
        setup_cost = 50.0
        unit_price = float(product.unit_price) if product.unit_price else 10.0
        holding_cost = max(0.5, unit_price * 0.15)

        if annual_demand > 0:
            import math
            eoq = int(math.sqrt((2 * annual_demand * setup_cost) / holding_cost))
        else:
            eoq = 0

        suggested = max(0, reorder_point - current_stock + int(predicted_demand / 30))
        if suggested > 0:
            suggested = max(suggested, eoq)

        if suggested == 0 and current_stock <= product.minimum_level:
            suggested = max(product.reorder_level, reorder_point - current_stock, eoq)

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
            "economic_order_quantity": eoq,
            "eoq_formula": "sqrt((2 * annual_demand * setup_cost) / holding_cost)"
        }

        ReorderRecommendation.objects.filter(product=product, is_active=True).update(is_active=False)

        rec = ReorderRecommendation.objects.create(
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

        if (current_stock <= reorder_point) and product.supplier:
            try:
                from procurement.models import PurchaseOrder, PurchaseOrderLine
                from procurement.services import PurchaseOrderService
                from accounts.models import User

                po = PurchaseOrder.objects.filter(
                    organization=product.organization,
                    supplier=product.supplier,
                    status=PurchaseOrder.Status.DRAFT
                ).first()

                qty_to_order = rec.suggested_quantity or max(product.reorder_level, 1)

                if not po:
                    creator = User.objects.filter(organization=product.organization).first()
                    if creator:
                        PurchaseOrderService.create_order(
                            organization=product.organization,
                            supplier=product.supplier,
                            user=creator,
                            lines=[{
                                "product": product,
                                "quantity_ordered": qty_to_order,
                                "unit_cost": product.unit_price,
                            }]
                        )
                else:
                    if not po.lines.filter(product=product).exists():
                        PurchaseOrderLine.objects.create(
                            purchase_order=po,
                            product=product,
                            quantity_ordered=qty_to_order,
                            unit_cost=product.unit_price,
                        )
                        po.recalculate_total()
            except Exception:
                pass

        return rec



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

                series = ForecastingService._daily_demand_series(product)
                demand_std = float(series.std()) if len(series) > 1 else 0.0
                volatility = "high" if (avg_daily > 0 and demand_std / avg_daily > 0.5) else "normal"

                if days_until_stockout <= 0:
                    stockout_probability = 100.0
                else:
                    ratio = days_until_stockout / (lead_time or 1.0)
                    stockout_probability = round(max(10.0, min(99.0, (1.0 - ratio) * 100.0)), 1)
                    if volatility == "high":
                        stockout_probability = min(99.0, stockout_probability + 15.0)

                unit_price = float(product.unit_price) if product.unit_price else 10.0
                financial_impact = round(unit_price * avg_daily * lead_time, 2)

                PredictiveAlert.objects.filter(product=product, is_resolved=False).update(
                    is_resolved=True
                )

                pa = PredictiveAlert.objects.create(
                    product=product,
                    predicted_stockout_date=stockout_date,
                    threshold_date=threshold_date,
                    severity=(
                        PredictiveAlert.Severity.CRITICAL
                        if days_until_stockout <= lead_time / 2 or volatility == "high"
                        else PredictiveAlert.Severity.WARNING
                    ),
                    explanation_json={
                        "current_stock": current_stock,
                        "avg_daily_demand": round(avg_daily, 2),
                        "days_until_stockout": round(days_until_stockout, 1),
                        "lead_time_days": lead_time,
                        "stockout_probability": stockout_probability,
                        "demand_volatility": volatility,
                        "estimated_financial_impact": financial_impact,
                        "risk_reason": "High Volatility Stockout Risk" if volatility == "high" else "Normal Lead-time Replenishment"
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

