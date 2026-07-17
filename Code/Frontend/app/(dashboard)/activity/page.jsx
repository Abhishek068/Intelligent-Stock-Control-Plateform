"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { activityApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { unwrapList } from "@/lib/api/client";

export default function ActivityPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await activityApi.list();
        setEvents(unwrapList(res));
      } catch (e) {
        toast.error(e.message || "Failed to load activity");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100">Activity Center</h1>
        <p className="text-slate-400 mt-1">Operational timeline (separate from audit log)</p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-slate-100">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : (
            <div className="relative border-l border-white/10 ml-3 space-y-6">
              {events.map((ev) => (
                <div key={ev.id} className="ml-6 relative">
                  <div className="absolute -left-[1.9rem] top-1 h-3 w-3 rounded-full bg-indigo-500" />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-100">{ev.title}</p>
                      {ev.description && (
                        <p className="text-xs text-slate-400 mt-1">{ev.description}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {ev.user_name || ev.user_email || "System"} ·{" "}
                        {ev.created_at ? new Date(ev.created_at).toLocaleString() : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {ev.event_type}
                    </Badge>
                  </div>
                </div>
              ))}
              {events.length === 0 && <p className="text-slate-500 text-sm ml-6">No activity yet</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
