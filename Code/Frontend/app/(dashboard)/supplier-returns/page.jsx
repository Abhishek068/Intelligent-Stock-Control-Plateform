"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Undo2, ArrowUpLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { stockApi, suppliersApi, productsApi, locationsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

function StatusBadge({ status }) {
  if (status === "draft") {
    return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 shadow-inner px-2.5 py-1">Draft</Badge>;
  }
  if (status === "shipped") {
    return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)] px-2.5 py-1 animate-pulse">Shipped</Badge>;
  }
  if (status === "completed") {
    return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-inner px-2.5 py-1">Completed</Badge>;
  }
  if (status === "cancelled") {
    return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-inner px-2.5 py-1">Cancelled</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

function SupplierReturnsPageContent() {
  const router = useRouter();
  const [returns, setReturns] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    supplierId: "",
    locationId: "",
    reason: "",
    productId: "",
    batchId: "",
    quantity: 1,
    unitCost: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const [rows, sups, prods, locs] = await Promise.all([
        stockApi.listSupplierReturns(params),
        suppliersApi.list().catch(() => []),
        productsApi.list().catch(() => []),
        locationsApi.list().catch(() => []),
      ]);
      setReturns(rows);
      setSuppliers(sups);
      setProducts(prods);
      setLocations(locs);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to load returns");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!form.productId || !form.locationId) {
      setBatches([]);
      return;
    }
    stockApi
      .listBatches({
        product: form.productId,
        location: form.locationId,
        active_only: true,
      })
      .then(setBatches)
      .catch(() => setBatches([]));
  }, [form.productId, form.locationId]);

  const createReturn = async () => {
    if (!form.supplierId || !form.locationId || !form.reason || !form.productId) {
      toast.error("Supplier, location, reason and product are required");
      return;
    }
    setSaving(true);
    try {
      const res = await stockApi.createSupplierReturn({
        supplier: Number(form.supplierId),
        location: Number(form.locationId),
        reason: form.reason,
        line_items: [
          {
            product: Number(form.productId),
            batch: form.batchId ? Number(form.batchId) : null,
            quantity: Number(form.quantity),
            unit_cost: form.unitCost ? Number(form.unitCost) : undefined,
          },
        ],
      });
      toast.success("Return draft created");
      setOpen(false);
      const id = res?.data?.id || res?.id;
      if (id) router.push(`/supplier-returns/${id}`);
      else load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to create return");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
     
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-rose-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-rose-500/20 rounded-xl border border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
              <Undo2 className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Supplier Returns
            </h1>
          </div>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Return damaged, defective, or expired goods to suppliers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline"
            onClick={load} 
            disabled={loading}
            className="bg-slate-900/50 border-white/10 hover:bg-white/10 text-slate-200 hover:text-white backdrop-blur-xl rounded-xl transition-all shadow-lg shadow-black/20"
          >
            <RefreshCw className={`mr-2 h-4 w-4 text-rose-400 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-semibold rounded-xl px-5 shadow-lg shadow-rose-500/25 border border-rose-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]">
                <Plus className="mr-2 h-4 w-4" /> New Return
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl bg-[#0F172A] border border-rose-500/30 shadow-[0_0_50px_rgba(244,63,94,0.15)] rounded-2xl p-0 overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
              
              <DialogHeader className="p-6 pb-2">
                <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
                  <ArrowUpLeft className="h-6 w-6 text-rose-400" />
                  Create Supplier Return
                </DialogTitle>
              </DialogHeader>

              <div className="px-6 py-4 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-300">Supplier <span className="text-rose-400">*</span></Label>
                    <Select value={form.supplierId} onValueChange={(v) => setForm((f) => ({ ...f, supplierId: v }))}>
                      <SelectTrigger className="w-full bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 h-11 rounded-xl font-medium">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 shadow-2xl rounded-xl text-slate-200">
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)} className="focus:bg-rose-500/20 focus:text-rose-200">{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-300">Location <span className="text-rose-400">*</span></Label>
                    <Select value={form.locationId} onValueChange={(v) => setForm((f) => ({ ...f, locationId: v, batchId: "" }))}>
                      <SelectTrigger className="w-full bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 h-11 rounded-xl font-medium">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 shadow-2xl rounded-xl text-slate-200">
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={String(l.id)} className="focus:bg-rose-500/20 focus:text-rose-200">{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-300">Product <span className="text-rose-400">*</span></Label>
                  <Select value={form.productId} onValueChange={(v) => setForm((f) => ({ ...f, productId: v, batchId: "" }))}>
                    <SelectTrigger className="w-full bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 h-11 rounded-xl font-medium">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 shadow-2xl rounded-xl text-slate-200">
                      {products.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)} className="focus:bg-rose-500/20 focus:text-rose-200">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-300">Batch (optional)</Label>
                  <Select value={form.batchId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, batchId: v === "none" ? "" : v }))}>
                    <SelectTrigger className="w-full bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 h-11 rounded-xl font-medium">
                      <SelectValue placeholder="Any / FEFO" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 shadow-2xl rounded-xl text-slate-200">
                      <SelectItem value="none" className="focus:bg-rose-500/20 focus:text-rose-200">Any / FEFO</SelectItem>
                      {batches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)} className="focus:bg-rose-500/20 focus:text-rose-200">
                          {b.batch_number} ({b.quantity_on_hand})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-300">Quantity <span className="text-rose-400">*</span></Label>
                    <Input
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                      className="w-full bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 h-11 rounded-xl font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-300">Unit cost (£)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.unitCost}
                      onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))}
                      className="w-full bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 h-11 rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-300">Reason for Return <span className="text-rose-400">*</span></Label>
                  <Textarea
                    value={form.reason}
                    onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                    rows={2}
                    placeholder="e.g. Expired, damaged in transit, etc."
                    className="w-full bg-slate-900 border-white/10 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 rounded-xl resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 px-1 text-xs text-slate-400">
                  <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                  This will create a draft. No stock is moved until the return is shipped.
                </div>
              </div>

              <DialogFooter className="px-6 pb-6 pt-2 flex gap-3 sm:justify-end">
                <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl px-5">
                  Cancel
                </Button>
                <Button onClick={createReturn} disabled={saving} className="bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl px-6 shadow-lg shadow-rose-500/25">
                  {saving ? "Saving..." : "Create Draft"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="px-8 py-5 border-b border-white/5 bg-slate-950/20 relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-lg">
            <Undo2 className="h-5 w-5 text-rose-400" /> 
            Returns Ledger
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] bg-slate-950/50 border-white/10 focus:border-rose-500/50 text-slate-200 rounded-xl h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-white/10 shadow-xl rounded-xl text-slate-200">
              <SelectItem value="all" className="focus:bg-rose-500/20 focus:text-rose-200">All statuses</SelectItem>
              <SelectItem value="draft" className="focus:bg-rose-500/20 focus:text-rose-200">Draft</SelectItem>
              <SelectItem value="shipped" className="focus:bg-rose-500/20 focus:text-rose-200">Shipped</SelectItem>
              <SelectItem value="completed" className="focus:bg-rose-500/20 focus:text-rose-200">Completed</SelectItem>
              <SelectItem value="cancelled" className="focus:bg-rose-500/20 focus:text-rose-200">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto relative z-10">
            <Table>
              <TableHeader className="bg-slate-950/40 border-b border-white/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 pl-8 font-semibold text-slate-300">ID</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Supplier</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Location</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Status</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Reason</TableHead>
                  <TableHead className="py-4 pr-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-12">
                      <div className="animate-pulse flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-rose-400" />
                        Loading returns...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : returns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-12">
                      <div className="flex flex-col items-center justify-center">
                        <Undo2 className="h-10 w-10 text-slate-600 mb-3" />
                        <p>No supplier returns found.</p>
                        {statusFilter !== "all" && <p className="text-sm mt-1">Try changing the status filter.</p>}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  returns.map((r) => (
                    <TableRow key={r.id} className="hover:bg-slate-800/40 transition-colors border-b border-white/5 group">
                      <TableCell className="pl-8 py-5">
                        <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono text-sm font-semibold shadow-inner">
                          #{r.id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-200">{r.supplier_name}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-300">{r.location_name}</span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="max-w-[240px]">
                        <span className="truncate block text-slate-400 text-sm">{r.reason}</span>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          asChild
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20"
                        >
                          <Link href={`/supplier-returns/${r.id}`}>Open Detail</Link>
                        </Button>
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

export default function SupplierReturnsPage() {
  return (
    <ModuleGate module="stock_out" action="view">
      <SupplierReturnsPageContent />
    </ModuleGate>
  );
}
