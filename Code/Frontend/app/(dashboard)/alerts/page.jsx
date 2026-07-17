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

import { notificationsApi, analyticsApi } from "@/lib/api";

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts & Notifications"
        description="Monitor stock warnings, predictions, and system notifications"
        actions={
        <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              <Bell className="mr-1 h-3 w-3" /> {unreadCount} unread
            </Badge>
            {unreadCount > 0 &&
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
              </Button>
          }
          </div>
        } />
      

      <StatsGrid
        stats={[
        { label: "Critical", value: stats.critical, color: "red", highlight: true },
        { label: "Warning", value: stats.warning, color: "amber", highlight: true },
        { label: "Info", value: stats.info, color: "blue", highlight: true },
        { label: "Predictive", value: stats.predictive, color: "purple", highlight: true }]
        } />
      

      <Card className="glass-card">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-400" /><span className="text-sm text-slate-400">Filters:</span></div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="info">Info</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="low-stock">Low Stock</SelectItem>
              <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              <SelectItem value="predictive">Predictive</SelectItem>
              <SelectItem value="expiry">Expiry</SelectItem>
              <SelectItem value="anomaly">Anomaly</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <Button variant={readFilter === "all" ? "default" : "ghost"} size="sm" onClick={() => setReadFilter("all")} className="h-7 px-2 text-xs">All</Button>
            <Button variant={readFilter === "unread" ? "default" : "ghost"} size="sm" onClick={() => setReadFilter("unread")} className="h-7 px-2 text-xs">Unread</Button>
            <Button variant={readFilter === "read" ? "default" : "ghost"} size="sm" onClick={() => setReadFilter("read")} className="h-7 px-2 text-xs">Read</Button>
          </div>
          <span className="ml-auto text-sm text-slate-400">Showing {filteredAlerts.length} of {alerts.length}</span>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="divide-y divide-slate-100">
              {filteredAlerts.length === 0 ?
              <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                  <CheckCircle className="h-12 w-12 mb-2 text-green-400" />
                  <p className="text-lg font-medium">All clear!</p>
                </div> :

              filteredAlerts.map((alert) =>
              <div key={alert.id} className={`flex items-start gap-4 p-4 transition-colors hover:bg-slate-900/50 ${!alert.read ? "bg-slate-900/50/80" : ""}`}>
                    <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${!alert.read ? "bg-teal-100 text-teal-700" : "bg-slate-800/50 text-slate-400"}`}>
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`${!alert.read ? severityColors[alert.severity] : "bg-slate-800/50 text-slate-400"}`}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline" className={typeBadgeVariants[alert.type]}>
                          {alert.type.replace("-", " ").toUpperCase()}
                        </Badge>
                        {!alert.read && <Badge className="bg-teal-500 text-white">New</Badge>}
                      </div>
                      <h4 className="font-medium text-slate-100">{alert.title}</h4>
                      <p className="text-sm text-slate-400">{alert.message}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span>Product: {alert.product}</span><span>•</span><span>{alert.timestamp}</span>
                        {alert.type === "predictive" && alert.predictedDate &&
                    <><span>•</span><span className="text-purple-600 font-medium">Predicted: {alert.predictedDate}</span></>
                    }
                        {alert.type === "expiry" && alert.expiryDays &&
                    <><span>•</span><span className={`font-medium ${alert.expiryDays <= 7 ? "text-red-600" : alert.expiryDays <= 15 ? "text-amber-600" : "text-blue-600"}`}>{alert.expiryDays} days</span></>
                    }
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {alert.type === "predictive" &&
                  <ExplainabilitySheet
                    title="Predictive Alert Explanation"
                    trigger={
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-purple-600">
                              <HelpCircle className="h-4 w-4" />
                            </Button>
                    }>
                    
                          <div className="rounded-lg bg-purple-50 p-4">
                            <p className="font-medium">Why is this predicted?</p>
                            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                              <li>Current Stock: <strong>{alert.explanation?.current_stock ?? "—"}</strong></li>
                              <li>Lead Time: <strong>{alert.explanation?.lead_time_days ?? "—"} days</strong></li>
                              <li>Avg Daily Demand: <strong>{alert.explanation?.avg_daily_demand ?? "—"}</strong></li>
                              <li>Days Until Stockout: <strong className="text-red-600">{alert.explanation?.days_until_stockout ?? "—"}</strong></li>
                            </ul>
                          </div>
                        </ExplainabilitySheet>
                  }
                      {!alert.read &&
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-teal-600" onClick={() => markAsRead(alert.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                  }
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-600" onClick={() => dismissAlert(alert.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
              )
              }
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>);

}
