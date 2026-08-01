"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { notificationsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter === "unread") params.is_read = "false";
      if (filter === "read") params.is_read = "true";
      if (typeFilter !== "all") params.notification_type = typeFilter;
      const list = await notificationsApi.list(params);
      setItems(list);
    } catch (e) {
      toast.error(e.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Notifications</h1>
          <p className="text-slate-400 mt-1">In-app history — IAM, reports, stock alerts and system events</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { load(); toast.success("Notifications refreshed successfully"); }} disabled={loading} className="cursor-pointer">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin text-indigo-400" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={markAll}>
            <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="low_stock">Low stock</SelectItem>
            <SelectItem value="out_of_stock">Out of stock</SelectItem>
            <SelectItem value="predictive">Predictive</SelectItem>
            <SelectItem value="system">System</SelectItem>
            <SelectItem value="iam">IAM</SelectItem>
            <SelectItem value="report">Report</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <Bell className="h-4 w-4" /> Inbox
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-slate-500 text-sm">Loading...</p>}
          {!loading && items.length === 0 && (
            <p className="text-slate-500 text-sm">No notifications</p>
          )}
          {items.map((n) => (
            <div
              key={n.id}
              className={`rounded-lg border p-3 ${n.is_read ? "border-white/5 opacity-70" : "border-indigo-500/30 bg-indigo-500/5"
                }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-100">{n.title}</p>
                  <p className="text-xs text-slate-400 mt-1">{n.message}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {n.notification_type}
                    </Badge>
                    <Badge variant="outline" className="capitalize text-[10px]">
                      {n.severity}
                    </Badge>
                    {n.priority && (
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {n.priority}
                      </Badge>
                    )}
                    <span className="text-[10px] text-slate-500">
                      {n.created_at ? new Date(n.created_at).toLocaleString() : ""}
                    </span>
                  </div>
                </div>
                {!n.is_read && (
                  <Button size="sm" variant="outline" onClick={() => markRead(n.id)}>
                    Mark read
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
