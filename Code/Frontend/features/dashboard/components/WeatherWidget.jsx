"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudRain, Sun, Snowflake, Thermometer, Zap, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { dashboardApi } from "@/lib/api";

const UK_CITIES = [
  { id: "London", label: "London 🇬🇧" },
  { id: "Manchester", label: "Manchester 🇬🇧" },
  { id: "Birmingham", label: "Birmingham 🇬🇧" },
  { id: "Glasgow", label: "Glasgow 🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { id: "Edinburgh", label: "Edinburgh 🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { id: "Liverpool", label: "Liverpool 🇬🇧" },
  { id: "Bristol", label: "Bristol 🇬🇧" },
  { id: "Leeds", label: "Leeds 🇬🇧" },
  { id: "Belfast", label: "Belfast 🇬🇧" },
  { id: "Cardiff", label: "Cardiff 🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
  { id: "Newcastle", label: "Newcastle 🇬🇧" },
  { id: "Sheffield", label: "Sheffield 🇬🇧" },
  { id: "Nottingham", label: "Nottingham 🇬🇧" },
  { id: "Southampton", label: "Southampton 🇬🇧" },
];

export function WeatherWidget({ initialData = null }) {
  const [selectedCity, setSelectedCity] = useState("London");
  const [weather, setWeather] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWeather = async (targetCity = selectedCity, isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await dashboardApi.getWeather(targetCity);
      const payload = res?.data?.data ? res.data.data : (res?.data || res);
      if (payload) {
        const clientTime = new Date().toLocaleTimeString();
        setWeather({ ...payload, last_updated: clientTime });
        if (isManual) toast.success(`Live weather for ${targetCity} re-synced!`);
      }
    } catch (err) {
      console.error("Failed to fetch weather widget data:", err);
      if (isManual) toast.error("Failed to re-sync weather data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCityChange = (city) => {
    setSelectedCity(city);
    setLoading(true);
    fetchWeather(city, false);
  };

  useEffect(() => {
    fetchWeather(selectedCity, false);
  }, [selectedCity]);

  if (loading) {
    return (
      <Card className="bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-md">
        <CardContent className="p-5 flex items-center justify-center space-x-3 text-slate-500 dark:text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin text-cyan-600 dark:text-cyan-400" />
          <span className="text-sm font-medium">Loading live London weather...</span>
        </CardContent>
      </Card>
    );
  }

  const data = weather || {
    city: "London",
    country: "UK",
    temp_c: 14.5,
    min_temp_c: 11.0,
    max_temp_c: 17.5,
    condition: "Overcast & Mild",
    icon: "cloud",
    extreme_weather: false,
    multiplier: 1.0,
    multiplier_display: "1.00x (Normal Demand)",
    status: "simulated",
  };

  const isMultiplierActive = data.multiplier > 1.0;

  const renderIcon = () => {
    switch (data.icon) {
      case "sun":
        return <Sun className="h-8 w-8 text-amber-500 dark:text-amber-400 animate-pulse" />;
      case "rain":
        return <CloudRain className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />;
      case "cold":
        return <Snowflake className="h-8 w-8 text-blue-500 dark:text-blue-300" />;
      default:
        return <Cloud className="h-8 w-8 text-slate-500 dark:text-slate-300" />;
    }
  };

  return (
    <Card className="relative overflow-hidden bg-white/85 dark:bg-slate-900/90 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xl shadow-slate-200/40 dark:shadow-lg hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300">
      {/* Background ambient glow effect */}
      <div
        className={`absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-20 pointer-events-none ${
          isMultiplierActive
            ? "bg-amber-500"
            : data.icon === "sun"
            ? "bg-amber-400"
            : "bg-cyan-500"
        }`}
      />

      <CardContent className="p-5">
        {/* Header row: Title, Location Dropdown & Refresh button */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-ping" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Live Weather Context
            </span>
            <Select value={selectedCity} onValueChange={handleCityChange}>
              <SelectTrigger className="h-7 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/60 text-cyan-700 dark:text-cyan-300 rounded-lg px-2 py-0 focus:ring-1 focus:ring-cyan-500/30">
                <SelectValue placeholder="Select City" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-xl max-h-60">
                {UK_CITIES.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs focus:bg-cyan-50 dark:focus:bg-cyan-500/20 focus:text-cyan-700 dark:focus:text-cyan-200 cursor-pointer">
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            {data.last_updated && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono hidden sm:inline">
                Last synced: {data.last_updated}
              </span>
            )}
            <button
              onClick={() => fetchWeather(selectedCity, true)}
              disabled={refreshing}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-1 cursor-pointer"
              title="Refresh Live Weather Data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-cyan-600 dark:text-cyan-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Temperature & Condition display */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/50 flex items-center justify-center shadow-xs">
              {renderIcon()}
            </div>
            <div>
              <div className="flex items-baseline space-x-2">
                <div className="flex items-baseline space-x-1" title="Live Current Real-Time Temperature Right Now">
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-mono">
                    {Math.round(data.temp_c)}°C
                  </span>
                  <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold uppercase font-mono">LIVE NOW</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-0.5" title="Today's Minimum Low to Today's Maximum High">
                  <Thermometer className="h-3 w-3 text-slate-400" />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Today:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{Math.round(data.min_temp_c)}° - {Math.round(data.max_temp_c)}°</span>
                </span>
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {data.condition}
              </p>
            </div>
          </div>

          {/* AI Demand Multiplier badge */}
          <div className="flex flex-col md:items-end justify-center space-y-1">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-500 dark:text-amber-400" /> AI Demand Multiplier
            </span>
            <div
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                isMultiplierActive
                  ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-300 shadow-sm"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400"
              }`}
            >
              <span>{data.multiplier_display}</span>
            </div>
          </div>
        </div>

        {/* Optional extreme weather alert banner */}
        {data.extreme_weather && (
          <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 flex items-center space-x-2 text-amber-700 dark:text-amber-400 text-xs font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Extreme weather detected — demand volatility boost active.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
