import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class WeatherService:
    BASE_URL = "https://api.openweathermap.org/data/2.5/forecast"
    
    @classmethod
    def get_weather_impact(cls, city="London"):
        """
        Fetches the 5-day weather forecast and computes a demand volatility multiplier.
        Uses OpenWeather API if OPENWEATHER_API_KEY is configured, or Open-Meteo Live API (Free, No Key Required).
        """
        api_key = getattr(settings, "OPENWEATHER_API_KEY", None)
        
        if api_key:
            try:
                params = {
                    "q": city,
                    "appid": api_key,
                    "units": "metric"
                }
                response = requests.get(cls.BASE_URL, params=params, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    forecast_list = data.get("list", [])
                    if forecast_list:
                        temps = [item["main"]["temp"] for item in forecast_list]
                        avg_temp = sum(temps) / len(temps)
                        max_temp = max(temps)
                        min_temp = min(temps)
                        has_extreme_weather = any(
                            item.get("weather", [{}])[0].get("main") in ["Rain", "Snow", "Extreme", "Thunderstorm"]
                            for item in forecast_list
                        )
                        multiplier = 1.0
                        if min_temp < 5:
                            multiplier += 0.15
                        elif max_temp > 30:
                            multiplier += 0.10
                        if has_extreme_weather:
                            multiplier += 0.10
                        return multiplier, {
                            "city": city,
                            "avg_temp_c": round(avg_temp, 1),
                            "min_temp_c": round(min_temp, 1),
                            "max_temp_c": round(max_temp, 1),
                            "extreme_weather": has_extreme_weather,
                            "multiplier": multiplier,
                            "provider": "OpenWeather API"
                        }
            except Exception as e:
                logger.error(f"OpenWeather API error: {e}")

        # Free Open-Meteo Live Weather API (London: 51.5074, -0.1278) - No API Key Needed
        try:
            open_meteo_url = "https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,rain_sum&timezone=Europe%2FLondon"
            res = requests.get(open_meteo_url, timeout=5)
            if res.status_code == 200:
                data = res.json()
                current_temp = data.get("current", {}).get("temperature_2m", 15.0)
                daily = data.get("daily", {})
                max_temp = max(daily.get("temperature_2m_max", [current_temp]))
                min_temp = min(daily.get("temperature_2m_min", [current_temp]))
                rain_sum = sum(daily.get("rain_sum", [0.0]))
                
                has_extreme = rain_sum > 2.0
                multiplier = 1.0
                if min_temp < 5:
                    multiplier += 0.15
                elif max_temp > 25:
                    multiplier += 0.10
                if has_extreme:
                    multiplier += 0.10

                return multiplier, {
                    "city": city,
                    "avg_temp_c": round(current_temp, 1),
                    "min_temp_c": round(min_temp, 1),
                    "max_temp_c": round(max_temp, 1),
                    "extreme_weather": has_extreme,
                    "multiplier": multiplier,
                    "provider": "Open-Meteo Live API"
                }
        except Exception as e:
            logger.error(f"Open-Meteo API error: {e}")

        return 1.0, {"error": "Weather fetch failed", "city": city}

    @classmethod
    def get_weather_widget_data(cls, city="London"):
        """
        Provides structured weather dashboard widget data.
        Returns live weather if OPENWEATHER_API_KEY is active,
        or a realistic fallback weather context for London UI presentation.
        """
        multiplier, context = cls.get_weather_impact(city=city)
        
        if "error" in context:
            temp_c = 24.5
            min_t = 18.0
            max_t = 34.0
            condition = "Warm & Clear (Heatwave)"
            icon = "sun"
            extreme = False
            mult = 1.10
            mult_display = "1.10x (+10% Heatwave Demand)"
            status = "simulated"
        else:
            temp_c = context.get("avg_temp_c", 24.0)
            extreme = context.get("extreme_weather", False)
            mult = context.get("multiplier", 1.0)
            min_t = context.get("min_temp_c", 18.0)
            max_t = context.get("max_temp_c", 34.0)
            
            if extreme:
                condition = "Rain & Rainy Weather"
                icon = "rain"
                mult = max(mult, 1.10)
            elif temp_c < 5:
                condition = "Cold Snap"
                icon = "cold"
            elif temp_c > 20:
                condition = "Warm & Clear (Summer)"
                icon = "sun"
                mult = max(mult, 1.10)
            else:
                condition = "Mild / Overcast"
                icon = "cloud"

            if mult > 1.0:
                pct = int(round((mult - 1.0) * 100))
                mult_display = f"{mult:.2f}x (+{pct}% Weather Impact)"
            else:
                mult_display = "1.00x (Normal Demand)"
            status = "live"

        from django.utils import timezone
        return {
            "city": city,
            "country": "UK",
            "temp_c": temp_c,
            "min_temp_c": min_t,
            "max_temp_c": max_t,
            "condition": condition,
            "icon": icon,
            "extreme_weather": extreme,
            "multiplier": mult,
            "multiplier_display": mult_display,
            "status": status,
            "last_updated": timezone.now().strftime("%H:%M:%S"),
        }

