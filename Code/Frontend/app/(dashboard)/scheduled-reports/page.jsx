"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Play, Trash2, RefreshCw } from "lucide-react";
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

  const load = async () => {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Scheduled Reports</h1>
          <p className="text-slate-400 mt-1">
            Frequency, recipients (users / roles / emails), and delivery channel
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New schedule
          </Button>
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-slate-100">Schedules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-slate-500 text-sm">Loading...</p>}
          {!loading && reports.length === 0 && (
            <p className="text-slate-500 text-sm">No scheduled reports yet</p>
          )}
          {reports.map((r) => (
            <div
              key={r.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/5 rounded-lg p-3"
            >
              <div>
                <p className="text-sm font-medium text-slate-100">{r.name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {r.report_type} · {r.frequency} · {r.delivery}
                  {r.last_run_at
                    ? ` · last run ${new Date(r.last_run_at).toLocaleString()}`
                    : " · never run"}
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge variant="outline">{r.is_active ? "Active" : "Paused"}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!r.is_active} onCheckedChange={() => toggleActive(r)} />
                <Button size="sm" variant="outline" onClick={() => runNow(r.id)}>
                  <Play className="h-3 w-3 mr-1" /> Run
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                  <Trash2 className="h-4 w-4 text-rose-400" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-100 max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create scheduled report</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Report type</Label>
              <Select
                value={form.report_type}
                onValueChange={(v) => setForm({ ...form, report_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequency</Label>
              <Select
                value={form.frequency}
                onValueChange={(v) => setForm({ ...form, frequency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Delivery</Label>
              <Select
                value={form.delivery}
                onValueChange={(v) => setForm({ ...form, delivery: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIVERIES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Recipient users</Label>
              <div className="space-y-1 max-h-32 overflow-y-auto border border-white/5 rounded-lg p-2">
                {users.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 text-xs">
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
                    />
                    {u.email}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Recipient roles</Label>
              <div className="space-y-1 max-h-28 overflow-y-auto border border-white/5 rounded-lg p-2">
                {roles.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-xs">
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
                    />
                    {r.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Extra emails (comma-separated)</Label>
              <Input
                placeholder="ops@company.com, reports@company.com"
                value={form.recipient_emails}
                onChange={(e) => setForm({ ...form, recipient_emails: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={create} disabled={!form.name}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
