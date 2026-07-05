"use client";

import { useState } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  Calendar,
  TrendingUp,
  HelpCircle,
  Filter,
  CheckCheck,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUserStore } from "@/lib/store";


const mockAlerts = [
  {
    id: "1",
    type: "low-stock",
    severity: "warning",
    title: "Low Stock Warning",
    message: "Keyboard Wired has dropped below reorder point (8 units).",
    product: "Keyboard Wired",
    productId: "4",
    timestamp: "2026-07-03 09:30 AM",
    read: false,
    currentStock: 3,
    leadTime: 2,
    forecastDemand: 40,
  },
  {
    id: "2",
    type: "predictive",
    severity: "critical",
    title: "Predictive Stockout Alert",
    message: "Wireless Mouse is predicted to stock out in 5 days.",
    product: "Wireless Mouse",
    productId: "1",
    timestamp: "2026-07-03 08:15 AM",
    read: false,
    predictedDate: "2026-07-08",
    currentStock: 12,
    leadTime: 3,
    forecastDemand: 45,
  },
  {
    id: "3",
    type: "expiry",
    severity: "critical",
    title: "Expiry Alert: 7 Days",
    message: "Ink Cartridges (batch IC-2024-02) expires in 7 days.",
    product: "Ink Cartridges",
    productId: "5",
    timestamp: "2026-07-02 04:45 PM",
    read: false,
    expiryDays: 7,
  },
  {
    id: "4",
    type: "expiry",
    severity: "warning",
    title: "Expiry Alert: 15 Days",
    message: "Medi-Kit Refills (batch M2024-03) expires in 15 days.",
    product: "Medi-Kit Refills",
    productId: "6",
    timestamp: "2026-07-02 04:45 PM",
    read: false,
    expiryDays: 15,
  },
  {
    id: "5",
    type: "anomaly",
    severity: "warning",
    title: "Unusual Stock Movement Detected",
    message: "Large negative adjustment (-50 units) detected for USB-C Cables.",
    product: "USB-C Cables",
    productId: "2",
    timestamp: "2026-07-01 02:20 PM",
    read: true,
    anomalyScore: 78,
  },
  {
    id: "6",
    type: "out-of-stock",
    severity: "critical",
    title: "Out of Stock",
    message: "Desk Monitor Stand is completely out of stock.",
    product: "Desk Monitor Stand",
    productId: "3",
    timestamp: "2026-06-30 11:00 AM",
    read: true,
    currentStock: 0,
  },
];

const severityColors = {
  critical: "bg-red-500 text-white",
  warning: "bg-amber-500 text-white",
  info: "bg-blue-500 text-white",
};

const typeBadgeVariants = {
  "low-stock": "border-amber-200 bg-amber-50 text-amber-700",
  "out-of-stock": "border-red-200 bg-red-50 text-red-700",
  predictive: "border-purple-200 bg-purple-50 text-purple-700",
  expiry: "border-orange-200 bg-orange-50 text-orange-700",
  anomaly: "border-pink-200 bg-pink-50 text-pink-700",
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(mockAlerts);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");

  const filteredAlerts = alerts.filter((alert) => {
    const severityMatch = severityFilter === "all" || alert.severity === severityFilter;
    const typeMatch = typeFilter === "all" || alert.type === typeFilter;
    const readMatch = readFilter === "all" || (readFilter === "read" && alert.read) || (readFilter === "unread" && !alert.read);
    return severityMatch && typeMatch && readMatch;
  });

  const unreadCount = alerts.filter((a) => !a.read).length;

  const markAsRead = (id) => {
    setAlerts(alerts.map((a) => (a.id === id ? { ...a, read: true } : a)));
    toast.success("Alert marked as read");
  };

  const markAllAsRead = () => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Alerts & Notifications</h1>
          <p className="text-slate-500">Monitor stock warnings, predictions, and system notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            <Bell className="mr-1 h-3 w-3" /> {unreadCount} unread
          </Badge>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-red-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Critical</p>
            <p className="text-2xl font-bold text-red-600">
              {alerts.filter((a) => a.severity === "critical" && !a.read).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-amber-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Warning</p>
            <p className="text-2xl font-bold text-amber-600">
              {alerts.filter((a) => a.severity === "warning" && !a.read).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Info</p>
            <p className="text-2xl font-bold text-blue-600">
              {alerts.filter((a) => a.severity === "info" && !a.read).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-purple-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Predictive</p>
            <p className="text-2xl font-bold text-purple-600">
              {alerts.filter((a) => a.type === "predictive" && !a.read).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-400" /><span className="text-sm text-slate-500">Filters:</span></div>
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

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="divide-y divide-slate-100">
              {filteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                  <CheckCircle className="h-12 w-12 mb-2 text-green-400" />
                  <p className="text-lg font-medium">All clear!</p>
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <div key={alert.id} className={`flex items-start gap-4 p-4 transition-colors hover:bg-slate-50 ${!alert.read ? "bg-slate-50/80" : ""}`}>
                    <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${!alert.read ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-400"}`}>
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`${!alert.read ? severityColors[alert.severity] : "bg-slate-100 text-slate-400"}`}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline" className={typeBadgeVariants[alert.type]}>
                          {alert.type.replace("-", " ").toUpperCase()}
                        </Badge>
                        {!alert.read && <Badge className="bg-teal-500 text-white">New</Badge>}
                      </div>
                      <h4 className="font-medium text-slate-900">{alert.title}</h4>
                      <p className="text-sm text-slate-600">{alert.message}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <span>Product: {alert.product}</span><span>•</span><span>{alert.timestamp}</span>
                        {alert.type === "predictive" && alert.predictedDate && (
                          <><span>•</span><span className="text-purple-600 font-medium">Predicted: {alert.predictedDate}</span></>
                        )}
                        {alert.type === "expiry" && alert.expiryDays && (
                          <><span>•</span><span className={`font-medium ${alert.expiryDays <= 7 ? "text-red-600" : alert.expiryDays <= 15 ? "text-amber-600" : "text-blue-600"}`}>{alert.expiryDays} days</span></>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {alert.type === "predictive" && (
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-purple-600">
                              <HelpCircle className="h-4 w-4" />
                            </Button>
                          </SheetTrigger>
                          <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                            <div className="mt-6 space-y-4">
                              <h3 className="text-lg font-semibold text-purple-900">Predictive Alert Explanation</h3>
                              <div className="rounded-lg bg-purple-50 p-4">
                                <p className="font-medium">Why is this predicted?</p>
                                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">
                                  <li>Current Stock: <strong>{alert.currentStock}</strong></li>
                                  <li>Lead Time: <strong>{alert.leadTime} days</strong></li>
                                  <li>Forecast Demand: <strong>{alert.forecastDemand}</strong> units</li>
                                  <li>Predicted Stockout: <strong className="text-red-600">{alert.predictedDate}</strong></li>
                                </ul>
                              </div>
                            </div>
                          </SheetContent>
                        </Sheet>
                      )}
                      {!alert.read && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-teal-600" onClick={() => markAsRead(alert.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-600" onClick={() => dismissAlert(alert.id)}>
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