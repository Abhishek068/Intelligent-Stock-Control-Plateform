"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save, Download, Upload } from "lucide-react";
import { toast } from "sonner";

export function CustomTemplateModal({ isOpen, onClose, currentSettings, onSaveCustomTemplate }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Custom Preset");
  const [description, setDescription] = useState("");

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a preset template name");
      return;
    }

    const newTemplate = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      category: category.trim() || "Custom Preset",
      description: description.trim() || "User defined custom system settings profile.",
      iconName: "Sliders",
      badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      glowColor: "group-hover:border-purple-500/40",
      settings: {
        default_minimum_level: currentSettings.default_minimum_level,
        default_reorder_level: currentSettings.default_reorder_level,
        valuation_method: currentSettings.valuation_method,
        enable_predictive_alerts: currentSettings.enable_predictive_alerts,
        enable_email_notifications: currentSettings.enable_email_notifications,
        enable_push_notifications: currentSettings.enable_push_notifications,
        forecast_model: currentSettings.forecast_model,
        forecast_horizon_days: currentSettings.forecast_horizon_days,
        session_timeout_minutes: currentSettings.session_timeout_minutes,
        jwt_access_minutes: currentSettings.jwt_access_minutes,
        jwt_refresh_days: currentSettings.jwt_refresh_days,
        remember_me_days: currentSettings.remember_me_days,
        max_login_attempts: currentSettings.max_login_attempts,
        lockout_duration_minutes: currentSettings.lockout_duration_minutes,
        password_min_length: currentSettings.password_min_length,
        password_require_uppercase: currentSettings.password_require_uppercase,
        password_require_lowercase: currentSettings.password_require_lowercase,
        password_require_number: currentSettings.password_require_number,
        password_require_special: currentSettings.password_require_special,
      },
      highlights: [
        `${currentSettings.valuation_method?.toUpperCase()} Valuation`,
        `Min: ${currentSettings.default_minimum_level} / Reorder: ${currentSettings.default_reorder_level}`,
        `${currentSettings.forecast_horizon_days}-Day Forecast`,
        "Custom Configuration",
      ],
    };

    onSaveCustomTemplate(newTemplate);
    toast.success(`Custom preset "${newTemplate.name}" saved!`);
    setName("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-900 text-white border-slate-800 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Save className="h-5 w-5 text-purple-400" /> Save Current Settings as Preset
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Store your current system configuration as a reusable preset template.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div>
            <Label className="text-xs font-semibold text-slate-300">Preset Name *</Label>
            <Input
              placeholder="e.g. Q4 Peak Season Profile"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 bg-slate-800/80 border-slate-700 text-white focus:border-purple-500"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-300">Category Tag</Label>
            <Input
              placeholder="e.g. Seasonal Operations"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 bg-slate-800/80 border-slate-700 text-white focus:border-purple-500"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-300">Description</Label>
            <Textarea
              placeholder="Briefly explain what this setting template is configured for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 bg-slate-800/80 border-slate-700 text-white focus:border-purple-500 min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-slate-700 bg-slate-800/50">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20"
          >
            <Save className="mr-2 h-4 w-4" /> Save Preset Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
