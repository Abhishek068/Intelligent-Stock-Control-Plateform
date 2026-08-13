import numpy as np
import pandas as pd
from decimal import Decimal


class DemandPatternClassificationService:
    """
    Syntetos & Boylan (2005) Demand Pattern Categorization Engine.
    Classifies inventory items into 4 demand pattern categories based on:
    - ADI (Average Demand Interval): Average periods between non-zero demand transactions. (Cutoff = 1.32)
    - CV2 (Coefficient of Variation Squared): Variance of non-zero demand size over mean demand squared. (Cutoff = 0.49)
    
    Demand Categories:
    - Smooth: ADI < 1.32, CV2 < 0.49 (Regular occurrence, stable quantity) -> Best model: Holt-Winters
    - Erratic: ADI < 1.32, CV2 >= 0.49 (Regular occurrence, variable quantity) -> Best model: ARIMA / SMA
    - Intermittent: ADI >= 1.32, CV2 < 0.49 (Infrequent occurrence, stable quantity) -> Best model: Croston's Method / SBA
    - Lumpy: ADI >= 1.32, CV2 >= 0.49 (Infrequent occurrence, variable quantity) -> Best model: Croston-SBA + Volatility Buffer
    """

    ADI_THRESHOLD = 1.32
    CV2_THRESHOLD = 0.49

    @classmethod
    def classify_demand_series(cls, series: pd.Series):
        if series is None or len(series) == 0:
            return {
                "pattern": "smooth",
                "label": "Smooth Demand",
                "adi": 1.0,
                "cv2": 0.0,
                "recommended_model": "exponential_smoothing",
                "description": "Baseline regular demand pattern",
            }

        non_zero_series = series[series > 0]
        total_periods = len(series)
        non_zero_count = len(non_zero_series)

        if non_zero_count == 0:
            adi = float(total_periods) if total_periods > 0 else 1.0
            cv2 = 0.0
        else:
            adi = float(total_periods) / float(non_zero_count)
            mean_nz = float(non_zero_series.mean())
            std_nz = float(non_zero_series.std()) if non_zero_count > 1 else 0.0
            cv2 = (std_nz / mean_nz) ** 2 if mean_nz > 0 else 0.0

        adi = round(adi, 2)
        cv2 = round(cv2, 2)

        if adi < cls.ADI_THRESHOLD and cv2 < cls.CV2_THRESHOLD:
            pattern = "smooth"
            label = "Smooth Demand"
            rec_model = "exponential_smoothing"
            desc = "Regular demand occurrences with low quantity variability"
        elif adi < cls.ADI_THRESHOLD and cv2 >= cls.CV2_THRESHOLD:
            pattern = "erratic"
            label = "Erratic Demand"
            rec_model = "arima"
            desc = "Regular demand occurrences but highly variable order sizes"
        elif adi >= cls.ADI_THRESHOLD and cv2 < cls.CV2_THRESHOLD:
            pattern = "intermittent"
            label = "Intermittent Demand"
            rec_model = "croston_sba"
            desc = "Infrequent demand occurrences with predictable order sizes"
        else:
            pattern = "lumpy"
            label = "Lumpy Demand"
            rec_model = "croston_sba"
            desc = "Infrequent demand occurrences AND highly variable order sizes"

        return {
            "pattern": pattern,
            "label": label,
            "adi": adi,
            "cv2": cv2,
            "recommended_model": rec_model,
            "description": desc,
        }

    @classmethod
    def croston_sba_forecast(cls, series: pd.Series, horizon_days=30, alpha=0.1):
        """
        Syntetos-Boylan Approximation (SBA) modification of Croston's method for intermittent/lumpy demand.
        Forecasts demand size z_hat and interval p_hat independently.
        """
        if series is None or len(series) == 0:
            return pd.Series([0.0] * horizon_days)

        y = series.values
        n = len(y)

        first_non_zero = np.where(y > 0)[0]
        if len(first_non_zero) == 0:
            return pd.Series([0.0] * horizon_days)

        z_hat = float(y[first_non_zero[0]])
        p_hat = 1.0
        q = 1.0

        for i in range(first_non_zero[0] + 1, n):
            if y[i] > 0:
                z_hat = alpha * y[i] + (1 - alpha) * z_hat
                p_hat = alpha * q + (1 - alpha) * p_hat
                q = 1.0
            else:
                q += 1.0

        sba_factor = 1.0 - (alpha / 2.0)
        daily_rate = (z_hat / max(p_hat, 1.0)) * sba_factor if p_hat > 0 else 0.0
        daily_rate = max(0.0, daily_rate)

        return pd.Series([daily_rate] * horizon_days)
