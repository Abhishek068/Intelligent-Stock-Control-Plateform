"""O3 chatbot: OpenAI tool-calling loop with offline keyword fallback."""

from __future__ import annotations

import json
import re

from django.conf import settings

from analytics.chatbot_tools import OPENAI_TOOL_SCHEMAS, run_tool


SYSTEM_PROMPT = (
    "You are StockSense, a read-only inventory assistant for one organization. "
    "Answer using tools only. Never invent numbers. "
    "Refuse any request to create, update, delete, ship, adjust, or transfer stock. "
    "Be concise and use £ for currency when values are monetary. "
    "If a tool returns an error, explain it clearly."
)

HELP_TEXT = (
    "I can help with inventory questions. Try asking:\n"
    "• What is my current inventory valuation?\n"
    "• Which products are low on stock?\n"
    "• What should I reorder?\n"
    "• What batches expire soon?\n"
    "• How is supplier X performing?\n"
    "• Show open alerts\n"
    "• Forecast for product Y"
)


def _format_inventory_summary(data):
    return (
        f"Total inventory value is £{data['total_inventory_value']:,.2f} across "
        f"{data['total_products']} active products. "
        f"Low stock: {data['low_stock_count']}, out of stock: {data['out_of_stock_count']}, "
        f"open alerts: {data['open_alerts_count']}, active reorder recommendations: {data['reorder_count']}."
    )


def _format_low_stock(data):
    if not data.get("products"):
        return "No products are currently at or below minimum stock levels."
    lines = [f"Found {data['count']} low/out-of-stock products (showing top {len(data['products'])}):"]
    for p in data["products"]:
        lines.append(
            f"• {p['name']} ({p['sku']}): {p['stock']} on hand "
            f"(min {p['minimum_level']}) — {p['status'].replace('_', ' ')}"
        )
    return "\n".join(lines)


def _format_reorders(data):
    if not data.get("recommendations"):
        return "There are no active reorder recommendations right now."
    lines = [f"Top {len(data['recommendations'])} reorder recommendations:"]
    for r in data["recommendations"]:
        lines.append(
            f"• {r['product']} ({r['sku']}): suggest {r['suggested_quantity']} "
            f"(current {r['current_stock']}, priority {r['priority']})"
        )
    return "\n".join(lines)


def _format_expiring(data):
    if not data.get("batches"):
        return f"No batches expire within the next {data.get('window_days', 30)} days."
    lines = [f"{data['count']} batch(es) expiring within {data['window_days']} days:"]
    for b in data["batches"]:
        lines.append(
            f"• {b['product']} batch {b['batch_number']}: qty {b['quantity_on_hand']} "
            f"at {b['location']} — {b['days_to_expiry']} day(s) (exp {b['expiry_date']})"
        )
    return "\n".join(lines)


def _format_alerts(data):
    notes = data.get("unread_notifications") or []
    preds = data.get("predictive_alerts") or []
    if not notes and not preds:
        return "There are no open unread notifications or unresolved predictive alerts."
    lines = []
    if notes:
        lines.append(f"Unread notifications ({len(notes)}):")
        for n in notes:
            lines.append(f"• [{n['severity']}] {n['title']}: {n['message']}")
    if preds:
        lines.append(f"Predictive alerts ({len(preds)}):")
        for a in preds:
            lines.append(
                f"• [{a['severity']}] {a['product']} ({a['sku']}) "
                f"predicted stockout {a['predicted_stockout_date']}"
            )
    return "\n".join(lines)


def _format_suppliers(data):
    if data.get("error"):
        return data["error"]
    lines = ["Supplier performance:"]
    for s in data.get("suppliers") or []:
        lines.append(
            f"• {s['name']}: score {s['performance_score']:.0f}% "
            f"(delivery {s['delivery_rate']:.0f}%, accuracy {s['order_accuracy']:.0f}%, "
            f"lead time {s['lead_time_days']} days)"
        )
    return "\n".join(lines)


def _format_forecast(data):
    if data.get("error"):
        return data["error"]
    if "product" in data and "predicted_demand" in data:
        return (
            f"Forecast for {data['product']} ({data['sku']}): "
            f"{data['predicted_demand']:,.1f} units "
            f"({data['period_start']} → {data['period_end']}) using {data['model']}."
        )
    rows = data.get("forecasts") or []
    if not rows:
        return "No forecasts have been generated yet."
    lines = [f"Latest forecasts ({len(rows)}):"]
    for f in rows:
        lines.append(
            f"• {f['product']} ({f['sku']}): {f['predicted_demand']:,.1f} units via {f['model']}"
        )
    return "\n".join(lines)


def _format_product_stock(data):
    if data.get("error"):
        return data["error"]
    lines = [
        f"{data['name']} ({data['sku']}): {data['total_on_hand']} units on hand "
        f"(min {data['minimum_level']}, reorder {data['reorder_level']})."
    ]
    for loc in data.get("locations") or []:
        lines.append(f"• {loc['location']}: {loc['quantity_on_hand']} on hand ({loc['available']} available)")
    return "\n".join(lines)


FORMATTERS = {
    "get_inventory_summary": _format_inventory_summary,
    "get_low_stock_products": _format_low_stock,
    "get_reorder_recommendations": _format_reorders,
    "get_expiring_batches": _format_expiring,
    "get_open_alerts": _format_alerts,
    "get_supplier_performance": _format_suppliers,
    "get_forecast_summary": _format_forecast,
    "get_product_stock": _format_product_stock,
}


