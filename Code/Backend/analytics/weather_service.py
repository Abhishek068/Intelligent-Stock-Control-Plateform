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
        Returns:
            multiplier (float): 1.0 means normal demand. >1.0 means increased demand due to weather.
            context (dict): Weather context to save with the forecast.
        """
        api_key = getattr(settings, "OPENWEATHER_API_KEY", None)
        if not api_key:
            return 1.0, {"error": "OPENWEATHER_API_KEY not configured", "city": city}
            
        try:
            params = {
                "q": city,
                "appid": api_key,
                "units": "metric"
            }
            response = requests.get(cls.BASE_URL, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            forecast_list = data.get("list", [])
            if not forecast_list:
                return 1.0, {"error": "No forecast data returned", "city": city}
                
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
                
            context = {
                "city": city,
                "avg_temp_c": round(avg_temp, 1),
                "min_temp_c": round(min_temp, 1),
                "max_temp_c": round(max_temp, 1),
                "extreme_weather": has_extreme_weather,
                "multiplier": multiplier
            }
            return multiplier, context
            
        except Exception as e:
            logger.error(f"WeatherService error: {e}")
            return 1.0, {"error": str(e), "city": city}
