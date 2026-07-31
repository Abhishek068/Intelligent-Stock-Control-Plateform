"use client";

import { useEffect, useState } from "react";
import { Shield, Building, TrendingUp, Bell, Warehouse, Save, RefreshCw, Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { settingsApi, locationsApi, scheduledReportsApi } from "@/lib/api";
import { ApiError, unwrapList } from "@/lib/api/client";

function SettingsCard({ title, description, children }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { isSuperAdmin, isAdmin } = useRoleAccess();
  const [settings, setSettings] = useState(null);
  const [locations, setLocations] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin && !isAdmin) return;
    Promise.all([
      settingsApi.get(),
      locationsApi.list().catch(() => []),
      scheduledReportsApi.list().catch(() => ({ results: [] })),
    ])
      .then(([settingsRes, locs, sched]) => {
        if (settingsRes.success && settingsRes.data) setSettings(settingsRes.data);
        setLocations(locs);
        setSchedules(unwrapList(sched));
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, [isSuperAdmin, isAdmin]);

  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Shield className="h-16 w-16 text-slate-300" />
        <h2 className="text-2xl font-semibold">Access Denied</h2>
        <p className="text-slate-400">Settings are only available to Super Admin.</p>
      </div>
    );
  }

  const updateField = (field, value) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = async () => {
    if (!settings?.id) return;
    setIsSaving(true);
    try {
      const payload = {
        default_minimum_level: settings.default_minimum_level,
        default_reorder_level: settings.default_reorder_level,
        enable_predictive_alerts: settings.enable_predictive_alerts,
        enable_email_notifications: settings.enable_email_notifications,
        enable_push_notifications: settings.enable_push_notifications,
        expiry_alert_user_ids: settings.expiry_alert_user_ids,
        expiry_alert_emails: settings.expiry_alert_emails,
        forecast_model: settings.forecast_model,
        forecast_horizon_days: settings.forecast_horizon_days,
        valuation_method: settings.valuation_method,
        company_name: settings.company_name,
        company_address: settings.company_address,
        currency_code: settings.currency_code,
        session_timeout_minutes: settings.session_timeout_minutes,
        jwt_access_minutes: settings.jwt_access_minutes,
        jwt_refresh_days: settings.jwt_refresh_days,
        remember_me_days: settings.remember_me_days,
        max_login_attempts: settings.max_login_attempts,
        lockout_duration_minutes: settings.lockout_duration_minutes,
        password_min_length: settings.password_min_length,
        password_require_uppercase: settings.password_require_uppercase,
        password_require_lowercase: settings.password_require_lowercase,
        password_require_number: settings.password_require_number,
        password_require_special: settings.password_require_special,
      };
      const res = await settingsApi.update(settings.id, payload);
      if (res.success && res.data) {
        setSettings(res.data);
        toast.success("Settings saved");
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex h-[40vh] items-center justify-center text-slate-400">Loading settings...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-slate-400">General, authentication, security, and forecast defaults</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-800/50 p-1">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="auth">Authentication</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="reports">Scheduled Reports</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-4 space-y-4">
          <SettingsCard title="Company">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Company name</Label>
                <Input
                  value={settings.company_name || ""}
                  onChange={(e) => updateField("company_name", e.target.value)}
                />
              </div>
              <div>
                <Label>Inventory valuation method</Label>
                <Select
                  value={settings.valuation_method || "fifo"}
                  onValueChange={(v) => updateField("valuation_method", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fifo">FIFO</SelectItem>
                    <SelectItem value="lifo">LIFO</SelectItem>
                    <SelectItem value="weighted_average">Weighted average</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Currency</Label>
                <Input
                  value={settings.currency_code || "GBP"}
                  onChange={(e) => updateField("currency_code", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Address</Label>
                <Input
                  value={settings.company_address || ""}
                  onChange={(e) => updateField("company_address", e.target.value)}
                />
              </div>
              <div>
                <Label>Default minimum level</Label>
                <Input
                  type="number"
                  value={settings.default_minimum_level ?? 10}
                  onChange={(e) => updateField("default_minimum_level", Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Default reorder level</Label>
                <Input
                  type="number"
                  value={settings.default_reorder_level ?? 20}
                  onChange={(e) => updateField("default_reorder_level", Number(e.target.value))}
                />
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="auth" className="mt-4 space-y-4">
          <SettingsCard title="Session & JWT" description="Future: SSO / Google / Microsoft / LDAP / 2FA extension points">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Session timeout (minutes)</Label>
                <Input
                  type="number"
                  value={settings.session_timeout_minutes ?? 60}
                  onChange={(e) => updateField("session_timeout_minutes", Number(e.target.value))}
                />
              </div>
              <div>
                <Label>JWT access (minutes)</Label>
                <Input
                  type="number"
                  value={settings.jwt_access_minutes ?? 60}
                  onChange={(e) => updateField("jwt_access_minutes", Number(e.target.value))}
                />
              </div>
              <div>
                <Label>JWT refresh (days)</Label>
                <Input
                  type="number"
                  value={settings.jwt_refresh_days ?? 7}
                  onChange={(e) => updateField("jwt_refresh_days", Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Remember me (days)</Label>
                <Input
                  type="number"
                  value={settings.remember_me_days ?? 30}
                  onChange={(e) => updateField("remember_me_days", Number(e.target.value))}
                />
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <SettingsCard title="Password policy & lockout">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Min password length</Label>
                <Input
                  type="number"
                  value={settings.password_min_length ?? 8}
                  onChange={(e) => updateField("password_min_length", Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Max login attempts</Label>
                <Input
                  type="number"
                  value={settings.max_login_attempts ?? 5}
                  onChange={(e) => updateField("max_login_attempts", Number(e.target.value))}
                />
              </div>
              <div>
                <Label>Lockout duration (minutes)</Label>
                <Input
                  type="number"
                  value={settings.lockout_duration_minutes ?? 30}
                  onChange={(e) => updateField("lockout_duration_minutes", Number(e.target.value))}
                />
              </div>
              <div className="flex items-center justify-between md:col-span-2">
                <Label>Require uppercase</Label>
                <Switch
                  checked={!!settings.password_require_uppercase}
                  onCheckedChange={(v) => updateField("password_require_uppercase", v)}
                />
              </div>
              <div className="flex items-center justify-between md:col-span-2">
                <Label>Require lowercase</Label>
                <Switch
                  checked={!!settings.password_require_lowercase}
                  onCheckedChange={(v) => updateField("password_require_lowercase", v)}
                />
              </div>
              <div className="flex items-center justify-between md:col-span-2">
                <Label>Require number</Label>
                <Switch
                  checked={!!settings.password_require_number}
                  onCheckedChange={(v) => updateField("password_require_number", v)}
                />
              </div>
              <div className="flex items-center justify-between md:col-span-2">
                <Label>Require special character</Label>
                <Switch
                  checked={!!settings.password_require_special}
                  onCheckedChange={(v) => updateField("password_require_special", v)}
                />
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-4">
          <SettingsCard title="Notification channels">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Predictive alerts</Label>
                <Switch
                  checked={!!settings.enable_predictive_alerts}
                  onCheckedChange={(v) => updateField("enable_predictive_alerts", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Email notifications</Label>
                <Switch
                  checked={!!settings.enable_email_notifications}
                  onCheckedChange={(v) => updateField("enable_email_notifications", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Push notifications</Label>
                <Switch
                  checked={!!settings.enable_push_notifications}
                  onCheckedChange={(v) => updateField("enable_push_notifications", v)}
                />
              </div>
              <div className="space-y-2 border-t border-white/10 pt-4">
                <Label>Expiry-alert email recipients</Label>
                <Input
                  placeholder="buyer@example.com, manager@example.com"
                  value={(settings.expiry_alert_emails || []).join(", ")}
                  onChange={(e) =>
                    updateField(
                      "expiry_alert_emails",
                      e.target.value.split(",").map((email) => email.trim()).filter(Boolean)
                    )
                  }
                />
                <p className="text-xs text-slate-400">These recipients receive batch-expiry alerts by email.</p>
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="forecast" className="mt-4 space-y-4">
          <SettingsCard title="Forecast defaults">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Model</Label>
                <Select
                  value={settings.forecast_model || "exponential_smoothing"}
                  onValueChange={(v) => updateField("forecast_model", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exponential_smoothing">Exponential Smoothing</SelectItem>
                    <SelectItem value="moving_average">Moving Average</SelectItem>
                    <SelectItem value="linear_regression">Linear Regression</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Horizon (days)</Label>
                <Input
                  type="number"
                  value={settings.forecast_horizon_days ?? 30}
                  onChange={(e) => updateField("forecast_horizon_days", Number(e.target.value))}
                />
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <SettingsCard title="Scheduled reports" description="Configure delivery from Reports module; listed here for overview.">
            <div className="space-y-2">
              {schedules.map((s) => (
                <div key={s.id} className="flex justify-between text-sm border-b border-white/5 py-2">
                  <span>{s.name}</span>
                  <span className="text-slate-500">
                    {s.frequency} · {s.report_type}
                  </span>
                </div>
              ))}
              {schedules.length === 0 && <p className="text-sm text-slate-500">No scheduled reports yet</p>}
            </div>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="locations" className="mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm">Locations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((loc) => (
                    <TableRow key={loc.id}>
                      <TableCell>{loc.name}</TableCell>
                      <TableCell>{loc.location_type}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{loc.is_active ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
