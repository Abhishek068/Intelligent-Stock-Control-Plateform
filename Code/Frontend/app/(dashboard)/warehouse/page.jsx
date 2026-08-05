"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, Warehouse, Search, Building2, CheckCircle2, Layers } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { locationsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRoleAccess } from "@/hooks/useRoleAccess";

export default function WarehousesPage() {
  const { canEdit, isSuperAdmin, hasPermission } = useRoleAccess();
  const canManage =
    isSuperAdmin ||
    hasPermission("products", "create") ||
    hasPermission("products", "edit") ||
    canEdit;

  const [warehouses, setWarehouses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "warehouse",
    address: "",
    capacity: "",
  });

  const mapLocation = (l) => ({
    id: String(l.id),
    name: l.name,
    capacity: l.capacity ?? 0,
    status: l.is_active ? "active" : "inactive",
    type: l.location_type,
    address: l.address || "",
    is_active: l.is_active,
  });

  const load = useCallback(async () => {
    try {
      const locations = await locationsApi.list();
      setWarehouses(locations.map(mapLocation));
    } catch {
      setWarehouses([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = warehouses.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id) => {
    try {
      await locationsApi.delete(id);
      toast.success("Location deleted");
      load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Delete failed");
    }
  };

  const handleToggle = async (wh) => {
    try {
      await locationsApi.update(wh.id, { is_active: !wh.is_active });
      toast.success("Status updated");
      load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Update failed");
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const payload = {
      name: formData.name,
      location_type: formData.type === "retail" ? "store" : formData.type,
      address: formData.address,
      capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
      is_active: true,
    };
    try {
      if (editingWarehouse) {
        await locationsApi.update(editingWarehouse.id, payload);
        toast.success("Location updated");
      } else {
        await locationsApi.create(payload);
        toast.success("Location added");
      }
      setIsDialogOpen(false);
      setEditingWarehouse(null);
      setFormData({ name: "", type: "warehouse", address: "", capacity: "" });
      load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      type: warehouse.type || "warehouse",
      address: warehouse.address || "",
      capacity: warehouse.capacity ? String(warehouse.capacity) : "",
    });
    setIsDialogOpen(true);
  };
  
  const openCreateDialog = () => {
    setEditingWarehouse(null);
    setFormData({
      name: "",
      type: "warehouse",
      address: "",
      capacity: "",
    });
    setIsDialogOpen(true);
  };

  const stats = {
    total: warehouses.length,
    active: warehouses.filter((w) => w.is_active).length,
    capacity: warehouses.reduce((s, w) => s + (Number(w.capacity) || 0), 0),
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Warehouse className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Warehouse Management
            </h1>
          </div>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Manage your physical storage locations, track active warehouses, and monitor total storage capacity across the entire supply chain.
          </p>
        </div>

        {canManage && (
          <Button 
            onClick={openCreateDialog}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-indigo-500/50"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Location
          </Button>
        )}
      </div>

      {/* Advanced Stats Grid - Full Width */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
        {/* Total Locations */}
        <Card className="bg-slate-900/40 backdrop-blur-xl border-blue-500/20 shadow-lg relative overflow-hidden group rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Locations</p>
                <p className="text-4xl font-extrabold text-slate-100 mt-2">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 ring-1 ring-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <Building2 className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Live System Data
            </div>
          </CardContent>
        </Card>

        {/* Active Locations */}
        <Card className="bg-slate-900/40 backdrop-blur-xl border-emerald-500/20 shadow-lg relative overflow-hidden group rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Active</p>
                <p className="text-4xl font-extrabold text-slate-100 mt-2">{stats.active}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 ring-1 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Operational Nodes
            </div>
          </CardContent>
        </Card>

        {/* Total Capacity */}
        <Card className="bg-slate-900/40 backdrop-blur-xl border-amber-500/20 shadow-lg relative overflow-hidden group rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Total Capacity</p>
                <p className="text-4xl font-extrabold text-slate-100 mt-2">{stats.capacity.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 ring-1 ring-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Layers className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Total Available Units
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />

        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between relative z-10">
            <div className="relative w-full max-w-md group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
              <Input
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-950/50 border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all rounded-xl h-10"
              />
            </div>
            <div className="text-sm text-slate-400 font-medium px-4 py-2 bg-slate-950/50 border border-white/5 rounded-lg shadow-inner">
              Listed Locations: <span className="text-slate-200">{filtered.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto relative z-10">
            <Table>
              <TableHeader className="bg-slate-950/40 border-b border-white/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 pl-8 font-semibold text-slate-300">Name</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Type</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Capacity</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Status</TableHead>
                  {canManage && <TableHead className="w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 5 : 4} className="text-center text-slate-400 py-12">
                      No locations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((wh) => (
                    <TableRow key={wh.id} className="hover:bg-slate-800/40 transition-colors border-b border-white/5 group">
                      <TableCell className="pl-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400">
                            <Warehouse className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-200 text-[15px]">{wh.name}</div>
                            {wh.address && (
                              <div className="text-xs text-slate-500 mt-0.5">{wh.address}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize text-slate-300 font-medium">{wh.type}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-950/50 border-white/10 text-slate-300 px-3 py-1 font-medium shadow-inner">
                          {wh.capacity ? wh.capacity.toLocaleString() : "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={wh.is_active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20"}>
                          {wh.is_active ? "ACTIVE" : "INACTIVE"}
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
                              <DropdownMenuLabel className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openEditDialog(wh)} className="hover:bg-white/5 cursor-pointer text-slate-300">
                                <Pencil className="mr-2 h-4 w-4 text-indigo-400" /> Edit Location
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggle(wh)} className="hover:bg-white/5 cursor-pointer text-slate-300">
                                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400" /> {wh.is_active ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(wh.id)} className="hover:bg-rose-500/10 cursor-pointer text-rose-400 focus:text-rose-400 focus:bg-rose-500/10">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal - Crisp text rendering without backdrop-blur */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#0F172A] border-white/10 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {editingWarehouse ? "Edit Location" : "Add Location"}
            </DialogTitle>
            <DialogDescription className="text-slate-400 mt-1">
              Locations are used for stock in, out, transfers, and PO receive.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-200">Name <span className="text-rose-400">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Warehouse D"
                className="bg-slate-950 border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-slate-100 font-medium rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-200">Type <span className="text-rose-400">*</span></Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger className="bg-slate-950 border-white/10 focus:border-indigo-500/50 text-slate-100 font-medium rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 shadow-xl rounded-xl text-slate-200">
                  <SelectItem value="warehouse" className="focus:bg-indigo-500/20 focus:text-indigo-300">Warehouse</SelectItem>
                  <SelectItem value="store" className="focus:bg-indigo-500/20 focus:text-indigo-300">Store</SelectItem>
                  <SelectItem value="office" className="focus:bg-indigo-500/20 focus:text-indigo-300">Office</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-200">Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address"
                className="bg-slate-950 border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-slate-100 font-medium rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-200">Capacity (units)</Label>
              <Input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder="e.g., 10000"
                className="bg-slate-950 border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-slate-100 font-medium rounded-lg"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 border-t border-white/5 pt-4 mt-2">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="hover:bg-white/5 text-slate-300 hover:text-white rounded-xl">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={saving}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium shadow-lg shadow-indigo-500/20 rounded-xl border border-indigo-500/50"
            >
              {saving ? "Saving..." : editingWarehouse ? "Save Changes" : "Create Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
