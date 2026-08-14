"use client";

import dynamic from "next/dynamic";
import { Cell } from "recharts";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import { useRouter } from "next/navigation";

const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);
const PieChart = dynamic(() => import("recharts").then((m) => m.PieChart), {
  ssr: false,
});
const Pie = dynamic(() => import("recharts").then((m) => m.Pie), {
  ssr: false,
});
const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), {
  ssr: false,
});
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), {
  ssr: false,
});
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), {
  ssr: false,
});
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid),
  { ssr: false }
);

function CustomDarkTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/95 p-3 shadow-xl backdrop-blur-md">
      {label && <p className="mb-1 text-xs font-semibold text-slate-300">{label}</p>}
      <div className="space-y-1">
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-300">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color || item.fill }}
              />
              {item.name}:
            </span>
            <span className="font-bold text-white">
              {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PALETTE = ["#8B5CF6", "#06B6D4", "#F59E0B", "#F43F5E", "#10B981", "#3B82F6", "#EC4899"];

export function DistributionDonutChart({
  title = "Inventory by Category",
  subtitle = "Status distribution",
  data = [],
}) {
  const router = useRouter();
  const defaultData = [
    { name: "In Stock", value: 540, color: "#8B5CF6" },
    { name: "Low Stock", value: 120, color: "#06B6D4" },
    { name: "Reorder Queue", value: 85, color: "#F59E0B" },
    { name: "Out of Stock", value: 35, color: "#F43F5E" },
    { name: "On Order", value: 110, color: "#10B981" },
  ];

  const rawData = data && data.length > 0 ? data : defaultData;
  const chartData = rawData.map((item, idx) => {
    const color = item.color || item.fill || PALETTE[idx % PALETTE.length];
    return {
      ...item,
      fill: color,
      color: color,
    };
  });

  const total = chartData.reduce((acc, item) => acc + (item.value || 0), 0);

  const handleLegendClick = (name) => {
    let status = "all";
    if (name === "In Stock") status = "in_stock";
    else if (name === "Low Stock") status = "low_stock";
    else if (name === "Out of Stock") status = "out_of_stock";
    router.push(`/products?status=${status}`);
  };

  return (
    <Card className="glass-card flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
      <CardHeader className="p-0 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-indigo-400" />
              {title}
            </CardTitle>
            <CardDescription className="text-xs text-slate-400 mt-0.5">
              {subtitle}
            </CardDescription>
          </div>
          <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
            {total.toLocaleString()} Total
          </span>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col sm:flex-row items-center justify-between gap-6 p-0 pt-2">
        <div className="h-48 w-full sm:w-1/2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<CustomDarkTooltip />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={75}
                paddingAngle={4}
                cornerRadius={6}
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="w-full sm:w-1/2 space-y-2.5">
          {chartData.map((item, idx) => {
            const pct = total > 0 ? Math.round(((item.value || 0) / total) * 100) : 0;
            return (
              <div
                key={idx}
                onClick={() => handleLegendClick(item.name)}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs transition-colors hover:bg-indigo-500/20 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="font-medium text-slate-200 truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">
                    {(item.value || 0).toLocaleString()}
                  </span>
                  <span className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function ComparisonBarChart({
  title = "Inbound vs Outbound Movements",
  subtitle = "Stock flow by category",
  data = [],
  bars = [
    { key: "stockIn", name: "Stock In", color: "#8B5CF6" },
    { key: "stockOut", name: "Stock Out", color: "#06B6D4" },
  ],
}) {
  const defaultData = [
    { name: "Electronics", stockIn: 450, stockOut: 320 },
    { name: "Hardware", stockIn: 380, stockOut: 410 },
    { name: "Accessories", stockIn: 520, stockOut: 290 },
    { name: "Cables", stockIn: 610, stockOut: 550 },
    { name: "Peripherals", stockIn: 340, stockOut: 270 },
    { name: "Storage", stockIn: 490, stockOut: 390 },
  ];

  const chartData = data && data.length > 0 ? data : defaultData;
  const isManyCategories = chartData.length > 5;
  const minChartWidth = isManyCategories ? `${chartData.length * 85}px` : "100%";

  return (
    <Card className="glass-card flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl">
      <CardHeader className="p-0 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-400" />
                {title}
              </CardTitle>
              <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-semibold text-purple-300 border border-purple-500/20">
                {chartData.length} Categories
              </span>
            </div>
            <CardDescription className="text-xs text-slate-400 mt-0.5">
              {subtitle}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {bars.map((b, idx) => (
              <span key={idx} className="flex items-center gap-1.5 font-medium text-slate-300">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
                {b.name}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 pt-2 flex-1 w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700/50">
        <div className="h-64" style={{ minWidth: minChartWidth, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={6} margin={{ top: 10, right: 10, left: -15, bottom: isManyCategories ? 35 : 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94A3B8", fontSize: 11 }}
                interval={0}
                angle={isManyCategories ? -25 : 0}
                textAnchor={isManyCategories ? "end" : "middle"}
                height={isManyCategories ? 50 : 30}
                tickFormatter={(val) => (val && val.length > 18 ? val.substring(0, 16) + "..." : val)}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94A3B8", fontSize: 11 }}
              />
              <Tooltip content={<CustomDarkTooltip />} />
              {bars.map((b, idx) => (
                <Bar
                  key={idx}
                  dataKey={b.key}
                  name={b.name}
                  fill={b.color}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={28}
                  minPointSize={b.key === "stockIn" || b.key === "stockOut" ? 3 : 0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
