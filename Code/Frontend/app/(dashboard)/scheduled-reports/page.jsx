"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Play, Trash2, RefreshCw, CalendarClock, Clock, Settings2 } from "lucide-react";
import { scheduledReportsApi, rolesApi, usersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { unwrapList } from "@/lib/api/client";

const FREQUENCIES = [
  { value: "every_5_min", label: "Every 5 Minutes" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const REPORT_TYPES = [
  { value: "inventory", label: "Inventory" },
  { value: "stock_in", label: "Stock In" },
  { value: "stock_out", label: "Stock Out" },
  { value: "low_stock", label: "Low Stock" },
  { value: "forecast", label: "Forecast" },
  { value: "reorder", label: "Reorder" },
  { value: "audit", label: "Audit" },
];

const DELIVERIES = [
  { value: "email", label: "Email" },
  { value: "notification", label: "Notification" },
  { value: "both", label: "Both" },
];

const emptyForm = {
  name: "",
  report_type: "inventory",
  frequency: "daily",
  delivery: "email",
  recipient_user_ids: [],
  recipient_role_ids: [],
  recipient_emails: "",
  is_active: true,
};

export default function ScheduledReportsPage() {
  const [reports, setReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const load = async (showToast = false) => {
    setLoading(true);
    try {
      const [r, u, rolesRes] = await Promise.all([
        scheduledReportsApi.list(),
        usersApi.list(),
        rolesApi.list(),
      ]);
      setReports(unwrapList(r));
      setUsers(unwrapList(u));
      setRoles(unwrapList(rolesRes));
      if (showToast) toast.success("Scheduled reports refreshed successfully");
    } catch (e) {
      toast.error(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      const emails = form.recipient_emails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      await scheduledReportsApi.create({
        name: form.name,
        report_type: form.report_type,
        frequency: form.frequency,
        delivery: form.delivery,
        recipient_user_ids: form.recipient_user_ids,
        recipient_role_ids: form.recipient_role_ids,
        recipient_emails: emails,
        is_active: form.is_active,
      });
      toast.success("Scheduled report created");
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      toast.error(e.message || "Create failed");
    }
  };

  const toggleActive = async (report) => {
    try {
      await scheduledReportsApi.update(report.id, { is_active: !report.is_active });
      load();
    } catch (e) {
      toast.error(e.message || "Update failed");
    }
  };

  const runNow = async (id) => {
    try {
      await scheduledReportsApi.runNow(id);
      toast.success("Report queued/delivered");
      load();
    } catch (e) {
      toast.error(e.message || "Run failed");
    }
  };

  const remove = async (id) => {
    try {
      await scheduledReportsApi.remove(id);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(e.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-purple-500/20 rounded-xl border border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <CalendarClock className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Scheduled Reports
            </h1>
          </div>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Manage report generation frequency, delivery channels, and recipients.
          </p>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => load(true)} 
            disabled={loading}
            className="bg-slate-900/50 border-white/10 hover:bg-white/10 text-slate-200 hover:text-white backdrop-blur-xl rounded-xl h-11 px-5 transition-all shadow-lg shadow-black/20"
          >
            <RefreshCw className={`mr-2 h-4 w-4 text-purple-400 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button 
            onClick={() => setOpen(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl h-11 px-6 shadow-lg shadow-purple-500/25 border border-purple-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="mr-2 h-4 w-4" /> New schedule
          </Button>
        </div>
      </div>

      <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

        <CardHeader className="px-8 py-5 border-b border-white/5 bg-slate-950/20 relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 space-y-0">
          <CardTitle className="text-slate-200 font-semibold text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-400" />
            Active Schedules
          </CardTitle>
          {!loading && reports.length > 0 && (
            <span className="text-sm font-medium text-slate-500 bg-slate-900/50 px-3 py-1 rounded-full border border-white/5">
              {reports.length} total schedule{reports.length !== 1 ? 's' : ''}
            </span>
          )}
        </CardHeader>
        
        <CardContent className="p-6 sm:p-8 space-y-4 relative z-10">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 animate-pulse">
              <RefreshCw className="h-8 w-8 animate-spin text-purple-400 mb-3" />
              <p>Loading schedules...</p>
            </div>
          )}
          
          {!loading && reports.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <CalendarClock className="h-12 w-12 text-slate-600 mb-4 opacity-50" />
              <p className="text-lg font-medium text-slate-300">No scheduled reports yet</p>
              <p className="text-sm mt-1">Click "New schedule" to automate your first report.</p>
            </div>
          )}
          
          <div className="flex flex-col gap-3">
            {reports.map((r) => (
              <div
                key={r.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-white/5 rounded-xl p-5 bg-slate-950/20 hover:bg-slate-900/60 hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.05)] transition-all duration-300 relative overflow-hidden"
              >
                {/* Active Indicator Glow */}
                {r.is_active && (
                  <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-purple-500 to-indigo-500" />
                )}
                
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <p className="text-base font-semibold text-slate-100">{r.name}</p>
                    <Badge 
                      className={`text-[10px] px-2 py-0.5 capitalize shadow-inner ${
                        r.is_active 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                      }`}
                    >
                      {r.is_active ? "Active" : "Paused"}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                    <span className="text-xs font-medium text-slate-300 uppercase tracking-wider bg-slate-800/50 px-2 py-0.5 rounded border border-white/5">
                      {r.report_type.replace('_', ' ')}
                    </span>
                    <span className="text-slate-500 text-xs">•</span>
                    <span className="text-xs text-slate-400 capitalize">{r.frequency.replace(/_/g, ' ')}</span>
                    <span className="text-slate-500 text-xs">•</span>
                    <span className="text-xs text-slate-400 capitalize">{r.delivery}</span>
                  </div>
                  
                  <p className="text-xs text-slate-500 mt-2 font-mono">
                    {r.last_run_at
                      ? `Last run: ${new Date(r.last_run_at).toLocaleString()}`
                      : "Never run"}
                  </p>
                </div>
                
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-2 mr-2">
                    <Label className="text-xs text-slate-400 cursor-pointer" htmlFor={`switch-${r.id}`}>
                      {r.is_active ? 'Enabled' : 'Disabled'}
                    </Label>
                    <Switch 
                      id={`switch-${r.id}`}
                      checked={!!r.is_active} 
                      onCheckedChange={() => toggleActive(r)} 
                      className="data-[state=checked]:bg-purple-600"
                    />
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => runNow(r.id)}
                    className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg shadow-sm"
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" /> Run Now
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => remove(r.id)}
                    className="h-8 w-8 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl bg-[#0F172A] border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.15)] rounded-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
          
          <DialogHeader className="p-6 pb-2 shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
              <Settings2 className="h-6 w-6 text-purple-400" />
              Configure Schedule
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 space-y-5 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-300">Schedule Name <span className="text-purple-400">*</span></Label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                placeholder="e.g. Weekly Inventory Summary"
                className="w-full bg-slate-900 border-white/10 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 h-11 rounded-xl font-medium"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-300">Report Type</Label>
                <Select
                  value={form.report_type}
                  onValueChange={(v) => setForm({ ...form, report_type: v })}
                >
                  <SelectTrigger className="w-full bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 h-11 rounded-xl font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10 text-slate-200 rounded-xl shadow-xl">
                    {REPORT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="focus:bg-purple-500/20 focus:text-purple-200">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-300">Frequency</Label>
                <Select
                  value={form.frequency}
                  onValueChange={(v) => setForm({ ...form, frequency: v })}
                >
                  <SelectTrigger className="w-full bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 h-11 rounded-xl font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10 text-slate-200 rounded-xl shadow-xl">
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value} className="focus:bg-purple-500/20 focus:text-purple-200">
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-300">Delivery Method</Label>
              <Select
                value={form.delivery}
                onValueChange={(v) => setForm({ ...form, delivery: v })}
              >
                <SelectTrigger className="w-full bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 h-11 rounded-xl font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10 text-slate-200 rounded-xl shadow-xl">
                  {DELIVERIES.map((d) => (
                    <SelectItem key={d.value} value={d.value} className="focus:bg-purple-500/20 focus:text-purple-200">
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-300">Recipient Users</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-white/10 bg-slate-900/50 rounded-xl p-3 custom-scrollbar">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-3 text-sm text-slate-300 hover:text-white cursor-pointer hover:bg-white/5 p-1.5 rounded-lg transition-colors">
                    <Checkbox
                      checked={form.recipient_user_ids.includes(u.id)}
                      onCheckedChange={(checked) => {
                        setForm((f) => ({
                          ...f,
                          recipient_user_ids: checked
                            ? [...f.recipient_user_ids, u.id]
                            : f.recipient_user_ids.filter((id) => id !== u.id),
                        }));
                      }}
                      className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />
                    <div className="flex flex-col">
                      <span>{u.name || u.email}</span>
                      {u.name && <span className="text-xs text-slate-500">{u.email}</span>}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-300">Recipient Roles</Label>
              <div className="space-y-2 max-h-28 overflow-y-auto border border-white/10 bg-slate-900/50 rounded-xl p-3 custom-scrollbar">
                {roles.map((r) => (
                  <label key={r.id} className="flex items-center gap-3 text-sm text-slate-300 hover:text-white cursor-pointer hover:bg-white/5 p-1.5 rounded-lg transition-colors">
                    <Checkbox
                      checked={form.recipient_role_ids.includes(r.id)}
                      onCheckedChange={(checked) => {
                        setForm((f) => ({
                          ...f,
                          recipient_role_ids: checked
                            ? [...f.recipient_role_ids, r.id]
                            : f.recipient_role_ids.filter((id) => id !== r.id),
                        }));
                      }}
                      className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                    />
                    <span className="capitalize">{r.name.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-300">External Emails (Optional)</Label>
              <Input
                placeholder="Comma separated: ops@acme.com, alerts@acme.com"
                value={form.recipient_emails}
                onChange={(e) => setForm({ ...form, recipient_emails: e.target.value })}
                className="w-full bg-slate-900 border-white/10 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 h-11 rounded-xl font-medium"
              />
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-4 shrink-0 flex gap-3 sm:justify-end border-t border-white/5">
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl px-5">
              Cancel
            </Button>
            <Button onClick={create} disabled={!form.name} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl px-6 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
              Create Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
