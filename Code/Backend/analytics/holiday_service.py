import requests
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)

class HolidayService:
    BASE_URL = "https://date.nager.at/api/v3/PublicHolidays"
    
    @classmethod
    def get_holiday_impact(cls, horizon_days=30, country_code="GB"):
        """
        Fetches the public holidays for the current year and checks if any fall 
        within the upcoming forecast horizon.
        Returns:
            multiplier (float): 1.0 means normal demand. >1.0 means increased demand due to a holiday.
            context (dict): Holiday context to save with the forecast.
        """
        try:
            today = timezone.now().date()
            year = today.year
            
            url = f"{cls.BASE_URL}/{year}/{country_code}"
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            holidays = response.json()
            
            upcoming_holidays = []
            forecast_end = today + timedelta(days=horizon_days)
            
            for h in holidays:
                h_date_str = h.get("date")
                if h_date_str:
                    from datetime import datetime
                    h_date = datetime.strptime(h_date_str, "%Y-%m-%d").date()
                    if today <= h_date <= forecast_end:
                        upcoming_holidays.append(h)
            
            multiplier = 1.0
            context = {
                "country": country_code,
                "upcoming_holidays": []
            }
            
            if upcoming_holidays:
                multiplier = 1.20 
                
                context["upcoming_holidays"] = [
                    {"name": h.get("name"), "date": h.get("date"), "type": h.get("types", [])}
                    for h in upcoming_holidays
                ]
                context["multiplier"] = multiplier
                
            return multiplier, context
            
        except Exception as e:
            logger.error(f"HolidayService error: {e}")
            return 1.0, {"error": str(e), "country": country_code}
