"use client";

import { CloudRain, Calendar, TrendingUp, Compass, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ExternalFactorsPanel({ weatherContext = {}, className = "" }) {
  const ctx = weatherContext || {};
  const weatherMult = ctx.multiplier || 1.0;
  const holiday = ctx.holiday_event || {};
  const events = ctx.local_events || {};
  const trends = ctx.google_trends || {};

  const holidayMult = holiday.multiplier || 1.0;
  const eventsMult = events.multiplier || 1.0;
  const trendsMult = trends.multiplier || 1.0;

  const totalMultiplier = Number((weatherMult * holidayMult * eventsMult * trendsMult).toFixed(2));
  const hasAdjustments = totalMultiplier > 1.0 || ctx.extreme_weather || (holiday.upcoming_holidays && holiday.upcoming_holidays.length > 0);

  // Extract individual factor cards
  const factors = [];

  // 1. Weather factor
  if (weatherMult > 1.0 || ctx.extreme_weather) {
    const pct = Math.round((weatherMult - 1.0) * 100);
    factors.push({
      id: "weather",
      icon: CloudRain,
      title: "Weather Volatility",
      description: ctx.extreme_weather
        ? "Rain or severe weather forecast in London"
        : ctx.avg_temp_c < 5
        ? `Cold snap forecast (${ctx.avg_temp_c}°C)`
        : `Temperature anomaly detected (${ctx.avg_temp_c}°C)`,
      impact: `+${pct > 0 ? pct : 10}% Demand`,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10 border-cyan-500/20",
    });
  }

  // 2. Bank Holiday factor
  if (holiday.upcoming_holidays && holiday.upcoming_holidays.length > 0) {
    const holidayName = holiday.upcoming_holidays[0]?.name || "Bank Holiday";
    const pct = Math.round((holidayMult - 1.0) * 100);
    factors.push({
      id: "holiday",
      icon: Calendar,
      title: "Holiday Impact",
      description: `${holidayName} detected in forecast window`,
      impact: `+${pct > 0 ? pct : 20}% Demand`,
      color: "text-purple-400",
      bg: "bg-purple-500/10 border-purple-500/20",
    });
  }

  // 3. Local Events factor
  if (events.total_events_found > 0 || eventsMult > 1.0) {
    const pct = Math.round((eventsMult - 1.0) * 100);
    factors.push({
      id: "events",
      icon: Compass,
      title: "Regional Events",
      description: `${events.total_events_found || 1} local public event(s) boosting area footfall`,
      impact: `+${pct > 0 ? pct : 10}% Footfall`,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    });
  }

  // 4. Google Trends factor
  if (trends.trend_ratio > 1.0 || trendsMult > 1.0) {
    const pct = Math.round((trendsMult - 1.0) * 100);
    factors.push({
      id: "trends",
      icon: TrendingUp,
      title: "Google Search Demand",
      description: `High online search volume index (${trends.trend_ratio || 1.15}x ratio)`,
      impact: `+${pct > 0 ? pct : 15}% Search Interest`,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    });
  }

  return (
    <Card className={`glass-card bg-slate-900/80 border-slate-800 text-slate-100 shadow-lg ${className}`}>
      <CardHeader className="pb-3 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Zap className="h-4 w-4 text-amber-400 shrink-0" />
          <CardTitle className="text-sm font-semibold text-slate-200">
            External Factors & AI Multipliers
          </CardTitle>
        </div>

        <Badge
          className={`text-xs font-mono px-2.5 py-0.5 border shrink-0 ${
            hasAdjustments
              ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
              : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
          }`}
        >
          {totalMultiplier}x Combined Multiplier
        </Badge>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {factors.length > 0 ? (
          <div className="space-y-2.5">
            {factors.map((f) => {
              const IconComp = f.icon;
              return (
                <div
                  key={f.id}
                  className={`p-3 rounded-lg border flex items-start justify-between ${f.bg} transition-all duration-200`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`p-1.5 rounded-md bg-slate-900/60 ${f.color}`}>
                      <IconComp className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">{f.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{f.description}</p>
                    </div>
                  </div>

                  <Badge variant="outline" className={`text-[11px] font-mono font-bold shrink-0 ${f.color} border-current/30`}>
                    {f.impact}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/40 text-slate-400 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Standard Baseline Prediction (No active weather or holiday demand surges).</span>
            </div>
            <span className="font-mono text-emerald-400 font-semibold">1.0x</span>
          </div>
        )}

        <div className="pt-2 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-1 border-t border-slate-800/60">
          <span>Target City: <strong className="text-slate-400 font-normal">{ctx.city || "London, UK"}</strong></span>
          <span>Signals: <strong className="text-slate-400 font-normal">Weather, Holidays, Trends</strong></span>
        </div>
      </CardContent>
    </Card>
  );
}
