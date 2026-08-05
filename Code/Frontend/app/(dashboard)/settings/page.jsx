"use client";

import { useEffect, useState } from "react";
import { 
  Shield, Building, TrendingUp, Bell, Warehouse, Save, RefreshCw, 
  Lock, KeyRound, Globe, HardDrive, Cpu, SlidersHorizontal, Activity, FileText 
} from "lucide-react";
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
import { cn } from "@/lib/utils";

function SettingsCard({ title, description, icon: Icon, children }) {
  return (
    <Card className="glass-card relative overflow-hidden group border-indigo-500/10 hover:border-indigo-500/30 transition-all duration-500">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <CardHeader className="border-b border-white/5 pb-4 bg-slate-900/40">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <Icon className="h-5 w-5 text-indigo-400" />
            </div>
          )}
          <div>
            <CardTitle className="text-base font-semibold text-slate-100">{title}</CardTitle>
            {description && <CardDescription className="text-xs mt-1 text-slate-400">{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 relative z-10">{children}</CardContent>
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
        <div className="p-4 bg-rose-500/10 rounded-full">
          <Shield className="h-16 w-16 text-rose-500" />
        </div>
        <h2 className="text-3xl font-bold text-slate-100">Access Denied</h2>
        <p className="text-slate-400">System settings are only available to Super Admins.</p>
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
        toast.success("Settings saved successfully", {
          description: "Your system configuration has been updated.",
        });
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-slate-400 animate-pulse">Loading system settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 glass-card border-indigo-500/20">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 rounded-xl relative group">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-xl blur-md group-hover:blur-xl transition-all duration-500" />
            <SlidersHorizontal className="h-8 w-8 text-indigo-400 relative z-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              System Settings
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Configure global parameters, security, and authentication
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 px-6 py-5 rounded-xl text-md font-semibold transition-all duration-300 group"
        >
          {isSaving ? (
            <>
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Saving Configuration...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" /> Save Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        {/* Premium Pills Tabs */}
        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0 mb-6">
          {[
            { id: "general", label: "General", icon: Building },
            { id: "auth", label: "Authentication", icon: KeyRound },
            { id: "security", label: "Security", icon: Shield },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "forecast", label: "Forecast defaults", icon: TrendingUp },
            { id: "reports", label: "Scheduled Reports", icon: FileText },
            { id: "locations", label: "Locations", icon: Warehouse },
          ].map((tab) => (
            <TabsTrigger 
              key={tab.id}
              value={tab.id}
              className={cn(
                "data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-300 data-[state=active]:border-indigo-500/30",
                "border border-white/5 bg-slate-900/50 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200",
                "px-5 py-2.5 rounded-full transition-all duration-300 font-medium text-sm flex items-center gap-2"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SettingsCard title="Company Profile" icon={Building} description="Basic organizational information and global defaults.">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-300">Company name</Label>
                <Input
                  className="bg-slate-900/50 border-white/10 focus:border-indigo-500/50"
                  value={settings.company_name || ""}
                  onChange={(e) => updateField("company_name", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Inventory valuation method</Label>
                <Select
                  value={settings.valuation_method || "fifo"}
                  onValueChange={(v) => updateField("valuation_method", v)}
                >
                  <SelectTrigger className="bg-slate-900/50 border-white/10 focus:border-indigo-500/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fifo">FIFO</SelectItem>
                    <SelectItem value="lifo">LIFO</SelectItem>
                    <SelectItem value="weighted_average">Weighted average</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Currency Code</Label>
                <Input
                  className="bg-slate-900/50 border-white/10 focus:border-indigo-500/50"
                  value={settings.currency_code || "GBP"}
                  onChange={(e) => updateField("currency_code", e.target.value)}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-slate-300">Registered Address</Label>
                <Input
                  className="bg-slate-900/50 border-white/10 focus:border-indigo-500/50"
                  value={settings.company_address || ""}
                  onChange={(e) => updateField("company_address", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Default minimum level (Global fallback)</Label>
                <Input
                  type="number"
                  className="bg-slate-900/50 border-white/10 focus:border-indigo-500/50"
                  value={settings.default_minimum_level ?? 10}
                  onChange={(e) => updateField("default_minimum_level", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Default reorder level (Global fallback)</Label>
                <Input
                  type="number"
                  className="bg-slate-900/50 border-white/10 focus:border-indigo-500/50"
                  value={settings.default_reorder_level ?? 20}
                  onChange={(e) => updateField("default_reorder_level", Number(e.target.value))}
                />
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* Authentication Tab */}
        <TabsContent value="auth" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SettingsCard title="Session & JWT Tokens" icon={Lock} description="Configure session timeouts and token lifespans for API access.">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2"><Globe className="w-4 h-4 text-slate-500" /> Session timeout (minutes)</Label>
                <Input
                  type="number"
                  className="bg-slate-900/50 border-white/10 focus:border-indigo-500/50"
                  value={settings.session_timeout_minutes ?? 60}
                  onChange={(e) => updateField("session_timeout_minutes", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2"><KeyRound className="w-4 h-4 text-slate-500" /> JWT access (minutes)</Label>
                <Input
                  type="number"
                  className="bg-slate-900/50 border-white/10 focus:border-indigo-500/50"
                  value={settings.jwt_access_minutes ?? 60}
                  onChange={(e) => updateField("jwt_access_minutes", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2"><HardDrive className="w-4 h-4 text-slate-500" /> JWT refresh (days)</Label>
                <Input
                  type="number"
                  className="bg-slate-900/50 border-white/10 focus:border-indigo-500/50"
                  value={settings.jwt_refresh_days ?? 7}
                  onChange={(e) => updateField("jwt_refresh_days", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 flex items-center gap-2"><Cpu className="w-4 h-4 text-slate-500" /> Remember me (days)</Label>
                <Input
                  type="number"
                  className="bg-slate-900/50 border-white/10 focus:border-indigo-500/50"
                  value={settings.remember_me_days ?? 30}
                  onChange={(e) => updateField("remember_me_days", Number(e.target.value))}
                />
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SettingsCard title="Password Policy & Lockout" icon={Shield}>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-300">Min password length</Label>
                <Input
                  type="number"
                  className="bg-slate-900/50 border-white/10 focus:border-indigo-500/50"
                  value={settings.password_min_length ?? 8}
                  onChange={(e) => updateField("password_min_length", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Max login attempts</Label>
                <Input
                  type="number"
                  className="bg-slate-900/50 border-white/10 focus:border-indigo-500/50"
                  value={settings.max_login_attempts ?? 5}
                  onChange={(e) => updateField("max_login_attempts", Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Lockout duration (minutes)</Label>
                <Input
                  type="number"
                  className="bg-slate-900/50 border-white/10 focus:border-indigo-500/50"
                  value={settings.lockout_duration_minutes ?? 30}
                  onChange={(e) => updateField("lockout_duration_minutes", Number(e.target.value))}
                />
              </div>
              
              <div className="md:col-span-2 grid gap-4 md:grid-cols-2 mt-4 p-4 rounded-xl bg-slate-900/30 border border-white/5">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300 cursor-pointer" htmlFor="req-upper">Require uppercase</Label>
                  <Switch
                    id="req-upper"
                    checked={!!settings.password_require_uppercase}
                    onCheckedChange={(v) => updateField("password_require_uppercase", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300 cursor-pointer" htmlFor="req-lower">Require lowercase</Label>
                  <Switch
                    id="req-lower"
                    checked={!!settings.password_require_lowercase}
                    onCheckedChange={(v) => updateField("password_require_lowercase", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300 cursor-pointer" htmlFor="req-number">Require number</Label>
                  <Switch
                    id="req-number"
                    checked={!!settings.password_require_number}
                    onCheckedChange={(v) => updateField("password_require_number", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300 cursor-pointer" htmlFor="req-special">Require special character</Label>
                  <Switch
                    id="req-special"
                    checked={!!settings.password_require_special}
                    onCheckedChange={(v) => updateField("password_require_special", v)}
                  />
                </div>
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SettingsCard title="Notification Channels" icon={Bell}>
            <div className="space-y-6">
              <div className="grid gap-4 p-4 rounded-xl bg-slate-900/30 border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-slate-200 text-base cursor-pointer" htmlFor="pred-alerts">Predictive Alerts</Label>
                    <p className="text-xs text-slate-400 mt-1">Enable AI-driven alerts for stock shortages</p>
                  </div>
                  <Switch
                    id="pred-alerts"
                    checked={!!settings.enable_predictive_alerts}
                    onCheckedChange={(v) => updateField("enable_predictive_alerts", v)}
                  />
                </div>
                <div className="h-px bg-white/5 w-full my-2" />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-slate-200 text-base cursor-pointer" htmlFor="email-notif">Email Notifications</Label>
                    <p className="text-xs text-slate-400 mt-1">Send critical updates via email</p>
                  </div>
                  <Switch
                    id="email-notif"
                    checked={!!settings.enable_email_notifications}
                    onCheckedChange={(v) => updateField("enable_email_notifications", v)}
                  />
                </div>
                <div className="h-px bg-white/5 w-full my-2" />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-slate-200 text-base cursor-pointer" htmlFor="push-notif">Push Notifications</Label>
                    <p className="text-xs text-slate-400 mt-1">Enable browser push notifications</p>
                  </div>
                  <Switch
                    id="push-notif"
                    checked={!!settings.enable_push_notifications}
                    onCheckedChange={(v) => updateField("enable_push_notifications", v)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Expiry-alert email recipients</Label>
                <Input
                  className="bg-slate-900/50 border-white/10 focus:border-indigo-500/50"
                  placeholder="buyer@example.com, manager@example.com"
                  value={(settings.expiry_alert_emails || []).join(", ")}
                  onChange={(e) =>
                    updateField(
                      "expiry_alert_emails",
                      e.target.value.split(",").map((email) => email.trim()).filter(Boolean)
                    )
                  }
                />
                <p className="text-xs text-slate-500 mt-1">These recipients receive batch-expiry alerts by email (comma separated).</p>
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SettingsCard title="Forecast Engine Defaults" icon={TrendingUp}>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-300">Algorithm Model</Label>
                <Select
                  value={settings.forecast_model || "exponential_smoothing"}
                  onValueChange={(v) => updateField("forecast_model", v)}
                >
                  <SelectTrigger className="bg-slate-900/50 border-white/10 focus:border-indigo-500/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exponential_smoothing">Exponential Smoothing</SelectItem>
                    <SelectItem value="moving_average">Moving Average</SelectItem>
                    <SelectItem value="linear_regression">Linear Regression</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Default Horizon (days)</Label>
                <Input
                  type="number"
                  className="bg-slate-900/50 border-white/10 focus:border-indigo-500/50"
                  value={settings.forecast_horizon_days ?? 30}
                  onChange={(e) => updateField("forecast_horizon_days", Number(e.target.value))}
                />
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SettingsCard title="Scheduled Reports Overview" icon={FileText} description="Configure delivery from Reports module; listed here for overview.">
            <div className="space-y-3">
              {schedules.map((s) => (
                <div key={s.id} className="flex justify-between items-center bg-slate-900/40 p-4 rounded-xl border border-white/5 hover:border-indigo-500/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-indigo-400" />
                    <span className="font-medium text-slate-200">{s.name}</span>
                  </div>
                  <Badge className="bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30">
                    {s.frequency} · {s.report_type}
                  </Badge>
                </div>
              ))}
              {schedules.length === 0 && (
                <div className="text-center py-8 text-slate-500 border border-dashed border-white/10 rounded-xl bg-slate-900/20">
                  <FileText className="h-8 w-8 mx-auto mb-3 opacity-20" />
                  <p>No scheduled reports configured yet</p>
                </div>
              )}
            </div>
          </SettingsCard>
        </TabsContent>

        {/* Locations Tab */}
        <TabsContent value="locations" className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <SettingsCard title="Registered Locations" icon={Warehouse}>
            <div className="rounded-xl border border-white/5 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-900/80">
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-slate-400 font-medium">Location Name</TableHead>
                    <TableHead className="text-slate-400 font-medium">Type</TableHead>
                    <TableHead className="text-slate-400 font-medium text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((loc) => (
                    <TableRow key={loc.id} className="border-white/5 hover:bg-slate-800/30">
                      <TableCell className="font-medium text-slate-200">{loc.name}</TableCell>
                      <TableCell className="text-slate-400 capitalize">{loc.location_type}</TableCell>
                      <TableCell className="text-right">
                        {loc.is_active ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20">Active</Badge>
                        ) : (
                          <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20">Inactive</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {locations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                        No locations registered in the system.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </SettingsCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
