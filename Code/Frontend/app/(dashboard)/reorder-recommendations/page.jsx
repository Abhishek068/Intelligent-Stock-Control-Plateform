"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HelpCircle, RefreshCw, Filter, FilePlus, TrendingUp, PackageSearch, AlertCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { analyticsApi, purchaseOrdersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRouter } from "next/navigation";

const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

function PriorityBadge({ priority }) {
  const p = String(priority || "").toLowerCase();
  if (p === "critical") {
    return <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 font-bold px-2.5 py-1">Critical</Badge>;
  }
  if (p === "high") {
    return <Badge className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 font-bold px-2.5 py-1">High</Badge>;
  }
  if (p === "medium") {
    return <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 font-bold px-2.5 py-1">Medium</Badge>;
  }
  if (p === "low") {
    return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 font-bold px-2.5 py-1">Low</Badge>;
  }
  return <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20 font-bold px-2.5 py-1">{priority || "Unknown"}</Badge>;
}

export default function ReorderRecommendationsPage() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
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
  }, [recommendations, supplierFilter, priorityFilter]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await analyticsApi.generateRecommendations();
      if (res.success && res.data) {
        setRecommendations(res.data);
        toast.success("Recommendations regenerated");
      } else {
        await loadRecommendations();
        toast.success("Recommendations regenerated");
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreatePos = async () => {
    const ids = filtered.map((r) => r.product).filter(Boolean);
    if (!ids.length) {
      toast.error("No products to order");
      return;
    }
    setCreatingPo(true);
    try {
      const res = await purchaseOrdersApi.fromReorder({ product_ids: ids });
      const created = res?.data || [];
      toast.success(
        created.length
          ? `Created ${created.length} draft PO(s)`
          : "No POs created"
      );
      if (created[0]?.id) router.push(`/purchase-orders/${created[0].id}`);
      else router.push("/purchase-orders");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "PO create failed");
    } finally {
      setCreatingPo(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-teal-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-teal-50 dark:bg-teal-500/20 rounded-xl border border-teal-200 dark:border-teal-500/30 text-teal-600 dark:text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-slate-50 dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              Reorder Recommendations
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Smart replenishment suggestions from forecasting and lead times.
          </p>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl h-11 px-5 transition-all shadow-sm cursor-pointer"
          >
            <RefreshCw className={`mr-2 h-4 w-4 text-teal-600 dark:text-teal-400 ${isGenerating ? "animate-spin" : ""}`} />
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
          <Button
            onClick={handleCreatePos}
            disabled={creatingPo || filtered.length === 0}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold rounded-xl h-11 px-6 shadow-md cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FilePlus className="mr-2 h-4 w-4" />
            {creatingPo ? "Creating..." : "Create POs"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-teal-200/80 dark:border-teal-500/30 bg-white/90 dark:bg-slate-900/40 backdrop-blur-2xl shadow-md overflow-hidden rounded-2xl relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-emerald-500/5 group-hover:from-teal-500/10 group-hover:to-emerald-500/10 transition-colors pointer-events-none" />
          <CardContent className="p-6 relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 mb-2">
              <PackageSearch className="h-5 w-5" />
              <p className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-teal-400">Total Suggested Units</p>
            </div>
            <p className="text-4xl font-extrabold text-slate-900 dark:text-slate-100">
              {recommendations.reduce((s, r) => s + r.suggested_quantity, 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border border-rose-200/80 dark:border-rose-500/30 bg-white/90 dark:bg-slate-900/40 backdrop-blur-2xl shadow-md overflow-hidden rounded-2xl relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-pink-500/5 group-hover:from-rose-500/10 group-hover:to-pink-500/10 transition-colors pointer-events-none" />
          <CardContent className="p-6 relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 mb-2">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-rose-400">Critical Items</p>
            </div>
            <p className="text-4xl font-extrabold text-rose-600 dark:text-rose-400">
              {recommendations.filter((r) => String(r.priority).toLowerCase() === "critical").length}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border border-amber-200/80 dark:border-amber-500/30 bg-white/90 dark:bg-slate-900/40 backdrop-blur-2xl shadow-md overflow-hidden rounded-2xl relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 group-hover:from-amber-500/10 group-hover:to-orange-500/10 transition-colors pointer-events-none" />
          <CardContent className="p-6 relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-amber-400">High Priority</p>
            </div>
            <p className="text-4xl font-extrabold text-amber-600 dark:text-amber-400">
              {recommendations.filter((r) => String(r.priority).toLowerCase() === "high").length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stochastic Safety Stock & ABC/XYZ Optimization Info Banner */}
      <Card className="border border-purple-200/80 dark:border-purple-500/30 bg-purple-50/70 dark:bg-purple-950/20 backdrop-blur-2xl shadow-md rounded-2xl p-4 text-sm text-slate-800 dark:text-slate-200">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-base">
              <TrendingUp className="h-5 w-5 text-purple-700 dark:text-purple-400" />
              <span>Stochastic Safety Stock & ABC/XYZ Policy Engine</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Safety stock is dynamically optimized using probabilistic math: <span className="font-mono text-purple-700 dark:text-purple-300 font-bold">SS = Z × √(L̄·σD² + D̄²·σL²)</span> with a <strong className="text-slate-900 dark:text-white">98% Target Service Level (Z = 2.054)</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 font-semibold">AX/AY/BX: Auto Reorder</span>
            <span className="px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30 font-semibold">AZ/BY/CX: Review Req</span>
            <span className="px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 font-semibold">BZ/CY/CZ: Manual JIT</span>
          </div>
        </div>
      </Card>

      <Card className="border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Filters Area */}
        <div className="px-8 py-5 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-200 font-bold text-lg">
            Recommendations Ledger
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-[180px] bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-10">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl rounded-xl text-slate-800 dark:text-slate-200">
                  {suppliers.map((s) =>
                    <SelectItem key={s} value={s} className="cursor-pointer">
                      {s === "all" ? "All Suppliers" : s}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[160px] bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-10">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl rounded-xl text-slate-800 dark:text-slate-200">
                <SelectItem value="all" className="cursor-pointer">All Priorities</SelectItem>
                <SelectItem value="critical" className="text-rose-600 dark:text-rose-400 font-semibold cursor-pointer">Critical</SelectItem>
                <SelectItem value="high" className="text-amber-600 dark:text-amber-400 font-semibold cursor-pointer">High</SelectItem>
                <SelectItem value="medium" className="text-blue-600 dark:text-blue-400 font-semibold cursor-pointer">Medium</SelectItem>
                <SelectItem value="low" className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer">Low</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-sm text-slate-500 font-semibold ml-2">
              Showing {filtered.length} of {recommendations.length}
            </span>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto relative z-10">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-white/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 pl-8 font-bold text-slate-700 dark:text-slate-300">Product</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Supplier</TableHead>
                  <TableHead className="py-4 text-center font-bold text-slate-700 dark:text-slate-300">Stock</TableHead>
                  <TableHead className="py-4 text-center font-bold text-slate-700 dark:text-slate-300">Lead Time</TableHead>
                  <TableHead className="py-4 text-center font-bold text-purple-600 dark:text-purple-400">Forecast</TableHead>
                  <TableHead className="py-4 text-center font-bold text-teal-600 dark:text-teal-400">Suggested</TableHead>
                  <TableHead className="py-4 text-center font-bold text-slate-700 dark:text-slate-300">Priority</TableHead>
                  <TableHead className="py-4 text-center font-bold text-slate-700 dark:text-slate-300">Risk</TableHead>
                  <TableHead className="py-4 pr-8 text-center font-bold text-slate-700 dark:text-slate-300">Why?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-slate-500 dark:text-slate-400 py-12">
                      <div className="animate-pulse flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-teal-600 dark:text-teal-400" />
                        Loading recommendations...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-slate-500 dark:text-slate-400 py-12">
                      <div className="flex flex-col items-center justify-center">
                        <TrendingUp className="h-10 w-10 text-slate-400 mb-3" />
                        <p>No recommendations found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-200/60 dark:border-white/5 group">
                      <TableCell className="pl-8 py-4">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{item.product_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">{item.product_sku}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-800 dark:text-slate-300 font-semibold">{item.supplier_name}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 px-2.5 py-1 rounded border border-slate-200/60 dark:border-transparent">{item.current_stock}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-slate-600 dark:text-slate-400 font-medium">{item.lead_time_days}d</span>
                      </TableCell>
                      <TableCell className="text-center font-mono font-bold text-purple-600 dark:text-purple-400">
                        {Number(item.predicted_demand).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 px-2.5 py-1 rounded">
                          {item.suggested_quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <PriorityBadge priority={item.priority} />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-mono text-xs font-bold ${item.stockout_risk > 80 ? 'text-rose-600 dark:text-rose-400' : item.stockout_risk > 50 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                          {item.stockout_risk ? `${Number(item.stockout_risk).toFixed(0)}%` : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center pr-8">
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 cursor-pointer"
                            >
                              <HelpCircle className="h-4 w-4" />
                            </Button>
                          </SheetTrigger>
                          <SheetContent side="right" className="bg-white dark:bg-[#0F172A] border-l border-slate-200 dark:border-teal-500/30 w-full sm:max-w-md p-0 text-slate-900 dark:text-white shadow-2xl">
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-500 to-emerald-500" />
                            <SheetHeader className="p-6 border-b border-slate-200 dark:border-white/5">
                              <SheetTitle className="text-teal-700 dark:text-teal-400 flex items-center gap-2">
                                <HelpCircle className="h-5 w-5" />
                                Why reorder {item.product_name}?
                              </SheetTitle>
                            </SheetHeader>
                            <div className="p-6 h-[calc(100vh-80px)] overflow-y-auto">
                              <pre className="overflow-auto rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 p-4 text-xs font-mono text-slate-800 dark:text-slate-300">
                                {JSON.stringify(item.explanation_json || {}, null, 2)}
                              </pre>
                            </div>
                          </SheetContent>
                        </Sheet>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
