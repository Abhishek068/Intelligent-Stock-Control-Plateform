"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FIELD_LABELS } from "../templates";
import { CheckCircle2, ArrowRight, Building, Warehouse, Zap, Shield, TrendingUp, Layers } from "lucide-react";

const ICON_MAP = {
  Building,
  Warehouse,
  Zap,
  Shield,
  TrendingUp,
};

export function TemplateApplyModal({ template, currentSettings, isOpen, onClose, onConfirm }) {
  if (!template || !currentSettings) return null;

  const Icon = ICON_MAP[template.iconName] || Layers;

  // Calculate changes
  const changes = Object.entries(template.settings).map(([key, templateVal]) => {
    const currentVal = currentSettings[key];
    const isDifferent = currentVal !== templateVal;
    return {
      key,
      label: FIELD_LABELS[key] || key,
      currentVal,
      templateVal,
      isDifferent,
    };
  });

  const changedCount = changes.filter((c) => c.isDifferent).length;

  const formatVal = (val) => {
    if (typeof val === "boolean") return val ? "Enabled" : "Disabled";
    if (val === null || val === undefined) return "Not set";
    return String(val);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900/95 text-white border-slate-800 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                Apply Preset: {template.name}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {template.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="my-2 flex items-center justify-between rounded-lg bg-slate-800/60 p-3 border border-slate-700/50">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={template.badgeColor}>
              {template.category}
            </Badge>
            <span className="text-xs text-slate-400">
              {changedCount} of {changes.length} settings will be updated
            </span>
          </div>
          {changedCount === 0 && (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Preset Already Matches Current
            </Badge>
          )}
        </div>

        <div className="max-h-[350px] overflow-y-auto pr-1 space-y-2">
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-400 pb-1 border-b border-slate-800">
            <div className="col-span-5">Setting</div>
            <div className="col-span-3">Current Value</div>
            <div className="col-span-4">Preset Value</div>
          </div>

          {changes.map(({ key, label, currentVal, templateVal, isDifferent }) => (
            <div
              key={key}
              className={`grid grid-cols-12 gap-2 items-center p-2 rounded-md text-xs transition-colors ${
                isDifferent
                  ? "bg-blue-500/10 border border-blue-500/20 text-slate-200"
                  : "bg-slate-800/20 text-slate-400 opacity-60"
              }`}
            >
              <div className="col-span-5 font-medium flex items-center gap-1.5">
                {isDifferent && <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />}
                {label}
              </div>
              <div className="col-span-3 truncate text-slate-400">{formatVal(currentVal)}</div>
              <div className="col-span-4 font-semibold text-blue-300 flex items-center gap-1">
                {isDifferent && <ArrowRight className="h-3 w-3 text-blue-400 flex-shrink-0" />}
                <span className="truncate">{formatVal(templateVal)}</span>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={onClose} className="border-slate-700 bg-slate-800/50 hover:bg-slate-800">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm(template);
              onClose();
            }}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20"
          >
            Apply Preset Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
