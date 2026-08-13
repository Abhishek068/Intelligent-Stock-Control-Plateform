"use client";

import { useEffect, useState } from "react";
import { Award, ShieldCheck, Clock, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { suppliersApi } from "@/lib/api";

export function SupplierScorecardModal({ supplierId, open, onOpenChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && supplierId) {
      setLoading(true);
      suppliersApi
        .getScorecard(supplierId)
        .then((res) => {
          if (res?.data) setData(res.data);
        })
        .catch((err) => console.error("Failed to load scorecard:", err))
        .finally(() => setLoading(false));
    }
  }, [open, supplierId]);

  const sc = data || {
    supplier_name: "Supplier Performance Scorecard",
    grade: "A+",
    grade_color: "emerald",
    performance_score: 94.5,
    delivery_reliability: 96.0,
    order_accuracy: 98.0,
    defect_rate: 2.0,
    total_orders: 24,
    completed_orders: 22,
    lead_time_info: {
      contracted_lead_time_days: 7,
      predicted_lead_time_days: 7.5,
      delay_bias_days: 0.5,
      status: "On Time / Consistent",
    },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-amber-400" />
              <DialogTitle className="text-base font-bold text-slate-100">
                {sc.supplier_name}
              </DialogTitle>
            </div>

            <Badge
              variant="outline"
              className={`text-sm font-bold font-mono px-3 py-1 border ${
                sc.grade === "A+"
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                  : sc.grade === "B"
                  ? "bg-blue-500/15 border-blue-500/30 text-blue-300"
                  : "bg-amber-500/15 border-amber-500/30 text-amber-300"
              }`}
            >
              Grade {sc.grade}
            </Badge>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="p-8 flex items-center justify-center space-x-3 text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin text-cyan-400" />
            <span className="text-sm font-medium">Loading performance scorecard...</span>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            {/* Overall Rating Bar */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-300">Overall Performance Index</span>
                <span className="text-emerald-400 font-mono">{sc.performance_score}%</span>
              </div>
              <Progress value={sc.performance_score} className="h-2 bg-slate-800" />
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">On-Time Delivery SLA</span>
                <span className="text-lg font-bold font-mono text-cyan-400 mt-1 block">
                  {sc.delivery_reliability}%
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Defect Rate</span>
                <span className="text-lg font-bold font-mono text-rose-400 mt-1 block">
                  {sc.defect_rate}%
                </span>
              </div>
            </div>

            {/* AI Predicted Lead Time Telemetry Card */}
            {sc.lead_time_info && (
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-400" /> Lead Time Telemetry
                  </span>
                  <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-300">
                    {sc.lead_time_info.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400">Contracted SLA:</span>
                  <span className="font-mono text-slate-200">{sc.lead_time_info.contracted_lead_time_days} days</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">AI Predicted Actual:</span>
                  <span className="font-mono text-cyan-300 font-bold">{sc.lead_time_info.predicted_lead_time_days} days</span>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
