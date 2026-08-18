












import {
  Warehouse,
  CheckCircle2,
  Layers,
  Box,
  DollarSign,
  AlertTriangle,
  Users,
  Clock,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const colorMap = {
  blue: {
    text: "text-blue-600 dark:text-blue-400",
    gradient: "from-blue-500 to-indigo-500",
    bgGlow: "bg-blue-500/10",
    iconBg: "bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-500/15 dark:border-blue-500/30 dark:text-blue-400",
    borderHover: "hover:border-blue-500/40",
  },
  green: {
    text: "text-emerald-600 dark:text-emerald-400",
    gradient: "from-emerald-500 to-teal-500",
    bgGlow: "bg-emerald-500/10",
    iconBg: "bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-400",
    borderHover: "hover:border-emerald-500/40",
  },
  amber: {
    text: "text-amber-600 dark:text-amber-400",
    gradient: "from-amber-500 to-orange-500",
    bgGlow: "bg-amber-500/10",
    iconBg: "bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-400",
    borderHover: "hover:border-amber-500/40",
  },
  red: {
    text: "text-rose-600 dark:text-rose-400",
    gradient: "from-rose-500 to-red-500",
    bgGlow: "bg-rose-500/10",
    iconBg: "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-500/15 dark:border-rose-500/30 dark:text-rose-400",
    borderHover: "hover:border-rose-500/40",
  },
  teal: {
    text: "text-teal-600 dark:text-teal-400",
    gradient: "from-teal-500 to-cyan-500",
    bgGlow: "bg-teal-500/10",
    iconBg: "bg-teal-50 border-teal-200 text-teal-600 dark:bg-teal-500/15 dark:border-teal-500/30 dark:text-teal-400",
    borderHover: "hover:border-teal-500/40",
  },
  purple: {
    text: "text-purple-600 dark:text-purple-400",
    gradient: "from-purple-500 to-indigo-500",
    bgGlow: "bg-purple-500/10",
    iconBg: "bg-purple-50 border-purple-200 text-purple-600 dark:bg-purple-500/15 dark:border-purple-500/30 dark:text-purple-400",
    borderHover: "hover:border-purple-500/40",
  },
  slate: {
    text: "text-slate-600 dark:text-slate-300",
    gradient: "from-slate-400 to-slate-200",
    bgGlow: "bg-slate-500/10",
    iconBg: "bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-500/15 dark:border-slate-500/30 dark:text-slate-300",
    borderHover: "hover:border-slate-400 dark:hover:border-slate-500/40",
  },
};

function getStatIcon(label = "") {
  const l = String(label).toLowerCase();
  if (l.includes("location") || l.includes("warehouse")) return Warehouse;
  if (
    l.includes("active") ||
    l.includes("in stock") ||
    l.includes("completed") ||
    l.includes("verified")
  )
    return CheckCircle2;
  if (
    l.includes("capacity") ||
    l.includes("total") ||
    l.includes("quantity") ||
    l.includes("items")
  )
    return Layers;
  if (l.includes("product") || l.includes("stock") || l.includes("sku"))
    return Box;
  if (
    l.includes("value") ||
    l.includes("price") ||
    l.includes("cost") ||
    l.includes("revenue")
  )
    return DollarSign;
  if (
    l.includes("alert") ||
    l.includes("low") ||
    l.includes("out") ||
    l.includes("critical")
  )
    return AlertTriangle;
  if (
    l.includes("user") ||
    l.includes("staff") ||
    l.includes("customer") ||
    l.includes("supplier")
  )
    return Users;
  if (l.includes("time") || l.includes("pending") || l.includes("order"))
    return Clock;
  if (
    l.includes("forecast") ||
    l.includes("trend") ||
    l.includes("growth")
  )
    return TrendingUp;
  return Sparkles;
}

export function StatsGrid({ stats, columns = 4 }) {
  const gridCols = {
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  };

  return (
    <div className={`grid gap-5 ${gridCols[columns] || "md:grid-cols-4"}`}>
      {stats.map((stat, index) => {
        const colors = colorMap[stat.color] || colorMap.slate;
        const Icon = getStatIcon(stat.label);

        return (
          <Card
            key={stat.label || index}
            className={`relative overflow-hidden group glass-card bg-white/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 ${colors.borderHover} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl rounded-2xl shadow-md`}
          >
            {/* Subtle top glowing gradient bar */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.gradient} opacity-80 group-hover:opacity-100 transition-opacity`}
            />

            {/* Ambient background glow radial */}
            <div
              className={`absolute -top-10 -right-10 w-32 h-32 ${colors.bgGlow} rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500`}
            />

            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span
                  className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors truncate"
                  title={stat.label}
                >
                  {stat.label}
                </span>
                <div
                  className={`p-2.5 rounded-xl border ${colors.iconBg} shadow-2xs group-hover:scale-110 transition-transform duration-200`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="flex items-baseline justify-between mt-2">
                <p
                  className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors truncate"
                  title={
                    typeof stat.value === "string" ||
                    typeof stat.value === "number"
                      ? String(stat.value)
                      : undefined
                  }
                >
                  {typeof stat.value === "number"
                    ? stat.value.toLocaleString()
                    : stat.value}
                </p>
                {stat.subtitle ? (
                  <span
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full border border-slate-200/80 dark:border-white/5 truncate max-w-[130px]"
                    title={stat.subtitle}
                  >
                    {stat.subtitle}
                  </span>
                ) : (
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 ${colors.text}`}
                  >
                    Live
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}