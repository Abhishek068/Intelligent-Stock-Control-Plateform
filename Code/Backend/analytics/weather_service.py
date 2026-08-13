import requests
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class WeatherService:
    BASE_URL = "https://api.openweathermap.org/data/2.5/forecast"
    
    UK_CITIES_COORDS = {
        "London": (51.5074, -0.1278),
        "Manchester": (53.4808, -2.2426),
        "Birmingham": (52.4862, -1.8904),
        "Glasgow": (55.8642, -4.2518),
        "Edinburgh": (55.9533, -3.1883),
        "Liverpool": (53.4084, -2.9916),
        "Bristol": (51.4545, -2.5879),
        "Leeds": (53.8008, -1.5491),
        "Belfast": (54.5973, -5.9301),
        "Cardiff": (51.4816, -3.1791),
        "Newcastle": (54.9783, -1.6178),
        "Sheffield": (53.3811, -1.4701),
        "Nottingham": (52.9548, -1.1581),
        "Southampton": (50.9097, -1.4044),
    }

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
                        elif max_temp > 25:
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

        # Free Open-Meteo Live Weather API - No API Key Needed
        try:
            lat, lon = cls.UK_CITIES_COORDS.get(city, cls.UK_CITIES_COORDS.get(city.title(), (51.5074, -0.1278)))
            open_meteo_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,weather_code&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min,rain_sum&timezone=Europe%2FLondon"
            res = requests.get(open_meteo_url, timeout=5)
            if res.status_code == 200:
                data = res.json()
                daily = data.get("daily", {})
                hourly = data.get("hourly", {})
                current_obj = data.get("current", {})

                daily_max_list = daily.get("temperature_2m_max", [25.0])
                daily_min_list = daily.get("temperature_2m_min", [15.0])
                
                # Today's high/low
                max_temp = daily_max_list[0] if len(daily_max_list) > 0 else 25.0
                min_temp = daily_min_list[0] if len(daily_min_list) > 0 else 15.0

                # Match exact current UK local hour from Open-Meteo hourly forecast
                from django.utils import timezone
                now_local = timezone.now()
                target_time_prefix = now_local.strftime("%Y-%m-%dT%H:00")
                
                hourly_times = hourly.get("time", [])
                hourly_temps = hourly.get("temperature_2m", [])
                
                current_temp = current_obj.get("temperature_2m", None)
                if target_time_prefix in hourly_times:
                    idx = hourly_times.index(target_time_prefix)
                    current_temp = hourly_temps[idx]
                
                if current_temp is None:
                    current_temp = max_temp if (12 <= now_local.hour <= 18) else (min_temp + max_temp) / 2.0
                
                rain_sum = sum(daily.get("rain_sum", [0.0]))
                has_extreme = rain_sum > 15.0 or max_temp >= 30.0
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
            
            if max_t >= 30 or temp_c >= 25:
                condition = "Hot & Sunny (Heatwave)"
                icon = "sun"
                mult = max(mult, 1.15)
            elif extreme and temp_c > 20:
                condition = "Warm Rain & Summer Showers"
                icon = "rain"
                mult = max(mult, 1.10)
            elif extreme:
                condition = "Heavy Rain & Rainy Weather"
                icon = "rain"
                mult = max(mult, 1.10)
            elif temp_c < 5:
                condition = "Cold Snap"
                icon = "cold"
            elif temp_c >= 18:
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

