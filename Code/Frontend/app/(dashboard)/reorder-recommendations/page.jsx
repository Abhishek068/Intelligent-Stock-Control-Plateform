"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { HelpCircle, RefreshCw, Filter } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { analyticsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

const priorityColors = {
  critical: "bg-red-500 text-white",
  high: "bg-amber-500 text-white",
  medium: "bg-blue-500 text-white",
  low: "bg-green-500 text-white"
};

const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

export default function ReorderRecommendationsPage() {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isGenerating, setIsGenerating] = useState(false);

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
    if (priorityFilter !== "all") rows = rows.filter((r) => r.priority === priorityFilter.toLowerCase());
    return [...rows].sort(
      (a, b) => (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Reorder Recommendations</h1>
          <p className="text-slate-400">Smart replenishment suggestions from forecasting and lead times</p>
        </div>
        <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
          {isGenerating ? "Generating..." : "Generate"}
        </Button>
      </div>

      <Card className="glass-card">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Suppliers" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) =>
              <SelectItem key={s} value={s}>
                  {s === "all" ? "All Suppliers" : s}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-auto text-sm text-slate-400">
            Showing {filtered.length} of {recommendations.length}
          </span>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="text-center">Lead Time</TableHead>
                <TableHead className="text-center">Forecast</TableHead>
                <TableHead className="text-center">Suggested</TableHead>
                <TableHead className="text-center">Priority</TableHead>
                <TableHead className="text-center">Risk</TableHead>
                <TableHead className="text-center">Why?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ?
              <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-400">
                    Loading...
                  </TableCell>
                </TableRow> :
              filtered.length === 0 ?
              <TableRow>
                  <TableCell colSpan={9} className="text-center text-slate-400">
                    No recommendations
                  </TableCell>
                </TableRow> :

              filtered.map((item) =>
              <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-xs text-slate-400">{item.product_sku}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{item.supplier_name}</TableCell>
                    <TableCell className="text-center font-mono">{item.current_stock}</TableCell>
                    <TableCell className="text-center font-mono">{item.lead_time_days}d</TableCell>
                    <TableCell className="text-center font-mono text-purple-600">
                      {Number(item.predicted_demand).toFixed(1)}
                    </TableCell>
                    <TableCell className="text-center font-mono font-bold text-teal-600">
                      {item.suggested_quantity}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={priorityColors[item.priority] || "bg-slate-400"}>
                        {item.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {item.stockout_risk ? `${Number(item.stockout_risk).toFixed(0)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="right">
                          <SheetHeader>
                            <SheetTitle>Why reorder {item.product_name}?</SheetTitle>
                          </SheetHeader>
                          <pre className="mt-4 overflow-auto rounded bg-slate-900/50 p-3 text-xs">
                            {JSON.stringify(item.explanation_json || {}, null, 2)}
                          </pre>
                        </SheetContent>
                      </Sheet>
                    </TableCell>
                  </TableRow>
              )
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Total Suggested Units</p>
            <p className="text-2xl font-bold">
              {recommendations.reduce((s, r) => s + r.suggested_quantity, 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Critical Items</p>
            <p className="text-2xl font-bold text-red-600">
              {recommendations.filter((r) => r.priority === "critical").length}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">High Priority</p>
            <p className="text-2xl font-bold text-amber-600">
              {recommendations.filter((r) => r.priority === "high").length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>);

}
