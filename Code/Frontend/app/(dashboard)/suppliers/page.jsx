"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, MoreHorizontal, Truck, Package } from "lucide-react";
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Truck className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Supplier Management
            </h1>
          </div>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Manage your supply chain partners, track lead times, and monitor supplier performance metrics.
          </p>
        </div>

        {canManage && (
          <div className="flex gap-3">
            <Button 
              onClick={() => { setLookupOpen(true); setLookupQuery(""); setLookupResults([]); }}
              className="bg-slate-900/50 hover:bg-slate-800 text-slate-200 font-semibold py-2 px-4 rounded-xl shadow-lg border border-white/10 transition-all duration-200"
            >
              <Package className="mr-2 h-4 w-4 text-indigo-400" /> Find Product
            </Button>
            <Button 
              onClick={openCreate}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-indigo-500/50"
            >
              <Plus className="mr-2 h-4 w-4" /> Add Supplier
            </Button>
          </div>
        )}
      </div>

      {/* Main Card */}
      <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between relative z-10">
            <div className="relative w-full max-w-md group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
              <Input
                placeholder="Search suppliers by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-950/50 border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all rounded-xl h-10"
              />
            </div>
            <div className="text-sm text-slate-400 font-medium px-4 py-2 bg-slate-950/50 border border-white/5 rounded-lg shadow-inner">
              Total Suppliers: <span className="text-slate-200">{suppliers.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto relative z-10">
            <Table>
              <TableHeader className="bg-slate-950/40 border-b border-white/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 pl-8 font-semibold text-slate-300">Supplier</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Contact</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Lead Time</TableHead>
                  <TableHead className="py-4 text-center font-semibold text-slate-300">Performance</TableHead>
                  <TableHead className="py-4 text-center font-semibold text-slate-300">Products</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Status</TableHead>
                  {canManage && <TableHead className="w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 7 : 6} className="text-center text-slate-400 py-12">
                      <div className="animate-pulse">Loading suppliers...</div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 7 : 6} className="text-center text-slate-400 py-12">
                      No suppliers found matching "{searchQuery}"
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((sup, idx) => {
                    const color = COLORS[idx % COLORS.length];
                    return (
                      <TableRow key={sup.id} className="hover:bg-slate-800/40 transition-colors border-b border-white/5 group">
                        <TableCell className="pl-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <Avatar className="h-11 w-11 ring-1 ring-white/10 shadow-lg" style={{ backgroundColor: `${color}15` }}>
                                <AvatarFallback style={{ color }} className="font-bold bg-transparent text-sm">
                                  {sup.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute inset-0 rounded-full blur-[10px] opacity-30 -z-10" style={{ backgroundColor: color }} />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-200 text-[15px]">{sup.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">ID: {sup.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-slate-300">{sup.contact_name || "—"}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{sup.email || "—"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-900/50 border border-white/5 text-slate-300 text-sm font-medium shadow-inner">
                            {sup.lead_time_days}d
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="text-sm font-semibold text-slate-200">{Number(sup.performance_score || 0).toFixed(0)}%</div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Del {Number(sup.delivery_rate || 0).toFixed(0)}% · Acc {Number(sup.order_accuracy || 0).toFixed(0)}%
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline" 
                            className="bg-slate-950/50 border-white/10 text-slate-300 px-3 py-1 font-medium shadow-inner cursor-pointer hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-300 transition-colors"
                            onClick={() => openProductsModal(sup)}
                          >
                            {sup.product_count ?? 0} Products
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={sup.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"}>
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

      {/* Modal - Crisp text rendering without backdrop-blur */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[525px] bg-[#0F172A] border-white/10 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {editing ? "Edit Supplier" : "Add Supplier"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-sm font-semibold text-slate-200">Name <span className="text-rose-400">*</span></Label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                className="bg-slate-950 border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-slate-100 font-medium rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-200">Contact Name</Label>
              <Input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                className="bg-slate-950 border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-slate-100 font-medium rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-200">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="bg-slate-950 border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-slate-100 font-medium rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-200">Phone</Label>
              <Input 
                value={form.phone} 
                onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                className="bg-slate-950 border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-slate-100 font-medium rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-200">Lead Time (days)</Label>
              <Input
                type="number"
                min="0"
                value={form.lead_time_days}
                onChange={(e) => setForm({ ...form, lead_time_days: parseInt(e.target.value) || 0 })}
                className="bg-slate-950 border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-slate-100 font-medium rounded-lg"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-semibold text-slate-200">Address</Label>
              <Input 
                value={form.address} 
                onChange={(e) => setForm({ ...form, address: e.target.value })} 
                className="bg-slate-950 border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-slate-100 font-medium rounded-lg"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-sm font-semibold text-slate-200">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-slate-950 border-white/10 focus:border-indigo-500/50 text-slate-100 font-medium rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 shadow-xl rounded-xl text-slate-200">
                  <SelectItem value="active" className="focus:bg-indigo-500/20 focus:text-indigo-300">Active</SelectItem>
                  <SelectItem value="inactive" className="focus:bg-indigo-500/20 focus:text-indigo-300">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 border-t border-white/5 pt-4 mt-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="hover:bg-white/5 text-slate-300 hover:text-white rounded-xl">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium shadow-lg shadow-indigo-500/20 rounded-xl border border-indigo-500/50"
            >
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Products Modal */}
      <Dialog open={!!viewingSupplier} onOpenChange={(open) => !open && setViewingSupplier(null)}>
        <DialogContent className="sm:max-w-[600px] bg-[#0F172A] border-white/10 shadow-2xl rounded-2xl flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              Products from {viewingSupplier?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-4 min-h-[150px]">
            {loadingProducts ? (
              <div className="flex h-full items-center justify-center text-slate-400 py-12">
                <div className="animate-pulse flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-indigo-500/50 animate-bounce" />
                  Loading products...
                </div>
              </div>
            ) : selectedSupplierProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-3">
                <Package className="h-10 w-10 text-slate-600" />
                <p>No products supplied by this supplier.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedSupplierProducts.map(p => (
                  <div key={p.id} className="p-3 bg-slate-950/40 border border-white/5 rounded-xl flex items-center justify-between hover:bg-slate-900/60 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-xs border border-indigo-500/20 shadow-inner">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 text-sm group-hover:text-indigo-300 transition-colors">{p.name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">SKU: {p.sku}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-300">
                        Stock: <span className={p.stock > 0 ? "text-emerald-400" : "text-rose-400"}>{p.stock}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">£{Number(p.unit_price).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-white/5 pt-4 mt-2">
            <Button variant="ghost" onClick={() => setViewingSupplier(null)} className="hover:bg-white/5 text-slate-300 hover:text-white rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Lookup Modal */}
      <Dialog open={lookupOpen} onOpenChange={setLookupOpen}>
        <DialogContent className="sm:max-w-[650px] bg-[#0F172A] border-white/10 shadow-2xl rounded-2xl flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-400" /> Product & Supplier Lookup
            </DialogTitle>
            <p className="text-sm text-slate-400">Search for any product to instantly see who supplies it and its details.</p>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter product name, SKU, or barcode..."
                value={lookupQuery}
                onChange={(e) => setLookupQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleProductLookup()}
                className="bg-slate-950 border-white/10 focus:border-indigo-500/50 text-slate-100 h-11 rounded-xl"
              />
              <Button 
                onClick={handleProductLookup} 
                disabled={isLookingUp}
                className="bg-indigo-600 hover:bg-indigo-500 text-white h-11 rounded-xl px-6"
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
                  <div key={p.id} className="p-4 bg-slate-900/50 border border-white/5 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-slate-200 text-lg">{p.name}</h4>
                        <p className="text-sm text-slate-500 font-mono">SKU: {p.sku}</p>
                      </div>
                      <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3 py-1 text-sm shadow-inner">
                        Supplied by: {p.supplier_name || "Unknown"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 pt-3 border-t border-white/5">
                      <div className="bg-slate-950/50 p-3 rounded-lg border border-white/5">
                        <p className="text-xs text-slate-500 mb-1">Current Stock</p>
                        <p className="text-lg font-semibold text-slate-200">{p.stock}</p>
                      </div>
                      <div className="bg-slate-950/50 p-3 rounded-lg border border-white/5">
                        <p className="text-xs text-slate-500 mb-1">Unit Value</p>
                        <p className="text-lg font-semibold text-emerald-400">£{Number(p.unit_price).toFixed(2)}</p>
                      </div>
                      <div className="bg-slate-950/50 p-3 rounded-lg border border-white/5">
                        <p className="text-xs text-slate-500 mb-1">Delivery Time</p>
                        <p className="text-lg font-semibold text-slate-200">
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
    </div>
  );
}
