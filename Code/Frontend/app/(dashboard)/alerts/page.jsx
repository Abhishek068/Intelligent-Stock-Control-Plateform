"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Package,
  Calendar,
  TrendingUp,
  HelpCircle,
  Filter,
  CheckCheck,
  Eye,
  Zap,
  X } from
"lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";


import { PageHeader } from "@/components/shared/PageHeader";
import { StatsGrid } from "@/components/shared/StatsGrid";
import { ExplainabilitySheet } from "@/components/shared/ExplainabilitySheet";

import { notificationsApi, analyticsApi, stockApi } from "@/lib/api";

const severityColors = {
  critical: "bg-red-500 text-white",
  warning: "bg-amber-500 text-white",
  info: "bg-blue-500 text-white"
};

const typeBadgeVariants = {
  "low-stock": "border-amber-200 bg-amber-50 text-amber-700",
  "out-of-stock": "border-red-200 bg-red-50 text-red-700",
  predictive: "border-purple-200 bg-purple-50 text-purple-700",
  expiry: "border-orange-200 bg-orange-50 text-orange-700",
  anomaly: "border-pink-200 bg-pink-50 text-pink-700"
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");

  useEffect(() => {
    Promise.all([
      notificationsApi.list().catch(() => []),
      analyticsApi.listPredictiveAlerts({ is_resolved: "false" }).catch(() => []),
    ]).then(([items, predictive]) => {
      const fromNotifications = items.map((a) => ({
        id: String(a.id),
        type: String(a.notification_type || "").replaceAll("_", "-"),
        severity: a.severity,
        title: a.title,
        message: a.message,
        product: a.related_entity_id,
        timestamp: new Date(a.created_at).toLocaleString(),
        read: a.is_read,
        explanation: a.explanation_json,
        source: "notification",
      }));
      const existingTitles = new Set(fromNotifications.map((a) => a.title + a.product));
      const fromPredictive = (predictive || [])
        .filter((p) => !existingTitles.has(`Predicted Stockout${p.product}`))
        .map((p) => ({
          id: `pa-${p.id}`,
          type: "predictive",
          severity: String(p.severity || "warning").toLowerCase(),
          title: `Predicted stockout: ${p.product_name}`,
          message: `Stockout risk around ${p.predicted_stockout_date || "soon"}`,
          product: p.product,
          timestamp: p.generated_at ? new Date(p.generated_at).toLocaleString() : "",
          read: false,
          explanation: p.explanation_json,
          source: "predictive",
          predictiveId: p.id,
        }));
      setAlerts([...fromPredictive, ...fromNotifications]);
    });
  }, []);

  const filteredAlerts = alerts.filter((alert) => {
    const severityMatch = severityFilter === "all" || alert.severity === severityFilter;
    const typeMatch = typeFilter === "all" || alert.type === typeFilter;
    const readMatch = readFilter === "all" || readFilter === "read" && alert.read || readFilter === "unread" && !alert.read;
    return severityMatch && typeMatch && readMatch;
  });

  const unreadCount = alerts.filter((a) => !a.read).length;

  const markAsRead = async (id) => {
    const alert = alerts.find((a) => a.id === id);
    if (alert?.source === "predictive" && alert.predictiveId) {
      await analyticsApi.resolvePredictiveAlert(alert.predictiveId);
      setAlerts(alerts.map((a) => (a.id === id ? { ...a, read: true } : a)));
      toast.success("Predictive alert resolved");
      return;
    }
    await notificationsApi.markRead(Number(id));
    setAlerts(alerts.map((a) => (a.id === id ? { ...a, read: true } : a)));
    toast.success("Alert marked as read");
  };

  const markAllAsRead = async () => {
    await notificationsApi.markAllRead();
    setAlerts(alerts.map((a) => ({ ...a, read: true })));
    toast.success("All alerts marked as read");
  };

  const dismissAlert = (id) => {
    setAlerts(alerts.filter((a) => a.id !== id));
    toast.info("Alert dismissed");
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case "low-stock":
      case "out-of-stock":
        return <Package className="h-4 w-4" />;
      case "predictive":
        return <TrendingUp className="h-4 w-4" />;
      case "expiry":
        return <Calendar className="h-4 w-4" />;
      case "anomaly":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const stats = {
    critical: alerts.filter((a) => a.severity === "critical" && !a.read).length,
    warning: alerts.filter((a) => a.severity === "warning" && !a.read).length,
    info: alerts.filter((a) => a.severity === "info" && !a.read).length,
    predictive: alerts.filter((a) => a.type === "predictive" && !a.read).length
  };

  const handleRunExpiryScan = async () => {
    try {
      const res = await stockApi.triggerExpiryScan();
      toast.success(res?.message || "Expiry scan completed!");
      const items = await notificationsApi.list().catch(() => []);
      const fromNotifications = items.map((a) => ({
        id: String(a.id),
        type: String(a.notification_type || "").replaceAll("_", "-"),
        severity: a.severity,
        title: a.title,
        message: a.message,
        product: a.related_entity_id,
        timestamp: new Date(a.created_at).toLocaleString(),
        read: a.is_read,
        explanation: a.explanation_json,
        source: "notification",
      }));
      setAlerts(fromNotifications);
    } catch {
      toast.error("Failed to run expiry scan.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts & Notifications"
        description="Monitor stock warnings, expiry thresholds (30d/15d/7d), predictions, and system notifications"
        actions={
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              onClick={handleRunExpiryScan}
              className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-semibold rounded-lg"
            >
              <Zap className="mr-1.5 h-3.5 w-3.5 text-amber-400" /> Run Expiry Scan
            </Button>
            <Badge variant="secondary" className="text-sm">
              <Bell className="mr-1 h-3 w-3" /> {unreadCount} unread
            </Badge>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
              </Button>
            )}
          </div>
        } 
      />
      

      <StatsGrid
        stats={[
        { label: "Critical", value: stats.critical, color: "red", highlight: true },
        { label: "Warning", value: stats.warning, color: "amber", highlight: true },
        { label: "Info", value: stats.info, color: "blue", highlight: true },
        { label: "Predictive", value: stats.predictive, color: "purple", highlight: true }]
        } />
      

      <Card className="glass-card border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" /><span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filters:</span></div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[130px] bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl font-medium"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl rounded-xl text-slate-800 dark:text-slate-200">
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl font-medium"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl rounded-xl text-slate-800 dark:text-slate-200">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="low-stock">Low Stock</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              <SelectItem value="predictive">Predictive</SelectItem>
              <SelectItem value="expiry">Expiry</SelectItem>
              <SelectItem value="anomaly">Anomaly</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-slate-950/50 p-1">
            <Button variant={readFilter === "all" ? "default" : "ghost"} size="sm" onClick={() => setReadFilter("all")} className="h-7 px-3 text-xs rounded-lg font-semibold cursor-pointer">All</Button>
            <Button variant={readFilter === "unread" ? "default" : "ghost"} size="sm" onClick={() => setReadFilter("unread")} className="h-7 px-3 text-xs rounded-lg font-semibold cursor-pointer">Unread</Button>
            <Button variant={readFilter === "read" ? "default" : "ghost"} size="sm" onClick={() => setReadFilter("read")} className="h-7 px-3 text-xs rounded-lg font-semibold cursor-pointer">Read</Button>
          </div>
          <span className="ml-auto text-sm font-medium text-slate-500 dark:text-slate-400">Showing {filteredAlerts.length} of {alerts.length}</span>
        </CardContent>
      </Card>

      <Card className="glass-card border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                  <CheckCircle className="h-12 w-12 mb-2 text-emerald-500" />
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">All clear!</p>
                  <p className="text-sm text-slate-500">No active alerts match the selected criteria.</p>
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <div key={alert.id} className={`flex items-start gap-4 p-5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${!alert.read ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""}`}>
                    <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-xs ${!alert.read ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800/80 dark:text-slate-400"}`}>
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`${!alert.read ? severityColors[alert.severity] : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-transparent"} font-bold px-2 py-0.5 text-xs`}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline" className={`${typeBadgeVariants[alert.type]} font-bold px-2 py-0.5 text-xs`}>
                          {alert.type.replace("-", " ").toUpperCase()}
                        </Badge>
                        {!alert.read && <Badge className="bg-indigo-600 text-white font-bold px-2 py-0.5 text-xs">New</Badge>}
                      </div>
                      <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base">{alert.title}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{alert.message}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {alert.product && <span>Product: <strong className="text-slate-700 dark:text-slate-300 font-mono">#{alert.product}</strong></span>}
                        {alert.product && <span>•</span>}
                        <span>{alert.timestamp}</span>
                        {alert.type === "predictive" && alert.predictedDate && (
                          <>
                            <span>•</span>
                            <span className="text-purple-600 dark:text-purple-400 font-bold">Predicted: {alert.predictedDate}</span>
                          </>
                        )}
                        {alert.type === "expiry" && alert.expiryDays && (
                          <>
                            <span>•</span>
                            <span className={`font-bold ${alert.expiryDays <= 7 ? "text-rose-600 dark:text-rose-400" : alert.expiryDays <= 15 ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"}`}>{alert.expiryDays} days</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {alert.type === "predictive" && (
                        <ExplainabilitySheet
                          title="Predictive Alert Explanation"
                          trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer">
                              <HelpCircle className="h-4 w-4" />
                            </Button>
                          }
                        >
                          <div className="rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 p-5 text-slate-800 dark:text-slate-200">
                            <p className="font-bold text-purple-900 dark:text-purple-200 text-base">Why is this predicted?</p>
                            <ul className="mt-3 list-disc space-y-2 pl-4 text-sm">
                              <li>Current Stock: <strong className="font-mono">{alert.explanation?.current_stock ?? "—"}</strong></li>
                              <li>Lead Time: <strong className="font-mono">{alert.explanation?.lead_time_days ?? "—"} days</strong></li>
                              <li>Avg Daily Demand: <strong className="font-mono">{alert.explanation?.avg_daily_demand ?? "—"}</strong></li>
                              <li>Days Until Stockout: <strong className="text-rose-600 dark:text-rose-400 font-mono font-bold">{alert.explanation?.days_until_stockout ?? "—"}</strong></li>
                            </ul>
                          </div>
                        </ExplainabilitySheet>
                      )}
                      {!alert.read && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer" onClick={() => markAsRead(alert.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer" onClick={() => dismissAlert(alert.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
