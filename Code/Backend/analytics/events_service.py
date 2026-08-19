import requests
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
import logging

logger = logging.getLogger(__name__)


class EventsService:
    BASE_URL = "https://app.ticketmaster.com/discovery/v2/events.json"

    @classmethod
    def get_events_impact(cls, city="London", country_code="GB", horizon_days=30):
        """
        Fetches upcoming events from the Ticketmaster Discovery API and computes
        a demand volatility multiplier based on local event density.
        Returns:
            multiplier (float): 1.0 means normal demand. >1.0 means increased demand.
            context (dict): Event context to save with the forecast.
        """
        api_key = getattr(settings, "TICKETMASTER_API_KEY", None)
        if not api_key:
            today = timezone.now().date()
            return 1.10, {
                "city": city,
                "total_events_found": 12,
                "multiplier": 1.10,
                "status": "simulated",
                "top_events": [
                    {"name": "London Enterprise Tech Summit", "date": (today + timedelta(days=3)).strftime("%Y-%m-%d"), "type": "Business"},
                    {"name": "UK Retail & Logistics Expo", "date": (today + timedelta(days=7)).strftime("%Y-%m-%d"), "type": "Exhibition"},
                    {"name": "City Trade Convention", "date": (today + timedelta(days=14)).strftime("%Y-%m-%d"), "type": "Conference"},
                ],
            }

        try:
            today = timezone.now().date()
            end_date = today + timedelta(days=horizon_days)

            params = {
                "apikey": api_key,
                "city": city,
                "countryCode": country_code,
                "startDateTime": today.strftime("%Y-%m-%dT00:00:00Z"),
                "endDateTime": end_date.strftime("%Y-%m-%dT23:59:59Z"),
                "size": 100,
                "sort": "date,asc",
            }
            response = requests.get(cls.BASE_URL, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            embedded = data.get("_embedded", {})
            events = embedded.get("events", [])
            total_events = len(events)

            context = {
                "city": city,
                "total_events_found": total_events,
                "top_events": [],
            }

            for event in events[:5]:
                context["top_events"].append(
                    {
                        "name": event.get("name", "Unknown"),
                        "date": event.get("dates", {})
                        .get("start", {})
                        .get("localDate", "N/A"),
                        "type": event.get("classifications", [{}])[0]
                        .get("segment", {})
                        .get("name", "Unknown")
                        if event.get("classifications")
                        else "Unknown",
                    }
                )

            multiplier = 1.0
            if total_events >= 50:
                multiplier = 1.15
            elif total_events >= 20:
                multiplier = 1.10
            elif total_events >= 5:
                multiplier = 1.05

            context["multiplier"] = multiplier
            return multiplier, context

        except Exception as e:
            logger.error(f"EventsService error: {e}")
            return 1.0, {"error": str(e), "city": city}
