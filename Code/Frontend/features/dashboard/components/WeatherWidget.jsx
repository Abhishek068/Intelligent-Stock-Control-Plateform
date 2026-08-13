"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudRain, Sun, Snowflake, Thermometer, Zap, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { dashboardApi } from "@/lib/api";

export function WeatherWidget({ initialData = null }) {
  const [weather, setWeather] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWeather = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await dashboardApi.getWeather("London");
      if (res?.data) {
        setWeather(res.data);
        if (isManual) toast.success("Live weather context re-synced!");
      }
    } catch (err) {
      console.error("Failed to fetch weather widget data:", err);
      if (isManual) toast.error("Failed to re-sync weather data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!initialData) {
      fetchWeather();
    }
  }, [initialData]);

  if (loading) {
    return (
      <Card className="bg-slate-900/80 border-slate-800 text-slate-100 shadow-md">
        <CardContent className="p-5 flex items-center justify-center space-x-3 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin text-cyan-400" />
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
        return <Sun className="h-8 w-8 text-amber-400 animate-pulse" />;
      case "rain":
        return <CloudRain className="h-8 w-8 text-cyan-400" />;
      case "cold":
        return <Snowflake className="h-8 w-8 text-blue-300" />;
      default:
        return <Cloud className="h-8 w-8 text-slate-300" />;
    }
  };

  return (
    <Card className="relative overflow-hidden bg-slate-900/90 border-slate-800 text-slate-100 shadow-lg hover:border-slate-700 transition-all duration-300">
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
        {/* Header row: Title, Location & Refresh button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Live Weather Context
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-700 text-slate-400 bg-slate-800/50">
              London, UK 🇬🇧
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            {data.last_updated && (
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                Last synced: {data.last_updated}
              </span>
            )}
            <button
              onClick={() => fetchWeather(true)}
              disabled={refreshing}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-md hover:bg-slate-800 flex items-center space-x-1"
              title="Refresh Live Weather Data"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Temperature & Condition display */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center">
              {renderIcon()}
            </div>
            <div>
              <div className="flex items-baseline space-x-1">
                <span className="text-2xl font-bold text-slate-100 font-mono">
                  {Math.round(data.temp_c)}°C
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-0.5">
                  <Thermometer className="h-3 w-3 text-slate-400" />
                  {Math.round(data.min_temp_c)}° - {Math.round(data.max_temp_c)}°
                </span>
              </div>
              <p className="text-xs font-medium text-slate-300">
                {data.condition}
              </p>
            </div>
          </div>

          {/* AI Demand Multiplier badge */}
          <div className="flex flex-col md:items-end justify-center space-y-1">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Zap className="h-3 w-3 text-amber-400" /> AI Demand Multiplier
            </span>
            <div
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                isMultiplierActive
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-sm shadow-amber-500/10"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}
            >
              <span>{data.multiplier_display}</span>
            </div>
          </div>
        </div>

        {/* Optional extreme weather alert banner */}
        {data.extreme_weather && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center space-x-2 text-amber-400 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="font-medium">
              Extreme weather detected — demand volatility boost active.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
