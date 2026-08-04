"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Building, Warehouse, Zap, Shield, TrendingUp, Copy, Layers } from "lucide-react";

const ICON_MAP = {
  Building,
  Warehouse,
  Zap,
  Shield,
  TrendingUp,
};

export function TemplateCard({ template, isActive, onSelect }) {
  const Icon = ICON_MAP[template.iconName] || Layers;

  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-300 border ${
        isActive
          ? "bg-slate-900/90 border-blue-500/60 ring-2 ring-blue-500/30 shadow-xl shadow-blue-500/10"
          : "bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80 hover:shadow-lg"
      }`}
    >
      <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full pointer-events-none transition-opacity duration-300 group-hover:opacity-100 opacity-50" />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-300 ${template.badgeColor}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors">
                {template.name}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                {template.category}
              </CardDescription>
            </div>
          </div>
          {isActive && (
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Active
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
          {template.description}
        </p>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          {template.highlights.map((highlight, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-800/50 px-2 py-1 rounded border border-slate-800"
            >
              <span className="h-1 w-1 rounded-full bg-blue-400" />
              <span className="truncate">{highlight}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 flex items-center gap-2">
          <Button
            onClick={() => onSelect(template)}
            variant={isActive ? "secondary" : "default"}
            className={`w-full text-xs font-medium h-9 transition-all ${
              isActive
                ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                : "bg-blue-600/90 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20"
            }`}
          >
            {isActive ? "Re-apply Preset" : "Use This Preset"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
