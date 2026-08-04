"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  HelpCircle,
  RefreshCw,
  Filter,
  FilePlus,
  AlertTriangle,
  Package,
  Clock,
  TrendingUp,
  Building,
  Search,
  CheckCircle2,
  Zap,
  ArrowRight,
  Calculator,
  ShieldAlert,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { analyticsApi, purchaseOrdersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

const priorityBadgeStyles = {
  Critical: "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/10",
  critical: "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/10",
  High: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10",
  high: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/10",
  Medium: "bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm shadow-blue-500/10",
  medium: "bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-sm shadow-blue-500/10",
  Low: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10",
  low: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/10",
};

const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

function ReorderKpiCard({ title, value, subtitle, icon: Icon, color, glowColor }) {
  return (
    <Card className="relative overflow-hidden bg-slate-900/60 border-slate-800/80 backdrop-blur-xl transition-all duration-300 hover:border-slate-700 hover:shadow-xl group">
      <div className={`absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl ${glowColor} rounded-bl-full pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity`} />
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400">{title}</p>
          <h3 className="text-2xl font-black tracking-tight text-white">{value}</h3>
          {subtitle && <p className="text-[11px] text-slate-400 flex items-center gap-1">{subtitle}</p>}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReorderRecommendationsPage() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [creatingPo, setCreatingPo] = useState(false);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      setRecommendations(await analyticsApi.listRecommendations());
    } catch {
      toast.error("Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const suppliers = useMemo(
    () => ["all", ...new Set(recommendations.map((r) => r.supplier_name).filter(Boolean))],
    [recommendations]
  );

  const filtered = useMemo(() => {
    let rows = recommendations;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(
        (r) =>
          (r.product_name && r.product_name.toLowerCase().includes(q)) ||
          (r.product_sku && r.product_sku.toLowerCase().includes(q)) ||
          (r.supplier_name && r.supplier_name.toLowerCase().includes(q))
      );
    }
    if (supplierFilter !== "all") rows = rows.filter((r) => r.supplier_name === supplierFilter);
    if (priorityFilter !== "all") {
      rows = rows.filter(
        (r) => String(r.priority || "").toLowerCase() === priorityFilter.toLowerCase()
      );
    }
    return [...rows].sort(
      (a, b) =>
        (priorityOrder[String(a.priority || "").toLowerCase()] ?? 9) -
        (priorityOrder[String(b.priority || "").toLowerCase()] ?? 9)
    );
  }, [recommendations, searchQuery, supplierFilter, priorityFilter]);

  // KPI calculations
  const criticalCount = useMemo(
    () => recommendations.filter((r) => String(r.priority).toLowerCase() === "critical").length,
    [recommendations]
  );

  const totalSuggestedUnits = useMemo(
    () => recommendations.reduce((s, r) => s + (r.suggested_quantity || 0), 0),
    [recommendations]
  );

  const avgLeadTime = useMemo(() => {
    if (!recommendations.length) return 0;
    const sum = recommendations.reduce((acc, r) => acc + (r.lead_time_days || 0), 0);
    return (sum / recommendations.length).toFixed(1);
  }, [recommendations]);

  const highRiskCount = useMemo(
    () => recommendations.filter((r) => Number(r.stockout_risk || 0) >= 70).length,
    [recommendations]
  );

  // Checkbox handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedProductIds(filtered.map((r) => r.product).filter(Boolean));
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleToggleSelect = (prodId) => {
    setSelectedProductIds((prev) =>
      prev.includes(prodId) ? prev.filter((id) => id !== prodId) : [...prev, prodId]
    );
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await analyticsApi.generateRecommendations();
      if (res.success && res.data) {
        setRecommendations(res.data);
        toast.success("AI Reorder recommendations regenerated");
      } else {
        await loadRecommendations();
        toast.success("AI Reorder recommendations regenerated");
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreatePos = async () => {
    const idsToOrder =
      selectedProductIds.length > 0
        ? selectedProductIds
        : filtered.map((r) => r.product).filter(Boolean);

    if (!idsToOrder.length) {
      toast.error("No products selected to create Purchase Orders");
      return;
    }

    setCreatingPo(true);
    try {
      const res = await purchaseOrdersApi.fromReorder({ product_ids: idsToOrder });
      const created = res?.data || [];
      toast.success(
        created.length ? `Created ${created.length} draft Purchase Order(s)` : "No POs created"
      );
      if (created[0]?.id) router.push(`/purchase-orders/${created[0].id}`);
      else router.push("/purchase-orders");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "PO creation failed");
    } finally {
      setCreatingPo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Zap className="h-8 w-8 text-amber-400" /> Reorder Recommendations
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Smart replenishment suggestions derived from demand forecasting, safety stock, and lead time modeling.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            onClick={handleCreatePos}
            disabled={creatingPo || filtered.length === 0}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold shadow-lg shadow-emerald-500/20"
          >
            <FilePlus className="mr-2 h-4 w-4" />
            {creatingPo
              ? "Creating POs..."
              : selectedProductIds.length > 0
              ? `Create POs (${selectedProductIds.length})`
              : "Create POs for All"}
          </Button>

          <Button
            variant="outline"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? "animate-spin text-amber-400" : "text-amber-400"}`} />
            {isGenerating ? "Regenerating..." : "Regenerate AI"}
          </Button>
        </div>
      </div>

      {/* Top KPI Metrics Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReorderKpiCard
          title="Critical Outages"
          value={`${criticalCount} Items`}
          subtitle="Immediate replenishment needed"
          icon={AlertTriangle}
          color="bg-rose-500/10 text-rose-400 border-rose-500/20"
          glowColor="from-rose-500/20 to-transparent"
        />

        <ReorderKpiCard
          title="Suggested Units"
          value={totalSuggestedUnits.toLocaleString()}
          subtitle="Recommended order volume"
          icon={Package}
          color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          glowColor="from-emerald-500/20 to-transparent"
        />

        <ReorderKpiCard
          title="Average Lead Time"
          value={`${avgLeadTime} Days`}
          subtitle="Supplier fulfillment horizon"
          icon={Clock}
          color="bg-blue-500/10 text-blue-400 border-blue-500/20"
          glowColor="from-blue-500/20 to-transparent"
        />

        <ReorderKpiCard
          title="High Risk Items"
          value={`${highRiskCount} SKUs`}
          subtitle="Stockout probability > 70%"
          icon={ShieldAlert}
          color="bg-amber-500/10 text-amber-400 border-amber-500/20"
          glowColor="from-amber-500/20 to-transparent"
        />
      </div>

      {/* Main Table Card */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
        <CardContent className="p-5 space-y-4">
          {/* Controls Bar: Search & Select Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search SKU, product, supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-slate-950/60 border-slate-800 text-white"
                />
              </div>

              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-[170px] bg-slate-950/60 border-slate-800 text-slate-200">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  {suppliers.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s === "all" ? "All Suppliers" : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[150px] bg-slate-950/60 border-slate-800 text-slate-200">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs text-slate-400 font-medium self-end sm:self-auto">
              Showing <span className="text-white font-bold">{filtered.length}</span> of {recommendations.length} recommendations
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto overflow-y-hidden rounded-xl border border-slate-800/80 no-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        filtered.length > 0 &&
                        filtered.every((r) => selectedProductIds.includes(r.product))
                      }
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="text-slate-400 font-semibold">Product & SKU</TableHead>
                  <TableHead className="text-slate-400 font-semibold">Supplier</TableHead>
                  <TableHead className="text-slate-400 text-center font-semibold">Current Stock</TableHead>
                  <TableHead className="text-slate-400 text-center font-semibold">Lead Time</TableHead>
                  <TableHead className="text-slate-400 text-center font-semibold">30D Forecast</TableHead>
                  <TableHead className="text-slate-400 text-center font-semibold">Suggested Qty</TableHead>
                  <TableHead className="text-slate-400 text-center font-semibold">Priority</TableHead>
                  <TableHead className="text-slate-400 text-center font-semibold">Stockout Risk</TableHead>
                  <TableHead className="text-slate-400 text-right pr-6 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-slate-400 py-10">
                      Loading AI reorder recommendations...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-slate-400 py-10">
                      No matching reorder recommendations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => {
                    const riskPct = Number(item.stockout_risk || 0);
                    const isSelected = selectedProductIds.includes(item.product);
                    const explanation = item.explanation_json || {};

                    return (
                      <TableRow
                        key={item.id}
                        className={`border-slate-800/60 transition-colors ${
                          isSelected ? "bg-blue-500/10 hover:bg-blue-500/15" : "hover:bg-slate-800/30"
                        }`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelect(item.product)}
                            aria-label={`Select ${item.product_name}`}
                          />
                        </TableCell>

                        <TableCell>
                          <div>
                            <p className="font-semibold text-white text-sm">{item.product_name}</p>
                            <Badge
                              variant="outline"
                              className="bg-slate-950 text-slate-400 border-slate-800 font-mono text-[10px] px-1.5 mt-0.5"
                            >
                              {item.product_sku || `ID-#${item.product}`}
                            </Badge>
                          </div>
                        </TableCell>

                        <TableCell className="text-slate-300 text-sm">
                          <div className="flex items-center gap-1.5">
                            <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[150px]">{item.supplier_name || "Unassigned"}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <span
                            className={`font-mono text-sm font-extrabold ${
                              item.current_stock === 0 ? "text-rose-400 animate-pulse" : "text-slate-200"
                            }`}
                          >
                            {item.current_stock}
                          </span>
                        </TableCell>

                        <TableCell className="text-center font-mono text-xs text-slate-300">
                          <Badge variant="outline" className="bg-slate-950/60 border-slate-800 text-slate-300">
                            {item.lead_time_days}d
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center font-mono text-sm text-purple-400 font-bold">
                          {Number(item.predicted_demand || 0).toFixed(1)}
                        </TableCell>

                        <TableCell className="text-center font-mono text-base font-black text-emerald-400">
                          {item.suggested_quantity > 0 ? `+${item.suggested_quantity}` : 0}
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge className={`text-xs font-semibold px-2.5 py-0.5 border ${priorityBadgeStyles[item.priority] || "bg-slate-800 text-slate-300"}`}>
                            {item.priority}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="w-24 mx-auto space-y-1">
                            <div className="flex justify-between text-[11px] font-mono">
                              <span
                                className={
                                  riskPct >= 70 ? "text-rose-400 font-bold" : riskPct >= 40 ? "text-amber-400" : "text-emerald-400"
                                }
                              >
                                {riskPct.toFixed(0)}%
                              </span>
                            </div>
                            <Progress value={riskPct} className="h-1.5 bg-slate-950" />
                          </div>
                        </TableCell>

                        <TableCell className="text-right pr-6">
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 border border-blue-500/20">
                                <HelpCircle className="mr-1 h-3.5 w-3.5" /> Why?
                              </Button>
                            </SheetTrigger>

                            <SheetContent side="right" className="bg-slate-900/95 border-slate-800 text-white backdrop-blur-2xl w-full sm:max-w-md">
                              <SheetHeader>
                                <SheetTitle className="text-xl font-bold flex items-center gap-2">
                                  <Calculator className="h-5 w-5 text-amber-400" />
                                  Why Reorder {item.product_name}?
                                </SheetTitle>
                                <SheetDescription className="text-xs text-slate-400">
                                  Algorithmic breakdown and statistical parameters for this recommendation.
                                </SheetDescription>
                              </SheetHeader>

                              <div className="space-y-4 my-6">
                                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                                  <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                                    <span className="text-slate-400">Target Product:</span>
                                    <span className="font-bold text-white">{item.product_name}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                                    <span className="text-slate-400">Suggested Order Qty:</span>
                                    <span className="font-mono font-bold text-emerald-400 text-sm">+{item.suggested_quantity} Units</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                                    <span className="text-slate-400">Priority Level:</span>
                                    <Badge className={priorityBadgeStyles[item.priority]}>{item.priority}</Badge>
                                  </div>
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-400">Stockout Risk Index:</span>
                                    <span className="font-mono font-bold text-amber-400">{riskPct.toFixed(1)}%</span>
                                  </div>
                                </div>

                                {/* Parameters Breakdown */}
                                <div className="space-y-2">
                                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Demand & Safety Formula</h4>
                                  <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 to-slate-950 border border-blue-500/20 text-xs space-y-2 text-slate-300">
                                    <p className="flex justify-between">
                                      <span>30-Day Forecast Demand:</span>
                                      <strong className="text-purple-300 font-mono">{explanation.predicted_demand_30d ?? item.predicted_demand ?? "—"} units</strong>
                                    </p>
                                    <p className="flex justify-between">
                                      <span>Avg Daily Burn Rate:</span>
                                      <strong className="text-slate-100 font-mono">{explanation.avg_daily_demand ?? "—"} units/day</strong>
                                    </p>
                                    <p className="flex justify-between">
                                      <span>Supplier Lead Time:</span>
                                      <strong className="text-slate-100 font-mono">{explanation.lead_time_days ?? item.lead_time_days} days</strong>
                                    </p>
                                    <p className="flex justify-between">
                                      <span>Computed Safety Buffer:</span>
                                      <strong className="text-slate-100 font-mono">{explanation.safety_stock ?? "—"} units</strong>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </SheetContent>
                          </Sheet>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
