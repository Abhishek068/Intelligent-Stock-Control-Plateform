"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, Package, AlertCircle, DollarSign,
  RefreshCw, UserPlus, Settings, FileSpreadsheet } from
"lucide-react";
import { ForecastChart, ReorderRecommendations } from "@/features/dashboard/components";
import { dashboardApi, analyticsApi, productsApi } from "@/lib/api";

function buildForecastChart(chart) {
  if (!chart) return [];
  const history = (chart.history || []).slice(-7).map((h) => ({
    name: h.date?.slice(5) || h.date,
    actual: h.actual,
    predicted: h.actual
  }));
  const forecast = (chart.forecast || []).slice(0, 7).map((f) => ({
    name: f.date?.slice(5) || f.date,
    actual: f.predicted,
    predicted: f.predicted
  }));
  return [...history, ...forecast];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [reorderItems, setReorderItems] = useState([]);
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, recommendations, products] = await Promise.all([
      dashboardApi.getStats(),
      analyticsApi.listRecommendations(),
      productsApi.list().catch(() => [])]
      );
      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      setReorderItems(
        recommendations.slice(0, 5).map((r) => ({
          product: r.product_name,
          stock: r.current_stock,
          leadTime: r.lead_time_days,
          suggested: r.suggested_quantity,
          priority: r.priority
        }))
      );
      if (products.length > 0) {
        const forecastRes = await analyticsApi.getForecast(products[0].id).catch(() => null);
        if (forecastRes?.success && forecastRes.data?.chart) {
          setForecastData(buildForecastChart(forecastRes.data.chart));
        } else {
          setForecastData([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Admin Dashboard</h1>
          <p className="text-slate-400 mt-1">Live system overview from API</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadDashboard} disabled={loading} className="bg-slate-900/50">
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm"><UserPlus className="mr-2 h-4 w-4" /> Add User</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Inventory Value</CardTitle>
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">
              £{stats ? stats.total_inventory_value.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "—"}
            </div>
            <p className="text-xs text-emerald-400 mt-1 flex items-center"><TrendingUp className="h-3 w-3 mr-1" /> +2.4% from last month</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Low Stock Items</CardTitle>
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats?.low_stock_count ?? "—"}</div>
            <p className="text-xs text-slate-400 mt-1">Items below safety threshold</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Out of Stock</CardTitle>
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <Package className="h-4 w-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats?.out_of_stock_count ?? "—"}</div>
            <p className="text-xs text-slate-400 mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Open Alerts</CardTitle>
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-100">{stats?.open_alerts_count ?? "—"}</div>
            <p className="text-xs text-slate-400 mt-1">Active predictive warnings</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
        <div className="md:col-span-2 lg:col-span-2 xl:col-span-3 flex flex-col gap-6">
          <ForecastChart data={forecastData} />
          
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glass-card">
              <CardHeader><CardTitle className="text-sm font-medium text-slate-200">System Config Status</CardTitle></CardHeader>
              <CardContent className="flex gap-4 flex-wrap">
                <Button variant="outline" size="sm" className="bg-slate-900/50"><Settings className="mr-2 h-4 w-4 text-slate-400" /> Thresholds</Button>
                <Button variant="outline" size="sm" className="bg-slate-900/50"><FileSpreadsheet className="mr-2 h-4 w-4 text-slate-400" /> Export Logs</Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="md:col-span-1">
          <ReorderRecommendations items={reorderItems} title="AI Reorder Recommendations" />
        </div>
      </div>
    </div>);

}
