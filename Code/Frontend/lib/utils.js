import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatModelName(modelName) {
  if (!modelName) return "—";

  const knownModels = {
    croston_sba: "Croston SBA",
    croston_sba_weather_holiday_events_adjusted: "Croston SBA (Weather & Holiday Adjusted)",
    croston_sba_weather_adjusted: "Croston SBA (Weather Adjusted)",
    croston_sba_holiday_events_adjusted: "Croston SBA (Holiday Events Adjusted)",
    exponential_smoothing: "Exponential Smoothing",
    exponential_smoothing_seasonal: "Exponential Smoothing (Seasonal)",
    exponential_smoothing_weather_holiday_events_adjusted: "Exponential Smoothing (Weather & Holiday Adjusted)",
    exponential_smoothing_weather_adjusted: "Exponential Smoothing (Weather Adjusted)",
    exponential_smoothing_holiday_events_adjusted: "Exponential Smoothing (Holiday Events Adjusted)",
    arima: "ARIMA",
    arima_weather_holiday_events_adjusted: "ARIMA (Weather & Holiday Adjusted)",
    arima_weather_adjusted: "ARIMA (Weather Adjusted)",
    arima_holiday_events_adjusted: "ARIMA (Holiday Events Adjusted)",
    simple_moving_average: "Simple Moving Average",
    naive_baseline: "Naive Baseline",
    average_demand: "Average Demand",
    cold_start_baseline: "Cold Start Baseline",
    aggregate_multi_product_model: "Aggregate Multi-Product Model",
  };

  if (knownModels[modelName]) return knownModels[modelName];

  let formatted = String(modelName);
  let adjustments = [];

  if (formatted.endsWith("_adjusted")) {
    formatted = formatted.replace("_adjusted", "");
    if (formatted.includes("_weather_holiday_events")) {
      formatted = formatted.replace("_weather_holiday_events", "");
      adjustments.push("Weather & Holiday Adjusted");
    } else if (formatted.includes("_weather")) {
      formatted = formatted.replace("_weather", "");
      adjustments.push("Weather Adjusted");
    } else if (formatted.includes("_holiday_events")) {
      formatted = formatted.replace("_holiday_events", "");
      adjustments.push("Holiday Events Adjusted");
    }
  }

  let baseName = formatted
    .split("_")
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === "sba") return "SBA";
      if (lower === "arima") return "ARIMA";
      if (lower === "hw") return "Holt-Winters";
      if (lower === "ai") return "AI";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");

  if (adjustments.length > 0) {
    return `${baseName} (${adjustments.join(", ")})`;
  }

  return baseName;
}

export function formatMetric(value, decimals = 2) {
  if (value == null || isNaN(Number(value))) return "—";
  return Number(value).toFixed(decimals);
}