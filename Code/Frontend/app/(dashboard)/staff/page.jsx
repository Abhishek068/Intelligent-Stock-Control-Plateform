"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Package,
  BellRing
} from "lucide-react";

import { dashboardApi, analyticsApi, notificationsApi } from "@/lib/api";
import { useRoleAccess } from "@/hooks/useRoleAccess";

export default function StaffDashboard() {
  const { isSuperAdmin, hasPermission } = useRoleAccess();
  const can = (module, action = "view") => isSuperAdmin || hasPermission(module, action);

  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [reorderItems, setReorderItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [statsRes, notifications, recommendations] = await Promise.all([
        dashboardApi.getStats().catch(() => null),
        notificationsApi.list({ is_read: "false" }).catch(() => []),
        analyticsApi.listRecommendations().catch(() => []),
      ]);
      if (statsRes?.success && statsRes.data) setStats(statsRes.data);
      setAlerts(Array.isArray(notifications) ? notifications.slice(0, 5) : []);
      setReorderItems(
        recommendations
          .filter((r) => {
            const p = String(r.priority || "").toLowerCase();
            return p === "critical" || p === "high";
          })
          .slice(0, 5)
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const hasNoOps = !can("stock_in") && !can("stock_out") && !can("products") && !can("notifications");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Staff Dashboard</h1>
          <p className="text-slate-400 mt-1">Daily operational tasks and quick actions</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadDashboard} disabled={loading} className="bg-slate-900/50">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/stock-in">
          <Card className="glass-card cursor-pointer border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-transparent hover:border-indigo-500/40 hover:bg-indigo-500/20 transition-all h-full">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
              <div className="rounded-full bg-indigo-500/20 p-3 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <ArrowDownToLine className="h-6 w-6" />
              </div>
              <p className="mt-3 font-semibold text-slate-200">Quick Stock In</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/stock-out">
          <Card className="glass-card cursor-pointer border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent hover:border-emerald-500/40 hover:bg-emerald-500/20 transition-all h-full">
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-full">
              <div className="rounded-full bg-emerald-500/20 p-3 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <ArrowUpFromLine className="h-6 w-6" />
              </div>
              <p className="mt-3 font-semibold text-slate-200">Quick Stock Out</p>
            </CardContent>
          </Card>
        </Link>

        <Card className="glass-card hover:border-indigo-500/20 transition-all duration-200">
          <CardContent className="p-5 h-full flex flex-col justify-center relative overflow-hidden">
            <div className="absolute right-3 top-3 p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Package className="h-4 w-4" />
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-wider truncate pr-8">Products Tracked</p>
            <p className="text-3xl font-bold text-slate-100 mt-2 truncate">{stats?.total_products ?? "—"}</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:border-amber-500/20 transition-all duration-200">
          <CardContent className="p-5 h-full flex flex-col justify-center relative overflow-hidden">
            <div className="absolute right-3 top-3 p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <BellRing className="h-4 w-4" />
            </div>
            <p className="text-xs text-slate-400 uppercase tracking-wider truncate pr-8">Open Alerts</p>
            <p className="text-3xl font-bold text-amber-500 mt-2 truncate">{stats?.open_alerts_count ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              {alerts.length === 0 ? (
                <p className="text-sm text-slate-400">No open alerts</p>
              ) : (
                alerts.map((a) => (
                  <div key={a.id} className="mb-3 rounded-lg border border-white/5 bg-slate-900/50 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-200">{a.title}</span>
                      <Badge variant="outline" className="border-white/10 text-slate-400">{a.severity}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{a.message}</p>
                  </div>
                ))
              )}
            </ScrollArea>
            <Link href="/alerts">
              <Button variant="link" className="mt-2 px-0 text-indigo-400">
                View all alerts
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <ClipboardList className="h-4 w-4 text-indigo-400" /> Items Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              {reorderItems.length === 0 ? (
                <p className="text-sm text-slate-400">No critical items</p>
              ) : (
                reorderItems.map((item) => (
                  <div
                    key={item.id}
                    className="mb-2 flex items-center justify-between rounded-lg border border-white/5 bg-slate-900/50 p-3 text-sm"
                  >
                    <span className="text-slate-200">{item.product_name}</span>
                    <span className="font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">Stock: {item.current_stock}</span>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
