"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, MoreHorizontal, Truck, Package, Sparkles, ShieldAlert, ShieldCheck, Activity, Clock, Award } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { suppliersApi, productsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const COLORS = ["#0D9488", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#6366F1"];

const emptyForm = {
  name: "",
  contact_name: "",
  email: "",
  phone: "",
  address: "",
  lead_time_days: 3,
  status: "active"
};

export default function SuppliersPage() {
  const { canEdit, hasPermission, isSuperAdmin } = useRoleAccess();
  const canManage =
    isSuperAdmin || hasPermission("suppliers", "create") || hasPermission("suppliers", "edit") || canEdit;
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [selectedSupplierProducts, setSelectedSupplierProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupResults, setLookupResults] = useState([]);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const handleProductLookup = async () => {
    if (!lookupQuery.trim()) return;
    setIsLookingUp(true);
    try {
      const results = await productsApi.list({ search: lookupQuery });
      setLookupResults(results);
    } catch {
      toast.error("Lookup failed");
    } finally {
      setIsLookingUp(false);
    }
  };

  const openProductsModal = async (sup) => {
    setViewingSupplier(sup);
    setLoadingProducts(true);
    try {
      const products = await productsApi.list({ supplier: sup.id });
      setSelectedSupplierProducts(products);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  };

  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [riskData, setRiskData] = useState(null);
  const [loadingRisk, setLoadingRisk] = useState(false);

  const openRiskAnalytics = async (sup) => {
    setRiskModalOpen(true);
    setLoadingRisk(true);
    try {
      const res = await suppliersApi.getRiskAnalytics(sup.id);
      setRiskData(res?.data || res);
    } catch (err) {
      toast.error("Failed to load risk analytics");
    } finally {
      setLoadingRisk(false);
    }
  };

  const loadSuppliers = useCallback(async () => {

    setLoading(true);
    try {
      setSuppliers(await suppliersApi.list());
    } catch {
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (sup) => {
    setEditing(sup);
    setForm({
      name: sup.name,
      contact_name: sup.contact_name || "",
      email: sup.email || "",
      phone: sup.phone || "",
      address: sup.address || "",
      lead_time_days: sup.lead_time_days ?? 3,
      status: sup.status || "active"
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await suppliersApi.update(editing.id, form);
        toast.success("Supplier updated");
      } else {
        await suppliersApi.create(form);
        toast.success("Supplier created");
      }
      setDialogOpen(false);
      loadSuppliers();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sup) => {
    if (!confirm(`Delete supplier "${sup.name}"?`)) return;
    try {
      await suppliersApi.delete(sup.id);
      toast.success("Supplier deleted");
      loadSuppliers();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Delete failed");
    }
  };

  const avgContractDays = suppliers.length > 0
    ? (suppliers.reduce((acc, s) => acc + (s.lead_time_days || 0), 0) / suppliers.length).toFixed(1)
    : "0.0";

  const avgPredictedDays = suppliers.length > 0
    ? (suppliers.reduce((acc, s) => acc + (s.predicted_lead_time_info?.predicted_lead_time_days || s.lead_time_days || 0), 0) / suppliers.length).toFixed(1)
    : "0.0";

  const delayedSuppliersCount = suppliers.filter(
    (s) => (s.predicted_lead_time_info?.delay_bias_days || 0) > 1.0
  ).length;

  const avgPerformanceScore = suppliers.length > 0
    ? (suppliers.reduce((acc, s) => acc + Number(s.performance_score || 95), 0) / suppliers.length).toFixed(0)
    : "95";

  const avgDeliveryRate = suppliers.length > 0
    ? (suppliers.reduce((acc, s) => acc + Number(s.delivery_rate || s.delivery_reliability || (s.performance_score ? s.performance_score * 0.98 : 95)), 0) / suppliers.length).toFixed(0)
    : "95";

  const avgOrderAccuracy = suppliers.length > 0
    ? (suppliers.reduce((acc, s) => acc + Number(s.order_accuracy || (s.performance_score ? s.performance_score * 0.99 : 98)), 0) / suppliers.length).toFixed(0)
    : "98";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/20 rounded-xl border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]">
              <Truck className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-slate-50 dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              Supplier Management
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Manage your supply chain partners, track lead times, and monitor supplier performance metrics.
          </p>
        </div>

        {canManage && (
          <div className="flex gap-3">
            <Button 
              onClick={() => { setLookupOpen(true); setLookupQuery(""); setLookupResults([]); }}
              className="bg-white dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold py-2 px-4 rounded-xl shadow-xs border border-slate-200 dark:border-white/10 transition-all duration-200 cursor-pointer"
            >
              <Package className="mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Find Product
            </Button>
            <Button 
              onClick={openCreate}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-2 px-4 rounded-xl shadow-md cursor-pointer transition-all duration-200"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Supplier
            </Button>
          </div>
        )}
      </div>

      {/* Separate Telemetry Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Lead Time & AI Delay Telemetry */}
        <Card className="glass-card flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/60 p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/5 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Supplier Lead Time & AI Delay Telemetry</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Contract vs AI-Predicted fulfillment lead times across suppliers</p>
            </div>
            <Badge variant="outline" className="bg-cyan-50 border-cyan-200 text-cyan-800 dark:bg-cyan-500/10 dark:border-cyan-500/30 dark:text-cyan-300 font-mono text-xs font-semibold">
              {avgContractDays}d Avg Lead Time
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-white/5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">Avg Contract Time</span>
              <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-slate-200">{avgContractDays}d</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-white/5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">AI Predicted Avg</span>
              <span className="text-lg font-extrabold font-mono text-cyan-600 dark:text-cyan-400">{avgPredictedDays}d</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-white/5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">High Delay Risk</span>
              <span className="text-lg font-extrabold font-mono text-rose-600 dark:text-rose-400">{delayedSuppliersCount} Suppliers</span>
            </div>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1.5 py-1">
            {suppliers.map((sup) => {
              const predInfo = sup.predicted_lead_time_info || {};
              const contractDays = sup.lead_time_days || 0;
              const predDays = predInfo.predicted_lead_time_days || contractDays;
              const delayBias = predInfo.delay_bias_days || 0;
              return (
                <div key={sup.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-white/5 hover:border-cyan-500/30 transition-colors space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-200 truncate max-w-[160px]">{sup.name}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Contract: {contractDays}d</span>
                      <span className={`font-bold px-2 py-0.5 rounded border ${
                        delayBias > 1
                          ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400"
                          : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                      }`}>
                        AI: {predDays.toFixed(1)}d
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Panel 2: Supplier Reliability & Performance Score */}
        <Card className="glass-card flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/60 p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/5 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Supplier Reliability & SLA Score</h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Delivery SLA, order accuracy, and composite performance benchmark</p>
            </div>
            <Badge variant="outline" className="bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-500/10 dark:border-purple-500/30 dark:text-purple-300 font-mono text-xs font-semibold">
              {avgPerformanceScore}% Avg Score
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-white/5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">Composite Score</span>
              <span className="text-lg font-extrabold font-mono text-purple-600 dark:text-purple-400">{avgPerformanceScore}%</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-white/5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">Delivery Rate</span>
              <span className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400">{avgDeliveryRate}%</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-white/5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold">Order Accuracy</span>
              <span className="text-lg font-extrabold font-mono text-cyan-600 dark:text-cyan-400">{avgOrderAccuracy}%</span>
            </div>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1.5 py-1">
            {suppliers.map((sup) => {
              const score = Number(sup.performance_score || 95);
              const delRate = Number(sup.delivery_rate || sup.delivery_reliability || (score ? score * 0.98 : 95));
              const acc = Number(sup.order_accuracy || (score ? score * 0.99 : 98));
              return (
                <div key={sup.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-white/5 hover:border-purple-500/30 transition-colors space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900 dark:text-slate-200 truncate max-w-[160px]">{sup.name}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Del {delRate.toFixed(0)}% · Acc {acc.toFixed(0)}%</span>
                      <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-500/20">{score.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="p-6 border-b border-slate-200/80 dark:border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between relative z-10">
            <div className="relative w-full max-w-md group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" />
              <Input
                placeholder="Search suppliers by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl h-10"
              />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400 font-semibold px-4 py-2 bg-slate-100 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 rounded-xl">
              Total Suppliers: <span className="text-slate-900 dark:text-slate-200 font-bold">{suppliers.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto relative z-10">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-white/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 pl-8 font-bold text-slate-700 dark:text-slate-300">Supplier</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Contact</TableHead>
                  <TableHead className="py-4 text-center font-bold text-slate-700 dark:text-slate-300">Products</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
                  {canManage && <TableHead className="w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 5 : 4} className="text-center text-slate-500 dark:text-slate-400 py-12">
                      <div className="animate-pulse">Loading suppliers...</div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 5 : 4} className="text-center text-slate-500 dark:text-slate-400 py-12">
                      No suppliers found matching "{searchQuery}"
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((sup, idx) => {
                    const color = COLORS[idx % COLORS.length];
                    return (
                      <TableRow key={sup.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-200/60 dark:border-white/5 group">
                        <TableCell className="pl-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <Avatar className="h-11 w-11 ring-1 ring-slate-200 dark:ring-white/10 shadow-sm" style={{ backgroundColor: `${color}15` }}>
                                <AvatarFallback style={{ color }} className="font-bold bg-transparent text-sm">
                                  {sup.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute inset-0 rounded-full blur-[10px] opacity-30 -z-10" style={{ backgroundColor: color }} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-slate-200 text-[15px]">{sup.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">ID: {sup.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-300">{sup.contact_name || "—"}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{sup.email || "—"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline" 
                            className="bg-slate-100 dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 px-3 py-1 font-semibold cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                            onClick={() => openProductsModal(sup)}
                          >
                            {sup.product_count ?? 0} Products
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={sup.status === "active" ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 font-semibold" : "bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20 font-semibold"}>
                            {sup.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell className="pr-6 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 hover:text-slate-200">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 shadow-xl backdrop-blur-xl rounded-xl">
                                <DropdownMenuItem onClick={() => openRiskAnalytics(sup)} className="hover:bg-purple-500/10 cursor-pointer text-purple-300">
                                  <Sparkles className="mr-2 h-4 w-4 text-purple-400" /> AI Risk Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(sup)} className="hover:bg-white/5 cursor-pointer text-slate-300">
                                  <Pencil className="mr-2 h-4 w-4 text-indigo-400" /> Edit Supplier
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(sup)} className="hover:bg-rose-500/10 cursor-pointer text-rose-400 focus:text-rose-400 focus:bg-rose-500/10">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete Supplier
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl bg-white dark:bg-[#0F172A] border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Company Name <span className="text-rose-500">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Contact Name</Label>
              <Input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Phone</Label>
              <Input 
                value={form.phone} 
                onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Lead Time (days)</Label>
              <Input
                type="number"
                min="0"
                value={form.lead_time_days}
                onChange={(e) => setForm({ ...form, lead_time_days: parseInt(e.target.value) || 0 })}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Address</Label>
              <Input 
                value={form.address} 
                onChange={(e) => setForm({ ...form, address: e.target.value })} 
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl rounded-xl text-slate-800 dark:text-slate-200">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-200 dark:border-white/5 pt-4 mt-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl cursor-pointer">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium shadow-md rounded-xl cursor-pointer"
            >
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Products Modal */}
      <Dialog open={!!viewingSupplier} onOpenChange={(open) => !open && setViewingSupplier(null)}>
        <DialogContent className="sm:max-w-[600px] bg-white dark:bg-[#0F172A] border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl flex flex-col max-h-[85vh] text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Products from {viewingSupplier?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-4 min-h-[150px]">
            {loadingProducts ? (
              <div className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400 py-12">
                <div className="animate-pulse flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-indigo-500/50 animate-bounce" />
                  Loading products...
                </div>
              </div>
            ) : selectedSupplierProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 flex flex-col items-center gap-3">
                <Package className="h-10 w-10 text-slate-400" />
                <p>No products supplied by this supplier.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedSupplierProducts.map(p => (
                  <div key={p.id} className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-xl flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-900/60 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-indigo-200 dark:border-indigo-500/20 shadow-2xs">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-slate-200 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">{p.name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">SKU: {p.sku}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-300">
                        Stock: <span className={p.stock > 0 ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-rose-600 dark:text-rose-400 font-bold"}>{p.stock}</span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5 font-semibold">£{Number(p.unit_price).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-slate-200 dark:border-white/5 pt-4 mt-2">
            <Button variant="ghost" onClick={() => setViewingSupplier(null)} className="hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl cursor-pointer">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Lookup Modal */}
      <Dialog open={lookupOpen} onOpenChange={setLookupOpen}>
        <DialogContent className="sm:max-w-[650px] bg-white dark:bg-[#0F172A] border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl flex flex-col max-h-[85vh] text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> Product & Supplier Lookup
            </DialogTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400">Search for any product to instantly see who supplies it and its details.</p>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter product name, SKU, or barcode..."
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleProductLookup()}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 h-11 rounded-xl"
              />
              <Button 
                onClick={handleProductLookup} 
                disabled={isLookingUp}
                className="bg-indigo-600 hover:bg-indigo-500 text-white h-11 rounded-xl px-6 cursor-pointer"
              >
                {isLookingUp ? "Searching..." : "Search"}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 space-y-3">
              {lookupResults.length === 0 && !isLookingUp && lookupQuery && (
                <div className="text-center py-8 text-slate-500">No products found matching "{lookupQuery}"</div>
              )}
              {lookupResults.map((p) => {
                const supplier = suppliers.find(s => s.id === p.supplier_id);
                return (
                  <div key={p.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-200 text-lg">{p.name}</h4>
                        <p className="text-sm text-slate-500 font-mono">SKU: {p.sku}</p>
                      </div>
                      <Badge className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 px-3 py-1 text-sm font-semibold">
                        Supplied by: {p.supplier_name || "Unknown"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 pt-3 border-t border-slate-200 dark:border-white/5">
                      <div className="bg-white dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                        <p className="text-xs text-slate-500 mb-1 font-semibold">Current Stock</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-200">{p.stock}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                        <p className="text-xs text-slate-500 mb-1 font-semibold">Unit Value</p>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">£{Number(p.unit_price).toFixed(2)}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                        <p className="text-xs text-slate-500 mb-1 font-semibold">Delivery Time</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-200">
                          {supplier ? `${supplier.lead_time_days} days` : "Unknown"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Risk Analytics Dialog */}
      <Dialog open={riskModalOpen} onOpenChange={setRiskModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white dark:bg-[#0F172A] border-purple-300 dark:border-purple-500/30 text-slate-900 dark:text-white shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span>AI Supplier Risk & Lead-Time Analytics</span>
            </DialogTitle>
          </DialogHeader>

          {loadingRisk ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 animate-pulse">Running Random Forest Risk Assessment...</div>
          ) : riskData ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-white/10">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Supplier Name</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{riskData.supplier_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Dynamic Risk Score</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                    riskData.current_risk_assessment?.risk_level === "low" ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30" :
                    riskData.current_risk_assessment?.risk_level === "medium" ? "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30" :
                    riskData.current_risk_assessment?.risk_level === "high" ? "bg-orange-50 text-orange-800 border border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30" :
                    "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30"
                  }`}>
                    {riskData.current_risk_assessment?.risk_level} ({riskData.current_risk_assessment?.risk_score}/100)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-white/5">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Baseline Lead Time</p>
                  <p className="text-base font-bold text-slate-900 dark:text-slate-200 mt-1">{riskData.lead_time_days} Days</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-white/5">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Delivery Reliability</p>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">{riskData.delivery_reliability}%</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-white/5">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Delay Prob (Standard PO)</p>
                  <p className="text-base font-bold text-purple-600 dark:text-purple-400 mt-1">{riskData.current_risk_assessment?.delay_probability}%</p>
                </div>
              </div>

              {riskData.current_risk_assessment?.risk_factors?.drivers?.length > 0 && (
                <div className="space-y-2 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-500/20 p-3.5 rounded-xl">
                  <p className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider">Predictive Risk Drivers</p>
                  <div className="space-y-1.5">
                    {riskData.current_risk_assessment.risk_factors.drivers.map((driver, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <Activity className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-200">{driver.factor}:</span> {driver.impact}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
