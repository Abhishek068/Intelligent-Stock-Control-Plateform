"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { adminDashboardApi, dashboardApi, analyticsApi, productsApi } from "@/lib/api";
import { ForecastChart, ReorderRecommendations } from "@/features/dashboard/components";
import { useAuthStore } from "@/stores/auth.store";

function buildForecastChart(chart) {
  if (!chart) return [];
  const history = (chart.history || []).slice(-7).map((h) => ({
    name: h.date?.slice(5) || h.date,
    actual: h.actual,
    predicted: h.actual,
  }));
  const forecast = (chart.forecast || []).slice(0, 7).map((f) => ({
    name: f.date?.slice(5) || f.date,
    actual: f.predicted,
    predicted: f.predicted,
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

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [adminRes, statsRes, recommendations, products] = await Promise.all([
        adminDashboardApi.get().catch(() => null),
        dashboardApi.getStats().catch(() => null),
        analyticsApi.listRecommendations().catch(() => []),
        productsApi.list().catch(() => []),
      ]);
      if (adminRes?.success) setAdmin(adminRes.data);
      if (statsRes?.success) setStats(statsRes.data);
      setReorderItems(
        (recommendations || []).slice(0, 5).map((r) => ({
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
        const forecastRes = await analyticsApi.getForecast(products[0].id).catch(() => null);
        if (forecastRes?.success && forecastRes.data?.chart) {
          setForecastData(buildForecastChart(forecastRes.data.chart));
          const latest = forecastRes.data.latest_forecast;
          setForecastMetrics({
            mae: latest?.mae,
            rmse: latest?.rmse,
            productName: products[0].name,
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace("/api/v1", "")
      : "http://localhost:8000";
    const sseUrl = `${baseUrl}/api/v1/dashboard/stream/?token=${token}`;

    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "activity") {
          loadDashboard();
        }
      } catch (e) {
        // ignore
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const u = admin?.users || {};
  const e = admin?.emails || {};
  const inv = admin?.inventory || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Super Admin Dashboard</h1>
          <p className="text-slate-400 mt-1">Identity, communications, and inventory overview</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadDashboard} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Link href="/users">
            <Button size="sm">
              <UserPlus className="mr-2 h-4 w-4" /> Invite User
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/users">
          <div><StatCard title="Total Users" value={u.total} icon={Users} color="indigo" /></div>
        </Link>
        <Link href="/users">
          <div><StatCard title="Managers" value={u.managers} icon={Shield} color="violet" /></div>
        </Link>
        <Link href="/users">
          <div><StatCard title="Staff" value={u.staff} icon={Users} color="sky" /></div>
        </Link>
        <Link href="/users">
          <div><StatCard title="Pending Verification" value={u.pending_verification} icon={AlertCircle} color="amber" /></div>
        </Link>
        <Link href="/users">
          <div><StatCard title="Suspended" value={u.suspended} icon={AlertCircle} color="rose" /></div>
        </Link>
        <Link href="/emails">
          <div><StatCard title="Email Queued" value={e.queued} icon={Mail} color="cyan" /></div>
        </Link>
        <Link href="/notifications">
          <div><StatCard title="Unread Notifications" value={admin?.notifications?.unread} icon={Bell} color="orange" /></div>
        </Link>
        <Link href="/scheduled-reports">
          <div><StatCard title="Scheduled Reports" value={admin?.scheduled_reports?.active} icon={Activity} color="emerald" /></div>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Link href="/reports">
          <div>
            <StatCard
              title="Inventory Value"
              value={
                inv.inventory_value != null
                  ? `£${Number(inv.inventory_value).toLocaleString()}`
                  : stats
                    ? `£${Number(stats.total_inventory_value || 0).toLocaleString()}`
                    : "—"
              }
              icon={DollarSign}
              color="emerald"
            />
          </div>
        </Link>
        <Link href="/products">
          <div><StatCard title="Products" value={inv.products ?? stats?.total_products} icon={Package} color="indigo" /></div>
        </Link>
        <Link href="/categories">
          <div><StatCard title="Categories" value={inv.categories} icon={Tags} color="sky" /></div>
        </Link>
        <Link href="/suppliers">
          <div><StatCard title="Suppliers" value={inv.suppliers} icon={Truck} color="orange" /></div>
        </Link>
        <Link href="/alerts">
          <div><StatCard title="Low Stock" value={inv.low_stock ?? stats?.low_stock_count} icon={AlertCircle} color="amber" /></div>
        </Link>
        <Link href="/alerts">
          <div><StatCard title="Out of Stock" value={inv.out_of_stock ?? stats?.out_of_stock_count} icon={AlertCircle} color="rose" /></div>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-100">Recent Activity</CardTitle>
            <Link href="/activity" className="text-xs text-indigo-400">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3 max-h-80 overflow-y-auto">
            {(admin?.activity || []).length === 0 && (
              <p className="text-sm text-slate-500">No recent activity</p>
            )}
            {(admin?.activity || []).map((a) => (
              <div key={a.id} className="border-b border-white/5 pb-2">
                <p className="text-sm text-slate-200">{a.title}</p>
                <p className="text-xs text-slate-500">
                  {a.event_type} · {a.created_at ? new Date(a.created_at).toLocaleString() : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-slate-100">Recent Invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(admin?.recent_invitations || []).length === 0 && (
              <p className="text-sm text-slate-500">No invitations yet</p>
            )}
            {(admin?.recent_invitations || []).map((invItem) => (
              <div key={invItem.id} className="flex justify-between text-sm">
                <span className="text-slate-200">{invItem.email}</span>
                <span className="text-slate-500 capitalize">{invItem.status?.replaceAll("_", " ")}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ForecastChart
          data={forecastData}
          title={
            forecastMetrics.productName
              ? `Forecast · ${forecastMetrics.productName}`
              : "Demand Forecast"
          }
          showMetrics
          mae={forecastMetrics.mae}
          rmse={forecastMetrics.rmse}
        />
        <ReorderRecommendations items={reorderItems} />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }) {
  const colorMap = {
    indigo: "bg-indigo-500/10 text-indigo-400",
    violet: "bg-violet-500/10 text-violet-400",
    sky: "bg-sky-500/10 text-sky-400",
    amber: "bg-amber-500/10 text-amber-400",
    rose: "bg-rose-500/10 text-rose-400",
    cyan: "bg-cyan-500/10 text-cyan-400",
    orange: "bg-orange-500/10 text-orange-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
  };
  return (
    <Card className="glass-card hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300 cursor-pointer hover:scale-[1.02]">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.indigo}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-100">{value ?? "—"}</div>
      </CardContent>
    </Card>
  );
}
