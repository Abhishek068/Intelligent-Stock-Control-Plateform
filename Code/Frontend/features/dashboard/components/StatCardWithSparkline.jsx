"use client";

import dynamic from "next/dynamic";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);
const AreaChart = dynamic(
  () => import("recharts").then((m) => m.AreaChart),
  { ssr: false }
);
const Area = dynamic(() => import("recharts").then((m) => m.Area), {
  ssr: false,
});

export function StatCardWithSparkline({
  title,
  value,
  change = "+12.5%",
  changeType = "up", // "up" | "down" | "neutral"
  subtitle = "vs last month",
  colorScheme = "indigo", // "indigo" | "rose" | "amber" | "cyan" | "emerald" | "purple"
  sparklineData = [],
  icon: Icon,
}) {
  const colorConfig = {
    indigo: {
      cardBg:
        "from-indigo-500/10 via-purple-500/5 to-white/95 dark:from-indigo-500/15 dark:via-purple-500/10 dark:to-slate-900/80 border-indigo-200/80 dark:border-indigo-500/30 hover:border-indigo-300 dark:hover:border-indigo-500/50 shadow-indigo-100/40",
      stroke: "#8B5CF6",
      fill: "rgba(139, 92, 246, 0.2)",
      badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30",
      iconBg: "bg-indigo-100/80 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400",
    },
    rose: {
      cardBg:
        "from-rose-500/10 via-pink-500/5 to-white/95 dark:from-rose-500/15 dark:via-pink-500/10 dark:to-slate-900/80 border-rose-200/80 dark:border-rose-500/30 hover:border-rose-300 dark:hover:border-rose-500/50 shadow-rose-100/40",
      stroke: "#F43F5E",
      fill: "rgba(244, 63, 94, 0.2)",
      badgeBg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30",
      iconBg: "bg-rose-100/80 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400",
    },
    amber: {
      cardBg:
        "from-amber-500/10 via-yellow-500/5 to-white/95 dark:from-amber-500/15 dark:via-yellow-500/10 dark:to-slate-900/80 border-amber-200/80 dark:border-amber-500/30 hover:border-amber-300 dark:hover:border-amber-500/50 shadow-amber-100/40",
      stroke: "#F59E0B",
      fill: "rgba(245, 158, 11, 0.2)",
      badgeBg: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
      iconBg: "bg-amber-100/80 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    },
    cyan: {
      cardBg:
        "from-sky-500/10 via-cyan-500/5 to-white/95 dark:from-sky-500/15 dark:via-cyan-500/10 dark:to-slate-900/80 border-cyan-200/80 dark:border-cyan-500/30 hover:border-cyan-300 dark:hover:border-cyan-500/50 shadow-cyan-100/40",
      stroke: "#06B6D4",
      fill: "rgba(6, 182, 212, 0.2)",
      badgeBg: "bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-300 dark:border-cyan-500/30",
      iconBg: "bg-cyan-100/80 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400",
    },
    emerald: {
      cardBg:
        "from-emerald-500/10 via-teal-500/5 to-white/95 dark:from-emerald-500/15 dark:via-teal-500/10 dark:to-slate-900/80 border-emerald-200/80 dark:border-emerald-500/30 hover:border-emerald-300 dark:hover:border-emerald-500/50 shadow-emerald-100/40",
      stroke: "#10B981",
      fill: "rgba(16, 185, 129, 0.2)",
      badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
      iconBg: "bg-emerald-100/80 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400",
    },
    purple: {
      cardBg:
        "from-purple-500/10 via-violet-500/5 to-white/95 dark:from-purple-500/15 dark:via-violet-500/10 dark:to-slate-900/80 border-purple-200/80 dark:border-purple-500/30 hover:border-purple-300 dark:hover:border-purple-500/50 shadow-purple-100/40",
      stroke: "#A855F7",
      fill: "rgba(168, 85, 247, 0.2)",
      badgeBg: "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30",
      iconBg: "bg-purple-100/80 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    },
  };

  const theme = colorConfig[colorScheme] || colorConfig.indigo;

  const points =
    sparklineData && sparklineData.length > 0
      ? sparklineData
      : [
          { val: 30 },
          { val: 45 },
          { val: 28 },
          { val: 60 },
          { val: 52 },
          { val: 75 },
          { val: 68 },
        ];

  const valStr = value != null ? String(value) : "—";
  const isExtraLong = valStr.length > 11;
  const isLong = valStr.length > 8 && valStr.length <= 11;

  return (
    <Card
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-lg shadow-slate-200/50 dark:shadow-none transition-all duration-300 ${theme.cardBg}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 pr-1">
          {Icon && (
            <div className={`rounded-xl p-2.5 shrink-0 shadow-sm ${theme.iconBg}`}>
              <Icon className="h-4 w-4" />
            </div>
          )}
          <span
            className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate"
            title={title}
          >
            {title}
          </span>
        </div>

        {change && (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold shrink-0 shadow-xs ${theme.badgeBg}`}
          >
            {changeType === "up" ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : changeType === "down" ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <TrendingUp className="h-3 w-3" />
            )}
            {change}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1 pr-1">
          <div
            className={`font-extrabold tracking-tight text-slate-900 dark:text-white truncate ${
              isExtraLong
                ? "text-lg xl:text-xl"
                : isLong
                  ? "text-xl xl:text-2xl"
                  : "text-2xl sm:text-3xl"
            }`}
            title={valStr}
          >
            {valStr}
          </div>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 truncate" title={subtitle}>
            {subtitle}
          </p>
        </div>

        <div className="h-11 w-24 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points}>
              <Area
                type="monotone"
                dataKey="val"
                stroke={theme.stroke}
                strokeWidth={2.5}
                fill={theme.fill}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
