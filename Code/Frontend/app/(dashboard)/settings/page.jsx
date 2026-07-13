"use client";

import { useEffect, useState } from "react";
import { Shield, Building, TrendingUp, Bell, Warehouse, Save, RefreshCw } from "lucide-react";
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
import { useUserStore } from "@/lib/store";
import { settingsApi, locationsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";


function SettingsCard({ title, description, children }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>);

}

export default function SettingsPage() {
  const { role } = useUserStore();
  const [settings, setSettings] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (role !== "admin") return;
    Promise.all([settingsApi.get(), locationsApi.list()]).
    then(([settingsRes, locs]) => {
      if (settingsRes.success && settingsRes.data) setSettings(settingsRes.data);
      setLocations(locs);
    }).
    catch(() => toast.error("Failed to load settings")).
    finally(() => setLoading(false));
  }, [role]);

  if (role !== "admin") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Shield className="h-16 w-16 text-slate-300" />
        <h2 className="text-2xl font-semibold">Access Denied</h2>
        <p className="text-slate-400">Settings are only available to administrators.</p>
      </div>);

  }

  const updateField = (field, value) => {
    setSettings((prev) => prev ? { ...prev, [field]: value } : prev);
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
        forecast_model: settings.forecast_model,
        forecast_horizon_days: settings.forecast_horizon_days,
        company_name: settings.company_name,
        company_address: settings.company_address,
        currency_code: settings.currency_code
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
    return <div className="flex h-[40vh] items-center justify-center text-slate-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-slate-400">Configure organisation defaults and forecasting behaviour</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ?
          <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...
            </> :

          <>
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </>
          }
        </Button>
      </div>

      <Tabs defaultValue="thresholds">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-800/50 p-1">
          <TabsTrigger value="thresholds" className="text-xs">
            <Bell className="mr-1 h-3 w-3" /> Thresholds
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs">
            <Bell className="mr-1 h-3 w-3" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="company" className="text-xs">
            <Building className="mr-1 h-3 w-3" /> Company
          </TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs">
            <TrendingUp className="mr-1 h-3 w-3" /> Forecast
          </TabsTrigger>
          <TabsTrigger value="locations" className="text-xs">
            <Warehouse className="mr-1 h-3 w-3" /> Locations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="thresholds">
          <SettingsCard title="Default Stock Thresholds" description="Applied to new products">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="min">Default Minimum Level</Label>
                <Input
                  id="min"
                  type="number"
                  value={settings.default_minimum_level}
                  onChange={(e) => updateField("default_minimum_level", parseInt(e.target.value) || 0)} />
                
              </div>
              <div>
                <Label htmlFor="reorder">Default Reorder Level</Label>
                <Input
                  id="reorder"
                  type="number"
                  value={settings.default_reorder_level}
                  onChange={(e) => updateField("default_reorder_level", parseInt(e.target.value) || 0)} />
                
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="notifications">
          <SettingsCard title="Alert & Notification Rules">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Predictive Alerts</Label>
                  <p className="text-xs text-slate-400">Low stock and stockout risk notifications</p>
                </div>
                <Switch
                  checked={settings.enable_predictive_alerts}
                  onCheckedChange={(v) => updateField("enable_predictive_alerts", v)} />
                
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-xs text-slate-400">Send alert emails to managers</p>
                </div>
                <Switch
                  checked={settings.enable_email_notifications}
                  onCheckedChange={(v) => updateField("enable_email_notifications", v)} />
                
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="company">
          <SettingsCard title="Company Configuration">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Company Name</Label>
                <Input
                  value={settings.company_name}
                  onChange={(e) => updateField("company_name", e.target.value)} />
                
              </div>
              <div>
                <Label>Currency</Label>
                <Select
                  value={settings.currency_code}
                  onValueChange={(v) => updateField("currency_code", v)}>
                  
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Address</Label>
                <Input
                  value={settings.company_address}
                  onChange={(e) => updateField("company_address", e.target.value)} />
                
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="forecast">
          <SettingsCard title="Forecast Model Defaults">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Default Model</Label>
                <Select
                  value={settings.forecast_model}
                  onValueChange={(v) => updateField("forecast_model", v)}>
                  
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ets">ETS (Exponential Smoothing)</SelectItem>
                    <SelectItem value="moving_average">Moving Average</SelectItem>
                    <SelectItem value="linear">Linear Trend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Forecast Horizon (days)</Label>
                <Input
                  type="number"
                  value={settings.forecast_horizon_days}
                  onChange={(e) => updateField("forecast_horizon_days", parseInt(e.target.value) || 30)} />
                
              </div>
            </div>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="locations">
          <SettingsCard title="Warehouse Locations" description="Read-only — managed via inventory setup">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.length === 0 ?
                <TableRow>
                    <TableCell colSpan={3} className="text-center text-slate-400">
                      No locations configured
                    </TableCell>
                  </TableRow> :

                locations.map((loc) =>
                <TableRow key={loc.id}>
                      <TableCell>{loc.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{loc.location_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={loc.is_active ? "default" : "secondary"}>
                          {loc.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                )
                }
              </TableBody>
            </Table>
          </SettingsCard>
        </TabsContent>
      </Tabs>
    </div>);

}
