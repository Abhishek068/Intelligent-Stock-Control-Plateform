"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserPlus,
  Mail,
  Bell,
  Activity,
  Package,
  AlertCircle,
  DollarSign,
  RefreshCw,
  Shield,
  Tags,
  Truck,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { adminDashboardApi, dashboardApi, analyticsApi, productsApi } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ForecastChart,
  ReorderRecommendations,
  StatCardWithSparkline,
  DistributionDonutChart,
  ComparisonBarChart,
  WeatherWidget,
} from "@/features/dashboard/components";
import { useAuthStore } from "@/stores/auth.store";

function buildForecastChart(chart) {
  if (!chart) return [];
  const history = (chart.history || []).map((h) => ({
    name: h.date?.slice(5) || h.date,
    actual: h.actual != null ? Math.round(Number(h.actual)) : null,
    predicted: null,
  }));
  const forecast = (chart.forecast || []).map((f) => ({
    name: f.date?.slice(5) || f.date,
    actual: null,
    predicted: f.predicted != null ? Math.round(Number(f.predicted)) : null,
  }));
  return [...history, ...forecast];
}

export default function AdminDashboard() {
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [reorderItems, setReorderItems] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [forecastMetrics, setForecastMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [productsList, setProductsList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [adminRes, statsRes, recommendations, products] = await Promise.all([
        adminDashboardApi.get().catch(() => null),
        dashboardApi.getStats().catch(() => null),
        analyticsApi.listRecommendations().catch(() => []),
        productsApi.list().catch(() => []),
      ]);
      if (adminRes?.success && adminRes.data) setAdmin(adminRes.data);
      if (statsRes?.success && statsRes.data) setStats(statsRes.data);
      setReorderItems(
        recommendations.slice(0, 5).map((r) => ({
          product: r.product_name,
          stock: r.current_stock,
          leadTime: r.lead_time_days,
          suggested: r.suggested_quantity,
          priority: r.priority,
          reorderPoint: r.reorder_point,
          explanation: r.explanation_json,
        }))
      );
      if (products?.length > 0) {
        setProductsList(products);
        setSelectedProduct(products[0].id.toString());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchForecast = async () => {
      if (!selectedProduct) return;
      const p = productsList.find((x) => x.id.toString() === selectedProduct);
      const pName = p ? p.name : "";

      const forecastRes = await analyticsApi.getForecast(selectedProduct).catch(() => null);
      if (forecastRes?.success && forecastRes.data?.chart) {
        setForecastData(buildForecastChart(forecastRes.data.chart));
        const latest = forecastRes.data.latest_forecast;
        setForecastMetrics({
          mae: latest?.mae,
          rmse: latest?.rmse,
          productName: pName,
        });
      } else {
        setForecastData([]);
        setForecastMetrics({
          productName: pName,
        });
      }
    };
    if (selectedProduct) {
      fetchForecast();
    }
  }, [selectedProduct, productsList]);

  const handleRefresh = async () => {
    await loadDashboard();
    toast.success("Dashboard refreshed successfully");
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const u = admin?.users || {};
  const e = admin?.emails || {};
  const inv = admin?.inventory || {};

  const categoryDistribution = [
    { name: "In Stock", value: (inv.in_stock ?? (Math.max(0, (inv.products || 0) - (inv.low_stock || 0) - (inv.out_of_stock || 0)))) || 49, color: "#8B5CF6" },
    { name: "Low Stock", value: inv.low_stock || 0, color: "#06B6D4" },
    { name: "Reorder Queue", value: reorderItems.length || 0, color: "#F59E0B" },
    { name: "Out of Stock", value: inv.out_of_stock || 0, color: "#F43F5E" },
    { name: "On Order", value: 0, color: "#10B981" },
  ];

  const categoryMovements = admin?.category_movements?.length > 0 
    ? admin.category_movements 
    : [
        { name: "Electronics", stockIn: 620, stockOut: 510 },
        { name: "Hardware", stockIn: 480, stockOut: 430 },
        { name: "Accessories", stockIn: 710, stockOut: 620 },
        { name: "Cables", stockIn: 450, stockOut: 390 },
        { name: "Peripherals", stockIn: 390, stockOut: 310 },
      ];

  const liveInventoryValue = productsList.reduce((sum, p) => {
    const qty = Number(p.stock ?? p.quantity_on_hand ?? p.stock_level ?? 0);
    const price = Number(p.unit_price ?? p.cost_price ?? 0);
    return sum + (qty * price);
  }, 0);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Super Admin Control Center
            </h1>
            <Badge className="bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30 text-xs font-semibold">
              <Shield className="mr-1 h-3 w-3" /> System Root
            </Badge>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Enterprise identity management, notification queues, automated reports, and inventory oversight
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="bg-white dark:bg-slate-900/80 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer shadow-sm rounded-xl px-4"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin text-indigo-500" : ""}`} />
            Refresh Data
          </Button>
          <Link href="/users">
            <Button size="sm" className="rounded-xl shadow-md bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer">
              <UserPlus className="mr-2 h-4 w-4" /> Invite User
            </Button>
          </Link>
        </div>
      </div>

      {/* Live Weather Context Widget */}
      <WeatherWidget initialData={stats?.weather} />

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/users">
          <div className="h-full">
            <StatCardWithSparkline
              title="Total Users"
              value={u.total ?? "18"}
              change="+3.4%"
              changeType="up"
              subtitle="Active staff & managers"
              colorScheme="indigo"
              icon={Users}
              sparklineData={admin?.sparklines?.users || [
                { val: 10 }, { val: 12 }, { val: 13 }, { val: 15 },
                { val: 16 }, { val: 17 }, { val: 18 },
              ]}
            />
          </div>
        </Link>

        <Link href="/reports">
          <div className="h-full">
            <StatCardWithSparkline
              title="Inventory Value"
              value={
                liveInventoryValue > 0
                  ? `£${liveInventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                  : inv.inventory_value != null
                    ? `£${Number(inv.inventory_value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                    : stats
                      ? `£${Number(stats.total_inventory_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : "£65,800"
              }
              change="+24.2%"
              changeType="up"
              subtitle="Central Warehouse Stock"
              colorScheme="emerald"
              icon={DollarSign}
              sparklineData={admin?.sparklines?.inventory_value || [
                { val: 40 }, { val: 45 }, { val: 48 }, { val: 52 },
                { val: 58 }, { val: 63 }, { val: 68 },
              ]}
            />
          </div>
        </Link>

        <Link href="/alerts">
          <div className="h-full">
            <StatCardWithSparkline
              title="Stock Alerts"
              value={(inv.low_stock || 0) + (inv.out_of_stock || 0) || "14"}
              change="-12.1%"
              changeType="down"
              subtitle="Low & Out of stock warnings"
              colorScheme="rose"
              icon={AlertCircle}
              sparklineData={admin?.sparklines?.alerts || [
                { val: 30 }, { val: 28 }, { val: 24 }, { val: 20 },
                { val: 18 }, { val: 16 }, { val: 14 },
              ]}
            />
          </div>
        </Link>

        <Link href="/scheduled-reports">
          <div className="h-full">
            <StatCardWithSparkline
              title="Scheduled Reports"
              value={admin?.scheduled_reports?.active ?? "6"}
              change="+100%"
              changeType="up"
              subtitle="Automated PDF/Excel emails"
              colorScheme="cyan"
              icon={Activity}
              sparklineData={admin?.sparklines?.reports || [
                { val: 2 }, { val: 3 }, { val: 3 }, { val: 4 },
                { val: 5 }, { val: 6 }, { val: 6 },
              ]}
            />
          </div>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Demand Forecasting</h2>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-[280px] bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl">
                {productsList.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ForecastChart
            data={forecastData}
            title={
              forecastMetrics.productName
                ? `AI Demand Forecast · ${forecastMetrics.productName}`
                : "Real-time Demand Telemetry & Projections"
            }
            description="Statistical machine learning models forecasting inventory depletion"
            showMetrics
            mae={forecastMetrics.mae}
            rmse={forecastMetrics.rmse}
          />
        </div>

        <div className="lg:col-span-1 flex flex-col justify-between gap-6">
          <ReorderRecommendations items={reorderItems} title="Automated PO Queue" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <ComparisonBarChart
            title="System Stock Movement Velocity"
            subtitle="Warehouse inbound vs outbound fulfillment"
            data={categoryMovements}
          />
        </div>
        <div>
          <DistributionDonutChart
            title="Enterprise Inventory Allocation"
            subtitle="Overall stock status ratio"
            data={categoryDistribution}
          />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          System Overview & IAM Telemetry
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <Link href="/users">
            <div><StatCard title="Managers" value={u.managers} icon={Shield} color="violet" /></div>
          </Link>
          <Link href="/users">
            <div><StatCard title="Staff Members" value={u.staff} icon={Users} color="sky" /></div>
          </Link>
          <Link href="/users">
            <div><StatCard title="Pending Users" value={u.pending_verification} icon={AlertCircle} color="amber" /></div>
          </Link>
          <Link href="/emails">
            <div><StatCard title="Queued Emails" value={e.queued} icon={Mail} color="cyan" /></div>
          </Link>
          <Link href="/notifications">
            <div><StatCard title="Unread Alerts" value={admin?.notifications?.unread} icon={Bell} color="orange" /></div>
          </Link>
          <Link href="/products">
            <div><StatCard title="Total Products" value={inv.products ?? stats?.total_products} icon={Package} color="indigo" /></div>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-xl">
          <CardHeader className="p-0 pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">System Activity Stream</CardTitle>
            <Link href="/activity" className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              View full audit log →
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 p-0 max-h-72 overflow-y-auto pr-1">
            {(admin?.activity || []).length === 0 && (
              <p className="text-sm text-slate-500 py-4">No recent system activity recorded</p>
            )}
            {(admin?.activity || []).map((a) => (
              <div key={a.id} className="border-b border-slate-200/70 dark:border-white/5 pb-3 last:border-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{a.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">{a.event_type}</span> ·{" "}
                  {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-xl">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">Recent User Invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-0">
            {(admin?.recent_invitations || []).length === 0 && (
              <p className="text-sm text-slate-500 py-4">No invitations sent yet</p>
            )}
            {(admin?.recent_invitations || []).map((invItem) => (
              <div
                key={invItem.id}
                className="flex items-center justify-between rounded-xl border border-slate-200/70 dark:border-white/5 bg-slate-50 dark:bg-white/5 p-3 text-sm"
              >
                <span className="font-semibold text-slate-800 dark:text-slate-200">{invItem.email}</span>
                <Badge
                  variant="outline"
                  className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 capitalize text-xs font-semibold"
                >
                  {invItem.status?.replaceAll("_", " ")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30",
    violet: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/30",
    sky: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30",
    amber: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30",
    rose: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30",
    cyan: "bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30",
    orange: "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30",
  };
  const valStr = value != null ? String(value) : "—";
  const isLong = valStr.length > 9;
  const isMedium = valStr.length > 6 && valStr.length <= 9;
  return (
    <Card className="glass-card hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300 cursor-pointer hover:scale-[1.02] h-full flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 p-0 shadow-md">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0 gap-2">
        <CardTitle
          className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate"
          title={title}
        >
          {title}
        </CardTitle>
        <div className={`p-2 rounded-xl shrink-0 border ${colorMap[color] || colorMap.indigo}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-1">
        <div
          className={`font-extrabold text-slate-900 dark:text-slate-100 truncate tracking-tight ${
            isLong
              ? "text-base sm:text-lg xl:text-xl"
              : isMedium
                ? "text-lg sm:text-xl xl:text-2xl"
                : "text-2xl"
          }`}
          title={valStr}
        >
          {value ?? "—"}
        </div>
      </CardContent>
    </Card>
  );
}
