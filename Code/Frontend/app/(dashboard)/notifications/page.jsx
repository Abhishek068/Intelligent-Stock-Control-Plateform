"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, CheckCheck, RefreshCw, Info, AlertTriangle, AlertCircle, Search, Activity } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SeverityIcon({ severity }) {
  if (severity === "critical") return <AlertCircle className="h-4 w-4 text-rose-400" />;
  if (severity === "warning") return <AlertTriangle className="h-4 w-4 text-amber-400" />;
  return <Info className="h-4 w-4 text-blue-400" />;
}

function SeverityBadge({ severity }) {
  if (severity === "critical") {
    return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-inner px-2 py-0.5 capitalize text-[10px]">Critical</Badge>;
  }
  if (severity === "warning") {
    return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-inner px-2 py-0.5 capitalize text-[10px]">Warning</Badge>;
  }
  return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-inner px-2 py-0.5 capitalize text-[10px]">{severity || "Info"}</Badge>;
}

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const load = async (showToast = false) => {
    setLoading(true);
    try {
      const params = {};
      if (filter === "unread") params.is_read = "false";
      if (filter === "read") params.is_read = "true";
      if (typeFilter !== "all") params.notification_type = typeFilter;
      const list = await notificationsApi.list(params);
      setItems(list);
      if (showToast) toast.success("Notifications refreshed successfully");
    } catch (e) {
      toast.error(e.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, typeFilter]);

  const markRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
      load();
    } catch (e) {
      toast.error(e.message || "Failed");
    }
  };

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
      toast.success("All marked as read");
      load();
    } catch (e) {
      toast.error(e.message || "Failed");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Bell className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Notifications
            </h1>
          </div>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            In-app history — IAM, reports, stock alerts and system events.
          </p>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => load(true)} 
            disabled={loading} 
            className="bg-slate-900/50 border-white/10 hover:bg-white/10 text-slate-200 hover:text-white backdrop-blur-xl rounded-xl h-11 px-5 transition-all shadow-lg shadow-black/20"
          >
            <RefreshCw className={`mr-2 h-4 w-4 text-indigo-400 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button 
            onClick={markAll}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl h-11 px-6 shadow-lg shadow-indigo-500/25 border border-indigo-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
          </Button>
        </div>
      </div>

      <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Inbox Header & Filters */}
        <div className="px-8 py-5 border-b border-white/5 bg-slate-950/20 relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-lg">
            <Activity className="h-5 w-5 text-indigo-400" /> 
            Inbox Activity
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[160px] bg-slate-950/50 border-white/10 focus:border-indigo-500/50 text-slate-200 rounded-xl h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 shadow-xl rounded-xl text-slate-200">
                <SelectItem value="all" className="focus:bg-indigo-500/20 focus:text-indigo-200 cursor-pointer">All statuses</SelectItem>
                <SelectItem value="unread" className="focus:bg-indigo-500/20 focus:text-indigo-200 cursor-pointer">Unread only</SelectItem>
                <SelectItem value="read" className="focus:bg-indigo-500/20 focus:text-indigo-200 cursor-pointer">Read only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px] bg-slate-950/50 border-white/10 focus:border-indigo-500/50 text-slate-200 rounded-xl h-10">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 shadow-xl rounded-xl text-slate-200">
                <SelectItem value="all" className="focus:bg-indigo-500/20 focus:text-indigo-200 cursor-pointer">All types</SelectItem>
                <SelectItem value="low_stock" className="focus:bg-indigo-500/20 focus:text-indigo-200 cursor-pointer">Low stock</SelectItem>
                <SelectItem value="out_of_stock" className="focus:bg-indigo-500/20 focus:text-indigo-200 cursor-pointer">Out of stock</SelectItem>
                <SelectItem value="predictive" className="focus:bg-indigo-500/20 focus:text-indigo-200 cursor-pointer">Predictive</SelectItem>
                <SelectItem value="system" className="focus:bg-indigo-500/20 focus:text-indigo-200 cursor-pointer">System</SelectItem>
                <SelectItem value="iam" className="focus:bg-indigo-500/20 focus:text-indigo-200 cursor-pointer">IAM</SelectItem>
                <SelectItem value="report" className="focus:bg-indigo-500/20 focus:text-indigo-200 cursor-pointer">Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardContent className="p-6 sm:p-8 space-y-4 relative z-10">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 animate-pulse">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-400 mb-3" />
              <p>Loading notifications...</p>
            </div>
          )}
          
          {!loading && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Bell className="h-12 w-12 text-slate-600 mb-4 opacity-50" />
              <p className="text-lg font-medium text-slate-300">You're all caught up!</p>
              <p className="text-sm mt-1">No notifications match your current filters.</p>
            </div>
          )}
          
          <div className="flex flex-col gap-3">
            {items.map((n) => (
              <div
                key={n.id}
                className={`relative overflow-hidden rounded-xl border p-5 transition-all duration-300 group ${
                  n.is_read 
                    ? "border-white/5 bg-slate-950/20 opacity-70 hover:opacity-100" 
                    : "border-indigo-500/30 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.05)]"
                }`}
              >
                {!n.is_read && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500" />
                )}
                <div className="flex items-start gap-4">
                  <div className={`mt-0.5 shrink-0 ${n.is_read ? 'opacity-50' : ''}`}>
                    <SeverityIcon severity={n.severity} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                      <p className={`text-base font-semibold truncate ${n.is_read ? 'text-slate-300' : 'text-slate-100'}`}>
                        {n.title}
                      </p>
                      <span className="text-[11px] font-mono text-slate-500 shrink-0">
                        {n.created_at ? new Date(n.created_at).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : ""}
                      </span>
                    </div>
                    
                    <p className={`text-sm leading-relaxed ${n.is_read ? 'text-slate-400' : 'text-slate-300'}`}>
                      {n.message}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <Badge className="bg-slate-800 border-white/10 text-slate-300 capitalize text-[10px] px-2 py-0.5">
                        {n.notification_type?.replace('_', ' ')}
                      </Badge>
                      <SeverityBadge severity={n.severity} />
                      {n.priority && (
                        <Badge className="bg-purple-500/10 border-purple-500/20 text-purple-300 capitalize text-[10px] px-2 py-0.5">
                          {n.priority}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {!n.is_read && (
                    <Button 
                      size="sm" 
                      onClick={() => markRead(n.id)}
                      className="shrink-0 bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-500/30 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
