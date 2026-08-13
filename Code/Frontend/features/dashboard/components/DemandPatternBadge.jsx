"use client";

import { Activity, Info, BarChart2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function DemandPatternBadge({ patternInfo = {}, className = "" }) {
  const info = patternInfo || {};
  const pattern = (info.pattern || "smooth").toLowerCase();
  const label = info.label || "Smooth Demand";
  const adi = info.adi ?? 1.0;
  const cv2 = info.cv2 ?? 0.15;
  const description = info.description || "Regular demand occurrences with low quantity variability";

  const getStyle = () => {
    switch (pattern) {
      case "lumpy":
        return {
          bg: "bg-rose-500/15 border-rose-500/30 text-rose-300",
          dot: "bg-rose-400",
          modelTag: "Croston-SBA + Safety Buffer",
        };
      case "intermittent":
        return {
          bg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          dot: "bg-cyan-400",
          modelTag: "Croston-SBA Estimator",
        };
      case "erratic":
        return {
          bg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
          dot: "bg-amber-400",
          modelTag: "ARIMA / SMA Model",
        };
      default:
        return {
          bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
          dot: "bg-emerald-400",
          modelTag: "Holt-Winters Smoothing",
        };
    }
  };

  const style = getStyle();

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      <Popover>
        <PopoverTrigger asChild>
          <button className="cursor-pointer focus:outline-none shrink-0 max-w-full">
            <Badge
              variant="outline"
              className={`px-2 py-0.5 text-xs font-semibold flex items-center space-x-1 border shadow-sm hover:opacity-90 transition-opacity shrink-0 ${style.bg}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot} animate-pulse shrink-0`} />
              <span className="truncate">{label}</span>
              <span className="font-mono text-[10px] opacity-75 shrink-0">({adi} ADI)</span>
              <Info className="h-3 w-3 opacity-60 ml-0.5 shrink-0" />
            </Badge>
          </button>
        </PopoverTrigger>

        <PopoverContent className="w-80 bg-slate-900 border-slate-800 text-slate-100 p-4 shadow-xl text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold flex items-center gap-1.5 text-slate-200">
              <BarChart2 className="h-4 w-4 text-cyan-400" /> Syntetos-Boylan Classification
            </span>
            <Badge variant="outline" className={`text-[10px] ${style.bg}`}>
              {pattern.toUpperCase()}
            </Badge>
          </div>

          <p className="text-slate-300 leading-relaxed">{description}</p>

          <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
            <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">ADI (Interval)</span>
              <span className="text-slate-200 font-bold">{adi}</span>
              <span className="text-slate-500 block text-[9px] mt-0.5">Threshold: 1.32</span>
            </div>

            <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">CV² (Volatility)</span>
              <span className="text-slate-200 font-bold">{cv2}</span>
              <span className="text-slate-500 block text-[9px] mt-0.5">Threshold: 0.49</span>
            </div>
          </div>

          <div className="pt-1 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800">
            <span>Optimal Model:</span>
            <span className="font-semibold text-cyan-300 font-mono">{style.modelTag}</span>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
