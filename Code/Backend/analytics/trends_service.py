import logging

logger = logging.getLogger(__name__)


class TrendsService:
    @classmethod
    def get_trends_impact(cls, product_name=""):
        """
        Uses Google Trends (pytrends) to check if search interest for a product
        is currently spiking above its 90-day average.
        Returns:
            multiplier (float): 1.0 means normal demand. >1.0 means the product is trending.
            context (dict): Trends context to save with the forecast.
        """
        if not product_name:
            return 1.0, {"error": "No product name provided"}

        try:
            from pytrends.request import TrendReq

            pytrends = TrendReq(hl="en-GB", tz=0, timeout=(3, 5))

            pytrends.build_payload(
                [product_name], cat=0, timeframe="today 3-m", geo="GB", gprop=""
            )

            interest_df = pytrends.interest_over_time()

            if interest_df.empty:
                return 1.0, {
                    "product": product_name,
                    "status": "no_data",
                    "multiplier": 1.0,
                }

            avg_interest = float(interest_df[product_name].mean())
            recent_interest = float(interest_df[product_name].iloc[-1])

            multiplier = 1.0
            context = {
                "product": product_name,
                "avg_interest_90d": round(avg_interest, 1),
                "recent_interest": round(recent_interest, 1),
            }

            if avg_interest > 0:
                ratio = recent_interest / avg_interest
                if ratio >= 2.0:
                    multiplier = 1.15
                elif ratio >= 1.5:
                    multiplier = 1.10
                elif ratio >= 1.2:
                    multiplier = 1.05

                context["trend_ratio"] = round(ratio, 2)

            context["multiplier"] = multiplier
            return multiplier, context

        except ImportError:
            logger.warning("pytrends not installed. Skipping Google Trends analysis.")
            return 1.0, {"error": "pytrends library not installed", "product": product_name}
        except Exception as e:
            logger.error(f"TrendsService error: {e}")
            return 1.0, {"error": str(e), "product": product_name}
