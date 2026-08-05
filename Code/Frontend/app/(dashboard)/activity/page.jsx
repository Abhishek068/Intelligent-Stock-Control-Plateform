"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { activityApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { unwrapList } from "@/lib/api/client";
import { Activity, Clock, RefreshCw, LogIn, LogOut, Settings, History, User } from "lucide-react";
import { Button } from "@/components/ui/button";

function getEventBadge(eventType) {
  switch (eventType) {
    case "user_login":
      return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-normal px-2 py-0.5">user login</Badge>;
    case "user_logout":
      return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 font-normal px-2 py-0.5">user logout</Badge>;
    case "system":
      return <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-normal px-2 py-0.5">system</Badge>;
    default:
      return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-normal px-2 py-0.5">{eventType}</Badge>;
  }
}

function getEventIcon(eventType) {
  switch (eventType) {
    case "user_login":
      return <LogIn className="h-4 w-4 text-emerald-400" />;
    case "user_logout":
      return <LogOut className="h-4 w-4 text-slate-400" />;
    case "system":
      return <Settings className="h-4 w-4 text-purple-400" />;
    default:
      return <Activity className="h-4 w-4 text-blue-400" />;
  }
}

export default function ActivityPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async (showToast = false) => {
    setLoading(true);
    try {
      const res = await activityApi.list();
      setEvents(unwrapList(res));
      if (showToast) toast.success("Activity timeline refreshed");
    } catch (e) {
      toast.error(e.message || "Failed to load activity");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <History className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Activity Center
            </h1>
          </div>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Operational timeline and system events (separate from immutable audit log).
          </p>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => load(true)} 
            disabled={loading}
            className="bg-slate-900/50 border-white/10 hover:bg-white/10 text-slate-200 hover:text-white backdrop-blur-xl rounded-xl h-11 px-5 transition-all shadow-lg shadow-black/20"
          >
            <RefreshCw className={`mr-2 h-4 w-4 text-blue-400 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

        <CardHeader className="px-8 py-6 border-b border-white/5 bg-slate-950/20 relative z-10">
          <CardTitle className="text-slate-200 font-semibold text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-400" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-6 sm:p-10 relative z-10">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 animate-pulse">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-400 mb-3" />
              <p>Loading timeline...</p>
            </div>
          ) : (
            <div className="relative">
              {/* Main Timeline Line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-indigo-500/20 to-transparent" />
              
              <div className="space-y-6">
                {events.map((ev, index) => (
                  <div key={ev.id} className="relative pl-16 group">
                    {/* Timeline Dot */}
                    <div className="absolute left-[21px] top-1.5 h-3 w-3 rounded-full bg-blue-500 border-[3px] border-[#0B1121] shadow-[0_0_10px_rgba(59,130,246,0.8)] z-10 transition-transform group-hover:scale-125 group-hover:bg-indigo-400" />
                    
                    {/* Event Content Card */}
                    <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4 hover:bg-slate-900/60 hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.05)] transition-all duration-300 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/20 group-hover:bg-blue-500/50 transition-colors" />
                      
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {getEventIcon(ev.event_type)}
                            <p className="text-base font-semibold text-slate-100 group-hover:text-blue-200 transition-colors">{ev.title}</p>
                          </div>
                          
                          {ev.description && (
                            <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{ev.description}</p>
                          )}
                          
                          <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 font-medium">
                            <span className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-md border border-white/5">
                              <User className="h-3.5 w-3.5" />
                              {ev.user_name || ev.user_email || "System"}
                            </span>
                            <span>•</span>
                            <span className="font-mono">
                              {ev.created_at ? new Date(ev.created_at).toLocaleString() : ""}
                            </span>
                          </div>
                        </div>
                        
                        <div className="shrink-0 pt-1">
                          {getEventBadge(ev.event_type)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {events.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 pl-8">
                    <History className="h-12 w-12 text-slate-600 mb-4 opacity-50" />
                    <p className="text-lg font-medium text-slate-300">No activity to display</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
