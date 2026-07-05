"use client";

import { useState, useMemo } from "react";
import { Package, HelpCircle, RefreshCw, Filter, Play, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const mockRecommendations = [
  { id: "1", product: "Keyboard Wired", sku: "SKU-004", supplier: "TechSupply Ltd", currentStock: 3, leadTime: 2, reorderPoint: 8, forecastDemand: 40, suggestedQuantity: 50, priority: "Critical", unitCost: 45.0, stockoutRisk: 92 },
  { id: "2", product: "Wireless Mouse", sku: "SKU-001", supplier: "TechSupply Ltd", currentStock: 12, leadTime: 3, reorderPoint: 20, forecastDemand: 45, suggestedQuantity: 60, priority: "High", unitCost: 24.99, stockoutRisk: 68 },
  { id: "3", product: "USB-C Cable (2m)", sku: "SKU-002", supplier: "Global Parts Co", currentStock: 5, leadTime: 5, reorderPoint: 15, forecastDemand: 120, suggestedQuantity: 200, priority: "High", unitCost: 9.99, stockoutRisk: 74 },
  { id: "4", product: "Desk Monitor Stand", sku: "SKU-003", supplier: "OfficeDirect", currentStock: 8, leadTime: 7, reorderPoint: 10, forecastDemand: 25, suggestedQuantity: 30, priority: "Medium", unitCost: 89.0, stockoutRisk: 45 },
  { id: "5", product: "Ethernet Cable 10ft", sku: "SKU-005", supplier: "Global Parts Co", currentStock: 50, leadTime: 3, reorderPoint: 30, forecastDemand: 60, suggestedQuantity: 20, priority: "Low", unitCost: 12.5, stockoutRisk: 18 },
];

const priorityColors = { Critical: "bg-red-500 text-white", High: "bg-amber-500 text-white", Medium: "bg-blue-500 text-white", Low: "bg-green-500 text-white" };
const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export default function ReorderRecommendationsPage() {
  const [recommendations, setRecommendations] = useState(mockRecommendations);
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulatedItem, setSimulatedItem] = useState(null);

  const suppliers = useMemo(() => ["all", ...new Set(recommendations.map(r => r.supplier))], [recommendations]);

  const filtered = useMemo(() => {
    let filtered = recommendations;
    if (supplierFilter !== "all") filtered = filtered.filter(r => r.supplier === supplierFilter);
    if (priorityFilter !== "all") filtered = filtered.filter(r => r.priority === priorityFilter);
    return filtered.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [recommendations, supplierFilter, priorityFilter]);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setRecommendations(recommendations.map(r => ({ ...r, suggestedQuantity: r.suggestedQuantity + Math.floor(Math.random() * 10) - 5 })));
      setIsGenerating(false);
      toast.success("Recommendations regenerated");
    }, 1200);
  };

  const handleSimulate = (item) => {
    const newStock = item.currentStock + item.suggestedQuantity;
    const newRisk = Math.max(5, item.stockoutRisk - item.stockoutRisk * 0.7);
    setSimulatedItem(item);
    setSimulationResult({ newStock, newRisk });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight text-slate-900">Reorder Recommendations</h1><p className="text-slate-500">AI‑powered replenishment suggestions</p></div>
        <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}><RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />{isGenerating ? "Generating..." : "Generate"}</Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-slate-400" /><span className="text-sm text-slate-500">Filters:</span></div>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Suppliers" /></SelectTrigger>
            <SelectContent>{suppliers.map(s => <SelectItem key={s} value={s}>{s === "all" ? "All Suppliers" : s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Priorities" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Priorities</SelectItem><SelectItem value="Critical">Critical</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent>
          </Select>
          <span className="ml-auto text-sm text-slate-400">Showing {filtered.length} of {recommendations.length}</span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Supplier</TableHead><TableHead className="text-center">Stock</TableHead><TableHead className="text-center">Lead Time</TableHead><TableHead className="text-center">Forecast</TableHead><TableHead className="text-center">Suggested</TableHead><TableHead className="text-center">Priority</TableHead><TableHead className="text-center">Risk</TableHead><TableHead className="text-center">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell><div><p className="font-medium">{item.product}</p><p className="text-xs text-slate-400">{item.sku}</p></div></TableCell>
                  <TableCell className="text-sm">{item.supplier}</TableCell>
                  <TableCell className="text-center font-mono">{item.currentStock}</TableCell>
                  <TableCell className="text-center font-mono">{item.leadTime}d</TableCell>
                  <TableCell className="text-center font-mono text-purple-600">{item.forecastDemand}</TableCell>
                  <TableCell className="text-center font-mono font-bold text-teal-600">{item.suggestedQuantity}</TableCell>
                  <TableCell className="text-center"><Badge className={priorityColors[item.priority]}>{item.priority}</Badge></TableCell>
                  <TableCell className="text-center"><div className="flex items-center justify-center gap-2"><span className="text-xs font-mono">{item.stockoutRisk}%</span><div className="h-1.5 w-12 rounded-full bg-slate-200"><div className={`h-1.5 rounded-full ${item.stockoutRisk > 70 ? "bg-red-500" : item.stockoutRisk > 40 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${Math.min(item.stockoutRisk, 100)}%` }} /></div></div></TableCell>
                  <TableCell className="text-center"><div className="flex items-center justify-center gap-1">
                    <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-purple-600"><HelpCircle className="h-4 w-4" /></Button></SheetTrigger>
                      <SheetContent side="right" className="w-[420px] sm:w-[540px]"><SheetHeader><SheetTitle>Why reorder {item.product}?</SheetTitle></SheetHeader>
                        <div className="mt-6 space-y-4"><div className="rounded-lg bg-purple-50 p-4"><p className="font-medium text-purple-900">📊 Formula</p><div className="mt-2 rounded bg-white p-3 font-mono text-sm">(Forecast × Lead Time) + Safety Stock − Current Stock</div>
                          <div className="mt-3 space-y-1 text-sm"><div className="flex justify-between border-b py-1"><span className="text-slate-500">Forecast</span><span className="font-bold">{item.forecastDemand}</span></div><div className="flex justify-between border-b py-1"><span className="text-slate-500">Lead Time</span><span className="font-bold">{item.leadTime}d</span></div><div className="flex justify-between border-b py-1"><span className="text-slate-500">Current Stock</span><span className="font-bold">{item.currentStock}</span></div><Separator className="my-2" /><div className="flex justify-between"><span className="font-semibold text-purple-900">Suggested</span><span className="text-xl font-bold text-purple-700">{item.suggestedQuantity}</span></div></div></div></div></SheetContent></Sheet>
                    <Dialog><DialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-teal-600" onClick={() => handleSimulate(item)}><Play className="h-4 w-4" /></Button></DialogTrigger>
                      <DialogContent><DialogHeader><DialogTitle>Simulated Reorder Impact</DialogTitle></DialogHeader>{simulatedItem && simulationResult && (<div className="space-y-4 py-4"><div className="grid grid-cols-2 gap-4"><div className="rounded-lg bg-slate-50 p-4 text-center"><p className="text-sm text-slate-500">Current Stock</p><p className="text-2xl font-bold text-red-600">{simulatedItem.currentStock}</p></div><div className="rounded-lg bg-slate-50 p-4 text-center"><p className="text-sm text-slate-500">After Reorder</p><p className="text-2xl font-bold text-green-600">{simulationResult.newStock}</p></div></div><Alert className={simulationResult.newRisk < 30 ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>{simulationResult.newRisk < 30 ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}<AlertTitle>{simulationResult.newRisk < 30 ? "Risk reduced!" : "Risk remains moderate"}</AlertTitle></Alert></div>)}<DialogFooter><Button onClick={() => {}}>Close</Button></DialogFooter></DialogContent></Dialog>
                  </div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Total to Reorder</p><p className="text-2xl font-bold">{recommendations.reduce((s, r) => s + r.suggestedQuantity, 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Critical Items</p><p className="text-2xl font-bold text-red-600">{recommendations.filter(r => r.priority === "Critical").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Total Order Value</p><p className="text-2xl font-bold">£{recommendations.reduce((s, r) => s + r.suggestedQuantity * r.unitCost, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-slate-500">Avg. Stockout Risk</p><p className="text-2xl font-bold">{Math.round(recommendations.reduce((s, r) => s + r.stockoutRisk, 0) / recommendations.length)}%</p></CardContent></Card>
      </div>
    </div>
  );
}