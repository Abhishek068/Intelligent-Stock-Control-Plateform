"use client";

import { CloudRain, Calendar, TrendingUp, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function ExternalSignalsBar({ signals = [], className = "" }) {
  const list = signals.length > 0 ? signals : [
    { type: "weather", label: "London Weather", value: "14.5°C (Overcast & Mild)", multiplier: "1.00x (Normal Demand)" },
    { type: "holiday", label: "UK Bank Holidays", value: "Summer Bank Holiday", multiplier: "+20% Surge" },
    { type: "trends", label: "Google Search Index", value: "High Search Interest", multiplier: "1.15x Boost" },
  ];

  const getIcon = (type) => {
    switch (type) {
      case "weather":
        return <CloudRain className="h-3.5 w-3.5 text-cyan-400" />;
      case "holiday":
        return <Calendar className="h-3.5 w-3.5 text-purple-400" />;
      default:
        return <TrendingUp className="h-3.5 w-3.5 text-amber-400" />;
    }
  };

  return (
    <div className={`p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 shadow-md backdrop-blur flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${className}`}>
      <div className="flex items-center space-x-2">
        <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
        <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
          Active AI External Factors
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {list.map((item, idx) => (
          <div
            key={idx}
            className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300"
          >
            {getIcon(item.type)}
            <span className="font-semibold text-slate-200">{item.label}:</span>
            <span className="text-slate-400">{item.value}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/30 text-amber-300 bg-amber-500/10 font-mono">
              {item.multiplier}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
