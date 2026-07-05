"use client";

import { useState } from "react";
import { Settings as SettingsIcon, Bell, Shield, Building, Package, TrendingUp, Calendar, Warehouse, Save, RefreshCw, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserStore } from "@/lib/store";

const mockSettings = {
  thresholds: { lowStockAlert: 20, criticalStockAlert: 5, reorderDefault: 10 },
  notifications: { emailAlerts: true, stockoutAlerts: true, expiryAlerts: true, anomalyAlerts: true, weeklyReport: true },
  roles: [{ name: "Admin", permissions: ["All"] }, { name: "Manager", permissions: ["View", "Create", "Edit", "Approve"] }, { name: "Staff", permissions: ["View", "Create"] }],
  company: { name: "Stock Control System Ltd", address: "123 Business Park, London", phone: "+44 20 7123 4567", email: "support@Stock Control System.com", taxId: "GB123456789" },
  forecast: { model: "ets", confidenceInterval: 0.95, updateFrequency: "daily", horizon: 30 },
  reorderPolicy: { safetyStockPercent: 30, leadTimeBuffer: 2, autoOrder: false, maxOrderQuantity: 1000 },
  locations: [{ id: "loc-1", name: "Warehouse A", type: "warehouse", active: true }, { id: "loc-2", name: "Warehouse B", type: "warehouse", active: true }],
  batchPolicies: { enableBatchTracking: true, enableExpiryTracking: true, enforceFIFO: true, expiryAlertDays: [30, 15, 7] },
};

function SettingsCard({ title, description, children }) {
  return <Card><CardHeader><CardTitle className="text-sm font-medium">{title}</CardTitle>{description && <CardDescription>{description}</CardDescription>}</CardHeader><CardContent>{children}</CardContent></Card>;
}

