"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Clock, RefreshCw, DollarSign, AlertCircle, Package, ShieldAlert } from "lucide-react";

import { ForecastChart, ReorderRecommendations } from "@/features/dashboard/components";
import { dashboardApi, analyticsApi, productsApi } from "@/lib/api";
import { useRoleAccess } from "@/hooks/useRoleAccess";

function buildForecastChart(chart) {
  if (!chart) return [];
  const history = (chart.history || []).slice(-7).map((h) => ({
    name: h.date?.slice(5) || h.date,
    actual: h.actual,
    predicted: null,
  }));
  const forecast = (chart.forecast || []).slice(0, 7).map((f) => ({
    name: f.date?.slice(5) || f.date,
    actual: null,
    predicted: f.predicted,
  }));
  return [...history, ...forecast];
}

export default function ManagerDashboard() {
  const { isSuperAdmin, hasPermission } = useRoleAccess();
  const can = (module, action = "view") => isSuperAdmin || hasPermission(module, action);

  const [stats, setStats] = useState(null);
  const [reorderItems, setReorderItems] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [forecastMetrics, setForecastMetrics] = useState({});
  const [movementData, setMovementData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, recommendations, trendsRes, products] = await Promise.all([
        dashboardApi.getStats().catch(() => null),
        analyticsApi.listRecommendations().catch(() => []),
        dashboardApi.getTrends(14).catch(() => null),
        productsApi.list().catch(() => []),
      ]);
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
        const forecastRes = await analyticsApi.getForecast(products[0].id).catch(() => null);
        if (forecastRes?.success && forecastRes.data?.chart) {
          setForecastData(buildForecastChart(forecastRes.data.chart));
          const latest = forecastRes.data.latest_forecast;
          setForecastMetrics({ mae: latest?.mae, rmse: latest?.rmse });
        }
      }
    } finally {
      setLoading(false);
    }
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
    : 0;

  const hasNoOps = !can("forecasting") && !can("alerts") && !can("reports");



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Manager Dashboard</h1>
          <p className="text-slate-400 mt-1">Purchasing, forecasting and reorder overview</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadDashboard}
          disabled={loading}
          className="bg-slate-900/50"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/reports">
          <Card className="glass-card hover:border-emerald-500/30 transition-colors h-full flex flex-col justify-between overflow-hidden p-0">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0 gap-2">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate" title="Inventory Value">
                Inventory Value
              </CardTitle>
              <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0">
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div
                className="text-lg sm:text-xl xl:text-2xl font-bold text-slate-100 truncate tracking-tight"
                title={`£${stats ? stats.total_inventory_value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}`}
              >
                £
                {stats
                  ? stats.total_inventory_value.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })
                  : "—"}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/alerts">
          <Card className="glass-card hover:border-amber-500/30 transition-colors h-full flex flex-col justify-between overflow-hidden p-0">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0 gap-2">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate" title="Low Stock">
                Low Stock
              </CardTitle>
              <div className="p-2 bg-amber-500/10 rounded-lg shrink-0">
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-slate-100 truncate tracking-tight">
                {stats?.low_stock_count ?? "—"}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/reorder-recommendations">
          <Card className="glass-card hover:border-blue-500/30 transition-colors h-full flex flex-col justify-between overflow-hidden p-0">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0 gap-2">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate" title="Reorder Queue">
                Reorder Queue
              </CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                <ShoppingCart className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-slate-100 truncate tracking-tight">
                {stats?.reorder_count ?? "—"}
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/alerts">
          <Card className="glass-card hover:border-rose-500/30 transition-colors h-full flex flex-col justify-between overflow-hidden p-0">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0 gap-2">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate" title="Open Alerts">
                Open Alerts
              </CardTitle>
              <div className="p-2 bg-rose-500/10 rounded-lg shrink-0">
                <Package className="h-4 w-4 text-rose-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-slate-100 truncate tracking-tight">
                {stats?.open_alerts_count ?? "—"}
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-slate-200">Operational Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress
              value={healthScore}
              className="h-2 flex-1 bg-slate-800"
              indicatorClassName="bg-indigo-500"
            />
            <Badge className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 border-indigo-500/30">
              {Math.round(healthScore)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
        <div className="md:col-span-2 lg:col-span-2 xl:col-span-3 flex flex-col gap-6">
          <ForecastChart
            data={forecastData.length ? forecastData : movementData}
            title={forecastData.length ? "Demand Forecast" : "Stock Movements (14d)"}
            description={
              forecastData.length
                ? "History + predicted demand"
                : "Stock in (solid) vs stock out (dashed)"
            }
            showMetrics={!!forecastData.length}
            mae={forecastMetrics.mae}
            rmse={forecastMetrics.rmse}
            actualLabel={forecastData.length ? "Actual" : "Stock In"}
            predictedLabel={forecastData.length ? "Predicted" : "Stock Out"}
          />

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-200">
                <Clock className="h-4 w-4 text-slate-400" /> Top Reorder Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                {reorderItems.length === 0 ? (
                  <p className="text-sm text-slate-400">No reorder recommendations</p>
                ) : (
                  reorderItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border-b border-white/5 py-3 text-sm last:border-0"
                    >
                      <span className="text-slate-300">{item.product}</span>
                      <Badge
                        variant="outline"
                        className="border-white/10 text-slate-400 bg-slate-900/50"
                      >
                        {item.priority}
                      </Badge>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-1">
          <ReorderRecommendations items={reorderItems} title="Priority Reorders" />
        </div>
      </div>
    </div>
  );
}
