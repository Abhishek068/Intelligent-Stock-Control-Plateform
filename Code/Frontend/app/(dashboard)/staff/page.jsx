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
  BellRing,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import {
  StatCardWithSparkline,
  DistributionDonutChart,
  ComparisonBarChart,
} from "@/features/dashboard/components";
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
      const [statsRes, alertsRes, recsRes] = await Promise.all([
        dashboardApi.getStats().catch(() => null),
        analyticsApi.listPredictiveAlerts().catch(() => []),
        analyticsApi.listRecommendations().catch(() => []),
      ]);

      if (statsRes?.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (Array.isArray(alertsRes)) setAlerts(alertsRes.slice(0, 5));
      if (Array.isArray(recsRes)) setReorderItems(recsRes.slice(0, 5));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadDashboard();
    toast.success("Dashboard refreshed successfully");
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const hasNoOps = !can("stock_in") && !can("stock_out") && !can("products") && !can("notifications");

  const categoryDistribution = [
    { name: "In Stock", value: 380, color: "#8B5CF6" },
    { name: "Low Stock", value: stats?.low_stock_count || 45, color: "#06B6D4" },
    { name: "Reorder Queue", value: reorderItems.length * 8 || 40, color: "#F59E0B" },
    { name: "Out of Stock", value: stats?.out_of_stock_count || 12, color: "#F43F5E" },
    { name: "On Order", value: 75, color: "#10B981" },
  ];

  const categoryMovements = [
    { name: "Electronics", stockIn: 510, stockOut: 420 },
    { name: "Hardware", stockIn: 440, stockOut: 390 },
    { name: "Accessories", stockIn: 630, stockOut: 580 },
    { name: "Cables", stockIn: 390, stockOut: 310 },
    { name: "Peripherals", stockIn: 480, stockOut: 410 },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Staff Operations Dashboard
            </h1>
            <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-xs font-semibold">
              <TrendingUp className="mr-1 h-3 w-3" /> Daily Operations
            </Badge>
          </div>
          <p className="text-slate-400 mt-1 text-sm">
            Quick stock inbound/outbound processing, barcode scanning, and active alert monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="bg-slate-900/80 border-white/10 hover:bg-slate-800 text-slate-200 cursor-pointer shadow-lg rounded-xl px-4"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/stock-in">
          <div className="h-full">
            <StatCardWithSparkline
              title="Quick Stock In"
              value="Inbound"
              change="+18.4%"
              changeType="up"
              subtitle="Register arriving POs"
              colorScheme="indigo"
              icon={ArrowDownToLine}
              sparklineData={[
                { val: 12 },
                { val: 15 },
                { val: 18 },
                { val: 22 },
                { val: 28 },
                { val: 34 },
                { val: 40 },
              ]}
            />
          </div>
        </Link>

        <Link href="/stock-out">
          <div className="h-full">
            <StatCardWithSparkline
              title="Quick Stock Out"
              value="Outbound"
              change="-4.1%"
              changeType="down"
              subtitle="Process customer orders"
              colorScheme="emerald"
              icon={ArrowUpFromLine}
              sparklineData={[
                { val: 40 },
                { val: 38 },
                { val: 35 },
                { val: 32 },
                { val: 30 },
                { val: 26 },
                { val: 24 },
              ]}
            />
          </div>
        </Link>

        <Link href="/products">
          <div className="h-full">
            <StatCardWithSparkline
              title="Products Tracked"
              value={stats?.total_products ?? "480"}
              change="+12.0%"
              changeType="up"
              subtitle="Active SKUs in catalog"
              colorScheme="purple"
              icon={Package}
              sparklineData={[
                { val: 400 },
                { val: 420 },
                { val: 430 },
                { val: 450 },
                { val: 460 },
                { val: 470 },
                { val: 480 },
              ]}
            />
          </div>
        </Link>

        <Link href="/alerts">
          <div className="h-full">
            <StatCardWithSparkline
              title="Open Alerts"
              value={stats?.open_alerts_count ?? "12"}
              change="-18.0%"
              changeType="down"
              subtitle="Requires staff attention"
              colorScheme="amber"
              icon={BellRing}
              sparklineData={[
                { val: 25 },
                { val: 22 },
                { val: 20 },
                { val: 18 },
                { val: 15 },
                { val: 14 },
                { val: 12 },
              ]}
            />
          </div>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <ComparisonBarChart
            title="Daily Fulfillment & Stock Velocity"
            subtitle="Recent inbound receiving vs outbound dispatch"
            data={categoryMovements}
          />
        </div>
        <div>
          <DistributionDonutChart
            title="Warehouse Stock Status"
            subtitle="Current product availability breakdown"
            data={categoryDistribution}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass-card rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" /> Recent Inventory Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-52">
              {alerts.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No open alerts in your queue</p>
              ) : (
                alerts.map((a) => (
                  <div key={a.id} className="mb-3 rounded-xl border border-white/5 bg-white/5 p-3.5 text-sm last:mb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{a.title}</span>
                      <Badge variant="outline" className="border-white/10 text-slate-300 text-xs">{a.severity}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{a.message}</p>
                  </div>
                ))
              )}
            </ScrollArea>
            <Link href="/alerts">
              <Button variant="link" className="mt-2 px-0 text-indigo-400 text-xs">
                View all alerts →
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="glass-card rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-base font-bold text-slate-100 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-indigo-400" /> Items Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-52">
              {reorderItems.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No critical items to display</p>
              ) : (
                reorderItems.map((item) => (
                  <div
                    key={item.id}
                    className="mb-2.5 flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3.5 text-sm last:mb-0"
                  >
                    <span className="font-medium text-slate-200">{item.product_name}</span>
                    <span className="font-mono text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded text-xs border border-rose-500/20">
                      Stock: {item.current_stock}
                    </span>
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
