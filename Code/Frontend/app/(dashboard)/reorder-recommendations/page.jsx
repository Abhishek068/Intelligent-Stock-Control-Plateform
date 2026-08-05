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
    return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-inner px-2.5 py-1">Critical</Badge>;
  }
  if (p === "high") {
    return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-inner px-2.5 py-1">High</Badge>;
  }
  if (p === "medium") {
    return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-inner px-2.5 py-1">Medium</Badge>;
  }
  if (p === "low") {
    return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-inner px-2.5 py-1">Low</Badge>;
  }
  return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 shadow-inner px-2.5 py-1">{priority || "Unknown"}</Badge>;
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
            <div className="p-2.5 bg-teal-500/20 rounded-xl border border-teal-500/30 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.2)]">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Reorder Recommendations
            </h1>
          </div>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Smart replenishment suggestions from forecasting and lead times.
          </p>
        </div>

        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleGenerate} 
            disabled={isGenerating}
            className="bg-slate-900/50 border-white/10 hover:bg-white/10 text-slate-200 hover:text-white backdrop-blur-xl rounded-xl h-11 px-5 transition-all shadow-lg shadow-black/20"
          >
            <RefreshCw className={`mr-2 h-4 w-4 text-teal-400 ${isGenerating ? "animate-spin" : ""}`} />
            {isGenerating ? "Generating..." : "Generate"}
          </Button>
          <Button
            onClick={handleCreatePos}
            disabled={creatingPo || filtered.length === 0}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold rounded-xl h-11 px-6 shadow-lg shadow-teal-500/25 border border-teal-500/50 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
          >
            <FilePlus className="mr-2 h-4 w-4" />
            {creatingPo ? "Creating..." : "Create POs"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-teal-500/30 bg-slate-900/40 backdrop-blur-2xl shadow-[0_0_20px_rgba(20,184,166,0.05)] overflow-hidden rounded-2xl relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-emerald-500/5 group-hover:from-teal-500/10 group-hover:to-emerald-500/10 transition-colors" />
          <CardContent className="p-6 relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-2 text-teal-400 mb-2">
              <PackageSearch className="h-5 w-5" />
              <p className="text-sm font-semibold uppercase tracking-wider">Total Suggested Units</p>
            </div>
            <p className="text-4xl font-extrabold text-slate-100">
              {recommendations.reduce((s, r) => s + r.suggested_quantity, 0)}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border border-rose-500/30 bg-slate-900/40 backdrop-blur-2xl shadow-[0_0_20px_rgba(244,63,94,0.05)] overflow-hidden rounded-2xl relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-pink-500/5 group-hover:from-rose-500/10 group-hover:to-pink-500/10 transition-colors" />
          <CardContent className="p-6 relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-2 text-rose-400 mb-2">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm font-semibold uppercase tracking-wider">Critical Items</p>
            </div>
            <p className="text-4xl font-extrabold text-rose-400">
              {recommendations.filter((r) => String(r.priority).toLowerCase() === "critical").length}
            </p>
          </CardContent>
        </Card>
        
        <Card className="border border-amber-500/30 bg-slate-900/40 backdrop-blur-2xl shadow-[0_0_20px_rgba(245,158,11,0.05)] overflow-hidden rounded-2xl relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 group-hover:from-amber-500/10 group-hover:to-orange-500/10 transition-colors" />
          <CardContent className="p-6 relative z-10 flex flex-col h-full justify-between">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <p className="text-sm font-semibold uppercase tracking-wider">High Priority</p>
            </div>
            <p className="text-4xl font-extrabold text-amber-400">
              {recommendations.filter((r) => String(r.priority).toLowerCase() === "high").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Filters Area */}
        <div className="px-8 py-5 border-b border-white/5 bg-slate-950/20 relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-lg">
            Recommendations Ledger
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-[180px] bg-slate-950/50 border-white/10 focus:border-teal-500/50 text-slate-200 rounded-xl h-10">
                  <SelectValue placeholder="All Suppliers" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 shadow-xl rounded-xl text-slate-200">
                  {suppliers.map((s) =>
                    <SelectItem key={s} value={s} className="focus:bg-teal-500/20 focus:text-teal-200">
                      {s === "all" ? "All Suppliers" : s}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[160px] bg-slate-950/50 border-white/10 focus:border-teal-500/50 text-slate-200 rounded-xl h-10">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 shadow-xl rounded-xl text-slate-200">
                <SelectItem value="all" className="focus:bg-teal-500/20 focus:text-teal-200">All Priorities</SelectItem>
                <SelectItem value="critical" className="focus:bg-rose-500/20 focus:text-rose-200 text-rose-400">Critical</SelectItem>
                <SelectItem value="high" className="focus:bg-amber-500/20 focus:text-amber-200 text-amber-400">High</SelectItem>
                <SelectItem value="medium" className="focus:bg-blue-500/20 focus:text-blue-200 text-blue-400">Medium</SelectItem>
                <SelectItem value="low" className="focus:bg-emerald-500/20 focus:text-emerald-200 text-emerald-400">Low</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-sm text-slate-500 font-medium ml-2">
              Showing {filtered.length} of {recommendations.length}
            </span>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto relative z-10">
            <Table>
              <TableHeader className="bg-slate-950/40 border-b border-white/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 pl-8 font-semibold text-slate-300">Product</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Supplier</TableHead>
                  <TableHead className="py-4 text-center font-semibold text-slate-300">Stock</TableHead>
                  <TableHead className="py-4 text-center font-semibold text-slate-300">Lead Time</TableHead>
                  <TableHead className="py-4 text-center font-semibold text-purple-400">Forecast</TableHead>
                  <TableHead className="py-4 text-center font-semibold text-teal-400">Suggested</TableHead>
                  <TableHead className="py-4 text-center font-semibold text-slate-300">Priority</TableHead>
                  <TableHead className="py-4 text-center font-semibold text-slate-300">Risk</TableHead>
                  <TableHead className="py-4 pr-8 text-center font-semibold text-slate-300">Why?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-slate-400 py-12">
                      <div className="animate-pulse flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-teal-400" />
                        Loading recommendations...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-slate-400 py-12">
                      <div className="flex flex-col items-center justify-center">
                        <TrendingUp className="h-10 w-10 text-slate-600 mb-3" />
                        <p>No recommendations</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-800/40 transition-colors border-b border-white/5 group">
                      <TableCell className="pl-8 py-4">
                        <div>
                          <p className="font-semibold text-slate-100">{item.product_name}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{item.product_sku}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-300 font-medium">{item.supplier_name}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-slate-300 bg-slate-800/50 px-2 py-1 rounded">{item.current_stock}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-slate-400">{item.lead_time_days}d</span>
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold text-purple-400">
                        {Number(item.predicted_demand).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-1 rounded shadow-inner">
                          {item.suggested_quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <PriorityBadge priority={item.priority} />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-mono text-xs font-semibold ${item.stockout_risk > 80 ? 'text-rose-400' : item.stockout_risk > 50 ? 'text-amber-400' : 'text-slate-400'}`}>
                          {item.stockout_risk ? `${Number(item.stockout_risk).toFixed(0)}%` : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center pr-8">
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-teal-400 hover:bg-teal-500/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                            >
                              <HelpCircle className="h-4 w-4" />
                            </Button>
                          </SheetTrigger>
                          <SheetContent side="right" className="bg-[#0F172A] border-l border-teal-500/30 w-full sm:max-w-md p-0">
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-500 to-emerald-500" />
                            <SheetHeader className="p-6 border-b border-white/5">
                              <SheetTitle className="text-teal-400 flex items-center gap-2">
                                <HelpCircle className="h-5 w-5" />
                                Why reorder {item.product_name}?
                              </SheetTitle>
                            </SheetHeader>
                            <div className="p-6 h-[calc(100vh-80px)] overflow-y-auto">
                              <pre className="overflow-auto rounded-xl bg-slate-950 border border-white/5 p-4 text-xs font-mono text-slate-300">
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