export default function SettingsPage() {
  const { role } = useUserStore();
  const [settings, setSettings] = useState(mockSettings);
  const [isSaving, setIsSaving] = useState(false);

  if (role !== "admin") {
    return <div className="flex h-[60vh] flex-col items-center justify-center gap-4"><Shield className="h-16 w-16 text-slate-300" /><h2 className="text-2xl font-semibold">Access Denied</h2><p className="text-slate-500">Settings are only available to administrators.</p></div>;
  }

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => { setIsSaving(false); toast.success("Settings saved"); }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-3xl font-bold">System Settings</h1><p className="text-slate-500">Configure system behaviour</p></div><Button onClick={handleSave} disabled={isSaving}>{isSaving ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}</Button></div>

      <Tabs defaultValue="thresholds">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1">
          <TabsTrigger value="thresholds" className="text-xs"><Bell className="mr-1 h-3 w-3" /> Thresholds</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs"><Bell className="mr-1 h-3 w-3" /> Notifications</TabsTrigger>
          <TabsTrigger value="company" className="text-xs"><Building className="mr-1 h-3 w-3" /> Company</TabsTrigger>
          <TabsTrigger value="forecast" className="text-xs"><TrendingUp className="mr-1 h-3 w-3" /> Forecast</TabsTrigger>
          <TabsTrigger value="reorder" className="text-xs"><Package className="mr-1 h-3 w-3" /> Reorder</TabsTrigger>
          <TabsTrigger value="locations" className="text-xs"><Warehouse className="mr-1 h-3 w-3" /> Locations</TabsTrigger>
          <TabsTrigger value="batch" className="text-xs"><Calendar className="mr-1 h-3 w-3" /> Batch & Expiry</TabsTrigger>
        </TabsList>

        <TabsContent value="thresholds">
          <SettingsCard title="Threshold Settings"><div className="grid gap-4 md:grid-cols-2"><div><Label htmlFor="low">Low Stock Alert (%)</Label><Input id="low" type="number" value={settings.thresholds.lowStockAlert} onChange={(e) => setSettings({ ...settings, thresholds: { ...settings.thresholds, lowStockAlert: parseInt(e.target.value) || 0 } })} /></div><div><Label htmlFor="critical">Critical Alert (%)</Label><Input id="critical" type="number" value={settings.thresholds.criticalStockAlert} onChange={(e) => setSettings({ ...settings, thresholds: { ...settings.thresholds, criticalStockAlert: parseInt(e.target.value) || 0 } })} /></div></div></SettingsCard>
        </TabsContent>

        <TabsContent value="notifications">
          <SettingsCard title="Notification Rules"><div className="space-y-3"><div className="flex items-center justify-between"><div><Label>Email Alerts</Label></div><Switch checked={settings.notifications.emailAlerts} onCheckedChange={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, emailAlerts: v } })} /></div><Separator /><div className="flex items-center justify-between"><div><Label>Stockout Alerts</Label></div><Switch checked={settings.notifications.stockoutAlerts} onCheckedChange={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, stockoutAlerts: v } })} /></div><Separator /><div className="flex items-center justify-between"><div><Label>Expiry Alerts</Label></div><Switch checked={settings.notifications.expiryAlerts} onCheckedChange={(v) => setSettings({ ...settings, notifications: { ...settings.notifications, expiryAlerts: v } })} /></div></div></SettingsCard>
        </TabsContent>

        <TabsContent value="company">
          <SettingsCard title="Company Configuration"><div className="grid gap-4 md:grid-cols-2"><div><Label>Company Name</Label><Input value={settings.company.name} onChange={(e) => setSettings({ ...settings, company: { ...settings.company, name: e.target.value } })} /></div><div><Label>Tax ID</Label><Input value={settings.company.taxId} onChange={(e) => setSettings({ ...settings, company: { ...settings.company, taxId: e.target.value } })} /></div><div className="md:col-span-2"><Label>Address</Label><Input value={settings.company.address} onChange={(e) => setSettings({ ...settings, company: { ...settings.company, address: e.target.value } })} /></div></div></SettingsCard>
        </TabsContent>

        <TabsContent value="forecast">
          <SettingsCard title="Forecast Model Defaults"><div className="grid gap-4 md:grid-cols-2"><div><Label>Default Model</Label><Select value={settings.forecast.model} onValueChange={(v) => setSettings({ ...settings, forecast: { ...settings.forecast, model: v } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ets">ETS</SelectItem><SelectItem value="arima">ARIMA</SelectItem></SelectContent></Select></div><div><Label>Confidence Interval</Label><Select value={settings.forecast.confidenceInterval.toString()} onValueChange={(v) => setSettings({ ...settings, forecast: { ...settings.forecast, confidenceInterval: parseFloat(v) } })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0.90">90%</SelectItem><SelectItem value="0.95">95%</SelectItem></SelectContent></Select></div></div></SettingsCard>
        </TabsContent>

        <TabsContent value="reorder">
          <SettingsCard title="Reorder Policy"><div className="grid gap-4 md:grid-cols-2"><div><Label>Safety Stock (%)</Label><Input type="number" value={settings.reorderPolicy.safetyStockPercent} onChange={(e) => setSettings({ ...settings, reorderPolicy: { ...settings.reorderPolicy, safetyStockPercent: parseInt(e.target.value) || 0 } })} /></div><div><Label>Lead Time Buffer (days)</Label><Input type="number" value={settings.reorderPolicy.leadTimeBuffer} onChange={(e) => setSettings({ ...settings, reorderPolicy: { ...settings.reorderPolicy, leadTimeBuffer: parseInt(e.target.value) || 0 } })} /></div><div className="flex items-center justify-between"><div><Label>Auto-Order</Label></div><Switch checked={settings.reorderPolicy.autoOrder} onCheckedChange={(v) => setSettings({ ...settings, reorderPolicy: { ...settings.reorderPolicy, autoOrder: v } })} /></div></div></SettingsCard>
        </TabsContent>

        <TabsContent value="locations">
          <SettingsCard title="Locations"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{settings.locations.map((loc) => <TableRow key={loc.id}><TableCell>{loc.name}</TableCell><TableCell><Badge variant="outline">{loc.type}</Badge></TableCell><TableCell><Badge variant={loc.active ? "default" : "secondary"}>{loc.active ? "Active" : "Inactive"}</Badge></TableCell></TableRow>)}</TableBody></Table></SettingsCard>
        </TabsContent>

        <TabsContent value="batch">
          <SettingsCard title="Batch & Expiry Policies"><div className="space-y-3"><div className="flex items-center justify-between"><div><Label>Batch Tracking</Label></div><Switch checked={settings.batchPolicies.enableBatchTracking} onCheckedChange={(v) => setSettings({ ...settings, batchPolicies: { ...settings.batchPolicies, enableBatchTracking: v } })} /></div><Separator /><div className="flex items-center justify-between"><div><Label>Expiry Tracking</Label></div><Switch checked={settings.batchPolicies.enableExpiryTracking} onCheckedChange={(v) => setSettings({ ...settings, batchPolicies: { ...settings.batchPolicies, enableExpiryTracking: v } })} /></div><Separator /><div className="flex items-center justify-between"><div><Label>Enforce FIFO</Label></div><Switch checked={settings.batchPolicies.enforceFIFO} onCheckedChange={(v) => setSettings({ ...settings, batchPolicies: { ...settings.batchPolicies, enforceFIFO: v } })} /></div></div></SettingsCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}