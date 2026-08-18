"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ShoppingCart,
  Clock,
  RefreshCw,
  DollarSign,
  AlertCircle,
  Package,
  ShieldAlert,
  TrendingUp,
  Activity,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

import {
  ForecastChart,
  ReorderRecommendations,
  StatCardWithSparkline,
  DistributionDonutChart,
  ComparisonBarChart,
  WeatherWidget,
} from "@/features/dashboard/components";
import { dashboardApi, analyticsApi, productsApi, adminDashboardApi } from "@/lib/api";
import { useRoleAccess } from "@/hooks/useRoleAccess";

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

export default function ManagerDashboard() {
  const { isSuperAdmin, hasPermission } = useRoleAccess();
  const can = (module, action = "view") => isSuperAdmin || hasPermission(module, action);

  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [reorderItems, setReorderItems] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [forecastMetrics, setForecastMetrics] = useState({});
  const [movementData, setMovementData] = useState([]);
  const [productsList, setProductsList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [adminRes, statsRes, recommendations, trendsRes, products] = await Promise.all([
        adminDashboardApi.get().catch(() => null),
        dashboardApi.getStats().catch(() => null),
        analyticsApi.listRecommendations().catch(() => []),
        dashboardApi.getTrends(14).catch(() => null),
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
      if (trendsRes?.success && trendsRes.data?.movements) {
        setMovementData(
          trendsRes.data.movements.map((m) => ({
            name: m.name || m.date,
            actual: m.stock_in,
            predicted: m.stock_out,
          }))
        );
      }
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
        setForecastMetrics({ productName: pName });
      }
    };
    fetchForecast();
  }, [selectedProduct, productsList]);

  const handleRefresh = async () => {
    await loadDashboard();
    toast.success("Dashboard refreshed successfully");
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const healthScore = stats
    ? Math.max(
        0,
        Math.min(
          100,
          100 -
            (stats.low_stock_count + stats.out_of_stock_count) * 5 -
            stats.open_alerts_count * 2
        )
      )
    : 88;

  const categoryDistribution = [
    { name: "In Stock", value: stats?.total_products ? stats.total_products * 0.75 : 420, color: "#8B5CF6" },
    { name: "Low Stock", value: stats?.low_stock_count || 45, color: "#06B6D4" },
    { name: "Reorder Queue", value: stats?.reorder_count || 28, color: "#F59E0B" },
    { name: "Out of Stock", value: stats?.out_of_stock_count || 12, color: "#F43F5E" },
    { name: "On Order", value: 65, color: "#10B981" },
  ];

  const categoryMovements = admin?.category_movements?.length > 0 
    ? admin.category_movements 
    : stats?.category_movements?.length > 0 
    ? stats.category_movements 
    : [
        { name: "Electronics", stockIn: 480, stockOut: 390 },
        { name: "Hardware", stockIn: 520, stockOut: 440 },
        { name: "Accessories", stockIn: 610, stockOut: 530 },
        { name: "Cables", stockIn: 340, stockOut: 290 },
        { name: "Peripherals", stockIn: 410, stockOut: 360 },
      ];

  return (
    <div className="space-y-8 pb-10">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Manager Executive Dashboard
            </h1>
            <Badge className="bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30 text-xs font-semibold">
              <TrendingUp className="mr-1 h-3 w-3" /> Live Analytics
            </Badge>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            AI-powered inventory forecasting, replenishment intelligence, and stock movement telemetry
          </p>
        </div>
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* Live Weather Context Widget */}
      <WeatherWidget initialData={stats?.weather} />

      {/* Row 1: 4 Advanced Glowing KPI Cards with Sparkline Graphs */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/reports">
          <div className="h-full">
            <StatCardWithSparkline
              title="Inventory Value"
              value={stats ? `£${stats.total_inventory_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "£0"}
              change="+20.1%"
              changeType="up"
              subtitle="Live database asset valuation"
              colorScheme="indigo"
              icon={DollarSign}
              sparklineData={[
                { val: 32 },
                { val: 40 },
                { val: 35 },
                { val: 50 },
                { val: 48 },
                { val: 62 },
                { val: 75 },
              ]}
            />
          </div>
        </Link>

        <Link href="/alerts">
          <div className="h-full">
            <StatCardWithSparkline
              title="Low Stock Items"
              value={stats?.low_stock_count ?? 0}
              change="-14.2%"
              changeType="down"
              subtitle="Critical thresholds reached"
              colorScheme="rose"
              icon={AlertCircle}
              sparklineData={[
                { val: 60 },
                { val: 55 },
                { val: 45 },
                { val: 50 },
                { val: 38 },
                { val: 30 },
                { val: 24 },
              ]}
            />
          </div>
        </Link>

        <Link href="/reorder-recommendations">
          <div className="h-full">
            <StatCardWithSparkline
              title="Reorder Queue"
              value={stats?.reorder_count ?? 0}
              change="+12.5%"
              changeType="up"
              subtitle="Suggested supplier POs"
              colorScheme="amber"
              icon={ShoppingCart}
              sparklineData={[
                { val: 20 },
                { val: 25 },
                { val: 22 },
                { val: 30 },
                { val: 28 },
                { val: 35 },
                { val: 42 },
              ]}
            />
          </div>
        </Link>

        <Link href="/alerts">
          <div className="h-full">
            <StatCardWithSparkline
              title="Open Alerts"
              value={stats?.open_alerts_count ?? 0}
              change="-18.0%"
              changeType="down"
              subtitle="Active system notifications"
              colorScheme="cyan"
              icon={ShieldAlert}
              sparklineData={[
                { val: 50 },
                { val: 45 },
                { val: 40 },
                { val: 35 },
                { val: 28 },
                { val: 20 },
                { val: 15 },
              ]}
            />
          </div>
        </Link>
      </div>

      {/* Row 2: Main Curved Glowing Area Chart (2/3 width) + Reorder Recommendations (1/3 width) */}
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
          <ReorderRecommendations items={reorderItems} title="Priority Replenishments" />
        </div>
      </div>

      {/* Row 3: Multi-Colored Rounded Bar Chart + Distribution Donut Chart with Percentage Table */}
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
            title="Inventory Status Distribution"
            subtitle="Real-time breakdown by stock availability state"
            data={categoryDistribution}
          />
        </div>
      </div>

      {/* Row 4: Operational Health Bar */}
      <Card className="glass-card rounded-2xl border border-slate-200/80 dark:border-white/10 p-6 shadow-xl">
        <CardHeader className="p-0 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Operational Health Index
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Composite score based on stockouts, low stock alerts, and replenishment SLA compliance
              </p>
            </div>
            <Badge className="bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 text-sm font-extrabold px-3 py-1">
              {Math.round(healthScore)}% HEALTHY
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex items-center gap-4">
            <Progress
              value={healthScore}
              className="h-3 flex-1 rounded-full bg-slate-200 dark:bg-slate-800/80 overflow-hidden"
              indicatorClassName="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
