"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  Shield,
  Building,
  TrendingUp,
  Bell,
  Warehouse,
  Save,
  RefreshCw,
  Search,
  RotateCcw,
  Download,
  Upload,
  Layers,
  Zap,
  Sliders,
  Check,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Key,
  Mail,
  SlidersHorizontal,
  Plus,
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { settingsApi, locationsApi, scheduledReportsApi } from "@/lib/api";
import { ApiError, unwrapList } from "@/lib/api/client";

import { SETTING_TEMPLATES, FIELD_LABELS } from "@/features/settings/templates";
import { TemplateCard } from "@/features/settings/components/TemplateCard";
import { TemplateApplyModal } from "@/features/settings/components/TemplateApplyModal";
import { CustomTemplateModal } from "@/features/settings/components/CustomTemplateModal";

function AdvancedSettingsCard({ title, description, icon: Icon, badge, children, isModified }) {
  return (
    <Card className={`relative overflow-hidden transition-all duration-300 border ${
      isModified
        ? "bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5"
        : "bg-slate-900/50 border-slate-800/80 hover:border-slate-700/80 hover:bg-slate-900/70"
    }`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Icon className="h-4 w-4" />
              </div>
            )}
            <div>
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                {title}
                {isModified && (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] py-0">
                    Modified
                  </Badge>
                )}
              </CardTitle>
              {description && <CardDescription className="text-xs text-slate-400">{description}</CardDescription>}
            </div>
          </div>
          {badge}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { isSuperAdmin, isAdmin } = useRoleAccess();
  const [initialSettings, setInitialSettings] = useState(null);
  const [settings, setSettings] = useState(null);
  const [locations, setLocations] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Template State
  const [customTemplates, setCustomTemplates] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [selectedTemplateForApply, setSelectedTemplateForApply] = useState(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("templates");

  const fileInputRef = useRef(null);

  // Load custom templates from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("custom_setting_templates");
      if (saved) {
        setCustomTemplates(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to parse custom templates", e);
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin && !isAdmin) return;
    Promise.all([
      settingsApi.get(),
      locationsApi.list().catch(() => []),
      scheduledReportsApi.list().catch(() => ({ results: [] })),
    ])
      .then(([settingsRes, locs, sched]) => {
        if (settingsRes.success && settingsRes.data) {
          setInitialSettings(settingsRes.data);
          setSettings(settingsRes.data);
        }
        setLocations(locs);
        setSchedules(unwrapList(sched));
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, [isSuperAdmin, isAdmin]);

  // Combine built-in & custom templates
  const allTemplates = useMemo(() => {
    return [...SETTING_TEMPLATES, ...customTemplates];
  }, [customTemplates]);

  // Compute modified fields
  const modifiedFields = useMemo(() => {
    if (!initialSettings || !settings) return new Set();
    const modified = new Set();
    Object.keys(settings).forEach((key) => {
      if (JSON.stringify(settings[key]) !== JSON.stringify(initialSettings[key])) {
        modified.add(key);
      }
    });
    return modified;
  }, [initialSettings, settings]);

  // Security Strength Score Calculation
  const securityScore = useMemo(() => {
    if (!settings) return 0;
    let score = 0;
    if (settings.password_min_length >= 12) score += 25;
    else if (settings.password_min_length >= 8) score += 15;

    if (settings.password_require_uppercase) score += 15;
    if (settings.password_require_lowercase) score += 15;
    if (settings.password_require_number) score += 15;
    if (settings.password_require_special) score += 15;

    if (settings.max_login_attempts <= 5) score += 15;
    return Math.min(score, 100);
  }, [settings]);

  if (!isSuperAdmin && !isAdmin) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
          <Shield className="h-10 w-10" />
        </div>
        <h2 className="text-2xl font-bold text-white">Access Restricted</h2>
        <p className="text-slate-400 max-w-sm">
          System Settings and Preset Templates are accessible only to Administrator accounts.
        </p>
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
        setInitialSettings(res.data);
        setSettings(res.data);
        toast.success("System settings saved successfully");
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyPreset = (template) => {
    setSettings((prev) => ({
      ...prev,
      ...template.settings,
    }));
    setActiveTemplate(template);
    toast.success(`Applied preset: ${template.name}`);
  };

  const handleResetToLoaded = () => {
    if (!initialSettings) return;
    setSettings(initialSettings);
    setActiveTemplate(null);
    toast.info("Reverted settings to saved state");
  };

  const handleSaveCustomTemplate = (newTemplate) => {
    const updated = [newTemplate, ...customTemplates];
    setCustomTemplates(updated);
    try {
      localStorage.setItem("custom_setting_templates", JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save template to localStorage", e);
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(settings, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `settings_config_${settings.company_name || "system"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Exported settings configuration to JSON file");
  };

  const handleImportJSONClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const fileObj = e.target.files?.[0];
    if (!fileObj) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (typeof imported === "object" && imported !== null) {
          setSettings((prev) => ({ ...prev, ...imported }));
          toast.success("Imported configuration from JSON!");
        } else {
          toast.error("Invalid JSON configuration format");
        }
      } catch (err) {
        toast.error("Failed to parse JSON file");
      }
    };
    reader.readAsText(fileObj);
  };

  if (loading || !settings) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium">Loading system configuration & presets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input for JSON import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Header Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-white">System Settings</h1>
            {activeTemplate && (
              <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 flex items-center gap-1">
                <Sliders className="h-3 w-3" /> Preset: {activeTemplate.name}
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Manage operational defaults, authentication parameters, security policies, and setting presets.
          </p>
        </div>

        {/* Action Button Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Presets Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200">
                <Sliders className="mr-2 h-4 w-4 text-blue-400" /> Presets
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-slate-900 text-white border-slate-800">
              <DropdownMenuLabel className="text-xs font-semibold text-slate-400">Load Preset Profile</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-800" />
              {allTemplates.map((tmpl) => (
                <DropdownMenuItem
                  key={tmpl.id}
                  onClick={() => {
                    setSelectedTemplateForApply(tmpl);
                    setIsApplyModalOpen(true);
                  }}
                  className="flex items-center justify-between cursor-pointer hover:bg-slate-800 text-xs"
                >
                  <span className="font-medium text-slate-200">{tmpl.name}</span>
                  <Badge variant="outline" className="text-[10px] py-0 border-slate-700 text-slate-400">
                    {tmpl.category}
                  </Badge>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem
                onClick={() => setIsCustomModalOpen(true)}
                className="text-xs text-purple-300 font-semibold cursor-pointer hover:bg-slate-800"
              >
                <Plus className="mr-2 h-3.5 w-3.5 text-purple-400" /> Save Current as New Preset
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export / Import Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200">
                <SlidersHorizontal className="mr-2 h-4 w-4 text-slate-400" /> Config
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-900 text-white border-slate-800">
              <DropdownMenuItem onClick={handleExportJSON} className="cursor-pointer text-xs">
                <Download className="mr-2 h-3.5 w-3.5 text-blue-400" /> Export to JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleImportJSONClick} className="cursor-pointer text-xs">
                <Upload className="mr-2 h-3.5 w-3.5 text-emerald-400" /> Import from JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reset Changes button if modified */}
          {modifiedFields.size > 0 && (
            <Button
              variant="outline"
              onClick={handleResetToLoaded}
              className="border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset ({modifiedFields.size})
            </Button>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 font-semibold"
          >
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
      </div>

      {/* Preset Banner if Modified */}
      {modifiedFields.size > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <span>
              You have <strong>{modifiedFields.size} unsaved setting modification(s)</strong>. Save your changes to apply them system-wide.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsCustomModalOpen(true)}
              className="text-amber-300 hover:text-white hover:bg-amber-500/20 text-xs h-7 px-2"
            >
              Save as Preset
            </Button>
          </div>
        </div>
      )}

      {/* Navigation Tabs & Search Bar */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="templates" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Preset Gallery
            </TabsTrigger>
            <TabsTrigger value="general" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs gap-1.5">
              <Building className="h-3.5 w-3.5" /> General
            </TabsTrigger>
            <TabsTrigger value="auth" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs gap-1.5">
              <Key className="h-3.5 w-3.5" /> Auth & JWT
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs gap-1.5">
              <Bell className="h-3.5 w-3.5" /> Notifications
            </TabsTrigger>
            <TabsTrigger value="forecast" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Forecast
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Reports
            </TabsTrigger>
            <TabsTrigger value="locations" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs gap-1.5">
              <Warehouse className="h-3.5 w-3.5" /> Locations
            </TabsTrigger>
          </TabsList>

          {/* Quick Search */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-slate-900 border-slate-800 text-white focus:border-blue-500"
            />
          </div>
        </div>

        {/* 1. Preset Gallery Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-400" /> Setting Templates & Operational Profiles
              </h3>
              <p className="text-xs text-slate-400">
                Choose a pre-configured template to instantly tune inventory thresholds, valuation methods, security policies, and notification behavior.
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCustomModalOpen(true)}
              className="border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-xs"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5 text-purple-400" /> Save Current as Preset
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {allTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isActive={activeTemplate?.id === template.id}
                onSelect={(tmpl) => {
                  setSelectedTemplateForApply(tmpl);
                  setIsApplyModalOpen(true);
                }}
              />
            ))}
          </div>
        </TabsContent>

        {/* 2. General Tab */}
        <TabsContent value="general" className="space-y-4">
          <AdvancedSettingsCard
            title="Company & Valuation Defaults"
            description="General organization metadata and global inventory calculation standards."
            icon={Building}
            isModified={modifiedFields.has("company_name") || modifiedFields.has("valuation_method") || modifiedFields.has("currency_code")}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-xs font-medium text-slate-300">Company Name</Label>
                <Input
                  value={settings.company_name || ""}
                  onChange={(e) => updateField("company_name", e.target.value)}
                  className="mt-1 bg-slate-900 border-slate-800 text-white"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-300">Inventory Valuation Method</Label>
                <Select
                  value={settings.valuation_method || "fifo"}
                  onValueChange={(v) => updateField("valuation_method", v)}
                >
                  <SelectTrigger className="mt-1 bg-slate-900 border-slate-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="fifo">FIFO (First-In, First-Out)</SelectItem>
                    <SelectItem value="lifo">LIFO (Last-In, First-Out)</SelectItem>
                    <SelectItem value="weighted_average">Weighted Average Cost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-300">Default Currency</Label>
                <Input
                  value={settings.currency_code || "GBP"}
                  onChange={(e) => updateField("currency_code", e.target.value)}
                  className="mt-1 bg-slate-900 border-slate-800 text-white"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs font-medium text-slate-300">Company Address</Label>
                <Input
                  value={settings.company_address || ""}
                  onChange={(e) => updateField("company_address", e.target.value)}
                  className="mt-1 bg-slate-900 border-slate-800 text-white"
                />
              </div>
            </div>
          </AdvancedSettingsCard>

          <AdvancedSettingsCard
            title="Default Stock Thresholds"
            description="Global reorder and safety minimum levels applied to new inventory SKUs."
            icon={Sliders}
            isModified={modifiedFields.has("default_minimum_level") || modifiedFields.has("default_reorder_level")}
          >
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <Label className="font-medium text-slate-300">Default Minimum Safety Buffer</Label>
                  <span className="font-mono text-blue-400 font-semibold">{settings.default_minimum_level ?? 10} units</span>
                </div>
                <Input
                  type="number"
                  value={settings.default_minimum_level ?? 10}
                  onChange={(e) => updateField("default_minimum_level", Number(e.target.value))}
                  className="bg-slate-900 border-slate-800 text-white"
                />
                <p className="text-[11px] text-slate-400">Triggers critical low-stock warnings when inventory drops below this level.</p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <Label className="font-medium text-slate-300">Default Reorder Level</Label>
                  <span className="font-mono text-indigo-400 font-semibold">{settings.default_reorder_level ?? 20} units</span>
                </div>
                <Input
                  type="number"
                  value={settings.default_reorder_level ?? 20}
                  onChange={(e) => updateField("default_reorder_level", Number(e.target.value))}
                  className="bg-slate-900 border-slate-800 text-white"
                />
                <p className="text-[11px] text-slate-400">Automatically creates replenishment recommendations when stock reaches this threshold.</p>
              </div>
            </div>
          </AdvancedSettingsCard>
        </TabsContent>

        {/* 3. Auth Tab */}
        <TabsContent value="auth" className="space-y-4">
          <AdvancedSettingsCard
            title="Session & Token Lifetimes"
            description="Configure user session expiration and JWT refresh token longevity."
            icon={Key}
            isModified={
              modifiedFields.has("session_timeout_minutes") ||
              modifiedFields.has("jwt_access_minutes") ||
              modifiedFields.has("jwt_refresh_days") ||
              modifiedFields.has("remember_me_days")
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-xs font-medium text-slate-300">Inactivity Timeout (Minutes)</Label>
                <Input
                  type="number"
                  value={settings.session_timeout_minutes ?? 60}
                  onChange={(e) => updateField("session_timeout_minutes", Number(e.target.value))}
                  className="mt-1 bg-slate-900 border-slate-800 text-white"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-300">JWT Access Token Lifetime (Minutes)</Label>
                <Input
                  type="number"
                  value={settings.jwt_access_minutes ?? 60}
                  onChange={(e) => updateField("jwt_access_minutes", Number(e.target.value))}
                  className="mt-1 bg-slate-900 border-slate-800 text-white"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-300">JWT Refresh Token Lifetime (Days)</Label>
                <Input
                  type="number"
                  value={settings.jwt_refresh_days ?? 7}
                  onChange={(e) => updateField("jwt_refresh_days", Number(e.target.value))}
                  className="mt-1 bg-slate-900 border-slate-800 text-white"
                />
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-300">"Remember Me" Duration (Days)</Label>
                <Input
                  type="number"
                  value={settings.remember_me_days ?? 30}
                  onChange={(e) => updateField("remember_me_days", Number(e.target.value))}
                  className="mt-1 bg-slate-900 border-slate-800 text-white"
                />
              </div>
            </div>
          </AdvancedSettingsCard>
        </TabsContent>

        {/* 4. Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <AdvancedSettingsCard
                title="Password Policy & Brute-Force Lockout"
                description="Enforce complexity requirements and rate-limiting rules."
                icon={Shield}
                isModified={
                  modifiedFields.has("password_min_length") ||
                  modifiedFields.has("max_login_attempts") ||
                  modifiedFields.has("lockout_duration_minutes") ||
                  modifiedFields.has("password_require_uppercase") ||
                  modifiedFields.has("password_require_lowercase") ||
                  modifiedFields.has("password_require_number") ||
                  modifiedFields.has("password_require_special")
                }
              >
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs font-medium text-slate-300">Min Length</Label>
                      <Input
                        type="number"
                        value={settings.password_min_length ?? 8}
                        onChange={(e) => updateField("password_min_length", Number(e.target.value))}
                        className="mt-1 bg-slate-900 border-slate-800 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-300">Max Attempts</Label>
                      <Input
                        type="number"
                        value={settings.max_login_attempts ?? 5}
                        onChange={(e) => updateField("max_login_attempts", Number(e.target.value))}
                        className="mt-1 bg-slate-900 border-slate-800 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-slate-300">Lockout (Mins)</Label>
                      <Input
                        type="number"
                        value={settings.lockout_duration_minutes ?? 30}
                        onChange={(e) => updateField("lockout_duration_minutes", Number(e.target.value))}
                        className="mt-1 bg-slate-900 border-slate-800 text-white"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-medium text-white">Require Uppercase Letter</Label>
                        <p className="text-[11px] text-slate-400">Enforces at least one capital letter (A-Z)</p>
                      </div>
                      <Switch
                        checked={!!settings.password_require_uppercase}
                        onCheckedChange={(v) => updateField("password_require_uppercase", v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-medium text-white">Require Lowercase Letter</Label>
                        <p className="text-[11px] text-slate-400">Enforces at least one lowercase letter (a-z)</p>
                      </div>
                      <Switch
                        checked={!!settings.password_require_lowercase}
                        onCheckedChange={(v) => updateField("password_require_lowercase", v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-medium text-white">Require Numerical Digit</Label>
                        <p className="text-[11px] text-slate-400">Enforces at least one number (0-9)</p>
                      </div>
                      <Switch
                        checked={!!settings.password_require_number}
                        onCheckedChange={(v) => updateField("password_require_number", v)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-medium text-white">Require Special Character</Label>
                        <p className="text-[11px] text-slate-400">Enforces symbols (!@#$%^&*)</p>
                      </div>
                      <Switch
                        checked={!!settings.password_require_special}
                        onCheckedChange={(v) => updateField("password_require_special", v)}
                      />
                    </div>
                  </div>
                </div>
              </AdvancedSettingsCard>
            </div>

            {/* Security Rating Card */}
            <div>
              <Card className="bg-slate-900/50 border-slate-800 p-5 space-y-4">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-400" /> Policy Strength Meter
                </h4>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Security Score</span>
                    <span className="font-bold text-purple-400">{securityScore}/100</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        securityScore >= 80
                          ? "bg-emerald-500"
                          : securityScore >= 50
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${securityScore}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {securityScore >= 80
                      ? "Enterprise Compliance: High password security standards enabled."
                      : securityScore >= 50
                      ? "Moderate Security: Consider enabling special characters & length requirements."
                      : "Weak Security: Recommend tightening password complexity rules."}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* 5. Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <AdvancedSettingsCard
            title="Notification Channels & Alerts"
            description="Manage system dispatch channels for predictive reorder alerts and expiry notifications."
            icon={Bell}
            isModified={
              modifiedFields.has("enable_predictive_alerts") ||
              modifiedFields.has("enable_email_notifications") ||
              modifiedFields.has("enable_push_notifications") ||
              modifiedFields.has("expiry_alert_emails")
            }
          >
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-white">Predictive AI Alerts</Label>
                    <p className="text-[10px] text-slate-400">Auto forecast triggers</p>
                  </div>
                  <Switch
                    checked={!!settings.enable_predictive_alerts}
                    onCheckedChange={(v) => updateField("enable_predictive_alerts", v)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-white">Email Dispatch</Label>
                    <p className="text-[10px] text-slate-400">Daily reorder emails</p>
                  </div>
                  <Switch
                    checked={!!settings.enable_email_notifications}
                    onCheckedChange={(v) => updateField("enable_email_notifications", v)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-semibold text-white">Push Notifications</Label>
                    <p className="text-[10px] text-slate-400">Browser/mobile alerts</p>
                  </div>
                  <Switch
                    checked={!!settings.enable_push_notifications}
                    onCheckedChange={(v) => updateField("enable_push_notifications", v)}
                  />
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-800 pt-4">
                <Label className="text-xs font-medium text-slate-300">Expiry Alert Email Recipients</Label>
                <Input
                  placeholder="purchasing@company.com, manager@company.com"
                  value={(settings.expiry_alert_emails || []).join(", ")}
                  onChange={(e) =>
                    updateField(
                      "expiry_alert_emails",
                      e.target.value.split(",").map((email) => email.trim()).filter(Boolean)
                    )
                  }
                  className="bg-slate-900 border-slate-800 text-white"
                />
                <p className="text-[11px] text-slate-400">Comma-separated email addresses that receive batch expiration notifications.</p>
              </div>
            </div>
          </AdvancedSettingsCard>
        </TabsContent>

        {/* 6. Forecast Tab */}
        <TabsContent value="forecast" className="space-y-4">
          <AdvancedSettingsCard
            title="Demand Forecasting Defaults"
            description="Select default algorithms and time horizons for predictive inventory planning."
            icon={TrendingUp}
            isModified={modifiedFields.has("forecast_model") || modifiedFields.has("forecast_horizon_days")}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-xs font-medium text-slate-300">Default Model</Label>
                <Select
                  value={settings.forecast_model || "exponential_smoothing"}
                  onValueChange={(v) => updateField("forecast_model", v)}
                >
                  <SelectTrigger className="mt-1 bg-slate-900 border-slate-800 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="exponential_smoothing">Exponential Smoothing (Best for recent trends)</SelectItem>
                    <SelectItem value="moving_average">Simple Moving Average (Best for steady demand)</SelectItem>
                    <SelectItem value="linear_regression">Linear Regression (Best for long-term growth)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-medium text-slate-300">Forecast Horizon (Days)</Label>
                <Input
                  type="number"
                  value={settings.forecast_horizon_days ?? 30}
                  onChange={(e) => updateField("forecast_horizon_days", Number(e.target.value))}
                  className="mt-1 bg-slate-900 border-slate-800 text-white"
                />
              </div>
            </div>
          </AdvancedSettingsCard>
        </TabsContent>

        {/* 7. Scheduled Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <AdvancedSettingsCard
            title="Scheduled Report Delivery"
            description="Overview of configured automated report schedules."
            icon={Clock}
          >
            <div className="space-y-2">
              {schedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs border-b border-slate-800/60 py-2.5">
                  <div className="font-medium text-white">{s.name}</div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Badge variant="outline" className="border-slate-700 text-slate-300">{s.frequency}</Badge>
                    <span>{s.report_type}</span>
                  </div>
                </div>
              ))}
              {schedules.length === 0 && (
                <p className="text-xs text-slate-500 py-4 text-center">No scheduled report dispatches configured.</p>
              )}
            </div>
          </AdvancedSettingsCard>
        </TabsContent>

        {/* 8. Locations Tab */}
        <TabsContent value="locations" className="space-y-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <Warehouse className="h-4 w-4 text-blue-400" /> Managed Warehouse & Store Locations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Location Name</TableHead>
                    <TableHead className="text-slate-400">Type</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((loc) => (
                    <TableRow key={loc.id} className="border-slate-800/60 hover:bg-slate-800/30">
                      <TableCell className="font-medium text-white">{loc.name}</TableCell>
                      <TableCell className="text-slate-400 capitalize">{loc.location_type}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            loc.is_active
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }
                        >
                          {loc.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {locations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-xs text-slate-500 py-6">
                        No locations loaded.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Apply Preview Modal */}
      <TemplateApplyModal
        template={selectedTemplateForApply}
        currentSettings={settings}
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        onConfirm={handleApplyPreset}
      />

      {/* Custom Template Creator Modal */}
      <CustomTemplateModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        currentSettings={settings}
        onSaveCustomTemplate={handleSaveCustomTemplate}
      />
    </div>
  );
}