def _extract_quoted_or_tail(message, keywords):
    """Try to pull a product/supplier name after keywords or in quotes."""
    m = re.search(r"[\"']([^\"']+)[\"']", message)
    if m:
        return m.group(1).strip()
    lower = message.lower()
    for kw in keywords:
        idx = lower.find(kw)
        if idx >= 0:
            tail = message[idx + len(kw) :].strip(" :?-")
            if tail:
                return tail.split("?")[0].strip()
    return ""


class ChatbotService:
    @classmethod
    def is_ai_configured(cls):
        return bool(getattr(settings, "GROQ_API_KEY", "")) or bool(getattr(settings, "OPENAI_API_KEY", ""))

    @classmethod
    def ask(cls, *, organization, message):
        message = (message or "").strip()
        if not message:
            return {
                "reply": "Please ask a question about your inventory.",
                "mode": "offline",
                "tools_used": [],
            }
        if cls.is_ai_configured():
            try:
                return cls._ask_ai(organization=organization, message=message)
            except Exception as exc:
                offline = cls._ask_offline(organization=organization, message=message)
                offline["reply"] = (
                    f"(AI unavailable: {exc})\n\nFalling back to offline mode.\n\n"
                    + offline["reply"]
                )
                return offline
        return cls._ask_offline(organization=organization, message=message)

    @classmethod
    def _ask_offline(cls, *, organization, message):
        lower = message.lower()
        tools_used = []

        def call(name, **kwargs):
            tools_used.append(name)
            data = run_tool(name, organization, kwargs)
            formatter = FORMATTERS.get(name)
            if formatter and not data.get("error"):
                return formatter(data)
            if data.get("error"):
                return data["error"]
            return json.dumps(data, default=str)

        if any(k in lower for k in ("help", "what can you", "examples")):
            return {"reply": HELP_TEXT, "mode": "offline", "tools_used": []}

        if any(k in lower for k in ("valuat", "inventory value", "total value", "worth", "how much stock is worth")):
            return {"reply": call("get_inventory_summary"), "mode": "offline", "tools_used": tools_used}

        if any(k in lower for k in ("expir", "batch", "shelf life", "best before")):
            days = 30
            m = re.search(r"(\d+)\s*day", lower)
            if m:
                days = int(m.group(1))
            return {
                "reply": call("get_expiring_batches", days=days),
                "mode": "offline",
                "tools_used": tools_used,
            }

        if any(k in lower for k in ("reorder", "replenish", "order more")):
            return {
                "reply": call("get_reorder_recommendations"),
                "mode": "offline",
                "tools_used": tools_used,
            }

        if any(k in lower for k in ("low stock", "out of stock", "stockout", "running low", "below minimum")):
            return {"reply": call("get_low_stock_products"), "mode": "offline", "tools_used": tools_used}

        if any(k in lower for k in ("alert", "notification", "warning")):
            return {"reply": call("get_open_alerts"), "mode": "offline", "tools_used": tools_used}

        if any(k in lower for k in ("supplier", "vendor", "performance score", "delivery rate")):
            query = _extract_quoted_or_tail(message, ["supplier", "vendor", "for"])
            return {
                "reply": call("get_supplier_performance", query=query),
                "mode": "offline",
                "tools_used": tools_used,
            }

        if any(k in lower for k in ("forecast", "demand", "predict")):
            query = _extract_quoted_or_tail(message, ["forecast for", "forecast", "demand for", "for"])
            return {
                "reply": call("get_forecast_summary", query=query),
                "mode": "offline",
                "tools_used": tools_used,
            }

        if any(k in lower for k in ("how much", "stock of", "on hand", "quantity of", "do we have")):
            query = _extract_quoted_or_tail(
                message, ["how much", "stock of", "on hand for", "quantity of", "do we have"]
            )
            if query:
                return {
                    "reply": call("get_product_stock", query=query),
                    "mode": "offline",
                    "tools_used": tools_used,
                }

        if any(k in lower for k in ("summary", "dashboard", "overview", "status")):
            return {"reply": call("get_inventory_summary"), "mode": "offline", "tools_used": tools_used}

        return {"reply": HELP_TEXT, "mode": "offline", "tools_used": []}

    @classmethod
    def _ask_ai(cls, *, organization, message):
        from openai import OpenAI

        groq_key = getattr(settings, "GROQ_API_KEY", "")
        if groq_key:
            client = OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1")
            model = getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile") or "llama-3.3-70b-versatile"
            mode = "groq"
        else:
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini") or "gpt-4o-mini"
            mode = "openai"

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ]
        tools_used = []

        for _ in range(3):
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                tools=OPENAI_TOOL_SCHEMAS,
                tool_choice="auto",
                temperature=0.2,
            )
            choice = response.choices[0].message
            tool_calls = choice.tool_calls or []
            if not tool_calls:
                reply = (choice.content or "").strip() or HELP_TEXT
                return {"reply": reply, "mode": mode, "tools_used": tools_used}

            messages.append(
                {
                    "role": "assistant",
                    "content": choice.content,
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments or "{}",
                            },
                        }
                        for tc in tool_calls
                    ],
                }
            )
            for tc in tool_calls:
                name = tc.function.name
                try:
                    args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}
                tools_used.append(name)
                result = run_tool(name, organization, args)
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result, default=str),
                    }
                )

        return {
            "reply": "I gathered the data but could not finish composing an answer. Please try a simpler question.",
            "mode": mode,
            "tools_used": tools_used,
        }
