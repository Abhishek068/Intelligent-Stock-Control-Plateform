"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  MoreHorizontal,
  Building,
  User,
  Mail,
  Phone,
  Clock,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Award,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { suppliersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const emptyForm = {
  name: "",
  contact_name: "",
  email: "",
  phone: "",
  address: "",
  lead_time_days: 3,
  status: "active",
};

function SupplierKpiCard({ title, value, subtitle, icon: Icon, color, glowColor }) {
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

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.contact_name && s.contact_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Summary Metrics
  const activeCount = useMemo(() => suppliers.filter((s) => s.status === "active").length, [suppliers]);
  const avgLeadTime = useMemo(() => {
    if (!suppliers.length) return 0;
    const total = suppliers.reduce((sum, s) => sum + (s.lead_time_days || 0), 0);
    return Math.round(total / suppliers.length);
  }, [suppliers]);
  const avgPerformance = useMemo(() => {
    if (!suppliers.length) return 0;
    const total = suppliers.reduce((sum, s) => sum + (Number(s.performance_score) || 0), 0);
    return Math.round(total / suppliers.length);
  }, [suppliers]);

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
      status: sup.status || "active",
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
        toast.success("Supplier updated successfully");
      } else {
        await suppliersApi.create(form);
        toast.success("New supplier created");
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
      toast.success("Supplier removed");
      loadSuppliers();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Truck className="h-8 w-8 text-blue-400" /> Supplier Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track vendor contacts, lead times, order fulfillment accuracy, and performance ratings.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={openCreate}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/20"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Supplier
          </Button>
        )}
      </div>

      {/* KPI Cards Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SupplierKpiCard
          title="Total Vendors"
          value={suppliers.length.toLocaleString()}
          subtitle="Registered suppliers"
          icon={Building}
          color="bg-blue-500/10 text-blue-400 border-blue-500/20"
          glowColor="from-blue-500/20 to-transparent"
        />

        <SupplierKpiCard
          title="Active Partners"
          value={activeCount.toLocaleString()}
          subtitle={`${Math.round((activeCount / (suppliers.length || 1)) * 100)}% active rate`}
          icon={ShieldCheck}
          color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          glowColor="from-emerald-500/20 to-transparent"
        />

        <SupplierKpiCard
          title="Avg Lead Time"
          value={`${avgLeadTime} Days`}
          subtitle="Fulfillment turnaround"
          icon={Clock}
          color="bg-purple-500/10 text-purple-400 border-purple-500/20"
          glowColor="from-purple-500/20 to-transparent"
        />

        <SupplierKpiCard
          title="Avg Vendor Rating"
          value={`${avgPerformance}%`}
          subtitle="Delivery & order accuracy"
          icon={Award}
          color="bg-amber-500/10 text-amber-400 border-amber-500/20"
          glowColor="from-amber-500/20 to-transparent"
        />
      </div>

      {/* Main Table Card */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search suppliers by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-950/60 border-slate-800 text-white"
              />
            </div>
            <div className="text-xs text-slate-400 font-medium">
              Showing {filtered.length} of {suppliers.length} vendors
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Supplier Name</TableHead>
                  <TableHead className="text-slate-400">Contact Person</TableHead>
                  <TableHead className="text-slate-400">Lead Time</TableHead>
                  <TableHead className="text-slate-400 text-center">Fulfillment Rating</TableHead>
                  <TableHead className="text-slate-400 text-center">SKUs Supplied</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400 text-right pr-6 font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 7 : 6} className="text-center text-slate-400 py-8">
                      Loading suppliers...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 7 : 6} className="text-center text-slate-400 py-8">
                      No suppliers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((sup) => (
                    <TableRow key={sup.id} className="border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 bg-blue-500/10 border border-blue-500/20">
                            <AvatarFallback className="text-blue-400 font-bold text-xs">
                              {sup.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-white">{sup.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-slate-200">{sup.contact_name || "—"}</p>
                          <p className="text-xs text-slate-400">{sup.email || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-purple-500/30 text-purple-300 bg-purple-500/10 font-mono text-xs">
                          {sup.lead_time_days} days
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-sm font-bold text-emerald-400">
                          {Number(sup.performance_score || 0).toFixed(0)}%
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Delivery {Number(sup.delivery_rate || 0).toFixed(0)}% · Accuracy {Number(sup.order_accuracy || 0).toFixed(0)}%
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold text-slate-200">
                        {sup.product_count ?? 0}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            sup.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                          }
                        >
                          {sup.status}
                        </Badge>
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(sup)}
                              className="h-8 px-2.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 border border-blue-500/20"
                            >
                              <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(sup)}
                              className="h-8 px-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20"
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                            </Button>
                          </div>
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

      {/* Advanced Glassmorphism Add/Edit Supplier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-slate-900/95 border-slate-800 text-white backdrop-blur-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-400" />
              {editing ? "Edit Supplier Details" : "Add New Supplier"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Configure vendor contact information, expected lead times, and status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Field: Name */}
            <div>
              <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Building className="h-3.5 w-3.5 text-blue-400" /> Supplier Name *
              </Label>
              <Input
                placeholder="e.g. Apex Industrial Components Ltd."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-slate-950/70 border-slate-800 text-white focus:border-blue-500"
              />
            </div>

            {/* Field: Contact & Email */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <User className="h-3.5 w-3.5 text-blue-400" /> Contact Person
                </Label>
                <Input
                  placeholder="e.g. John Doe"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  className="bg-slate-950/70 border-slate-800 text-white focus:border-blue-500"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Mail className="h-3.5 w-3.5 text-blue-400" /> Email Address
                </Label>
                <Input
                  type="email"
                  placeholder="vendor@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-slate-950/70 border-slate-800 text-white focus:border-blue-500"
                />
              </div>
            </div>

            {/* Field: Phone & Lead Time */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Phone className="h-3.5 w-3.5 text-blue-400" /> Phone Number
                </Label>
                <Input
                  placeholder="+44 20 7946 0912"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-slate-950/70 border-slate-800 text-white focus:border-blue-500"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Clock className="h-3.5 w-3.5 text-blue-400" /> Lead Time (Days)
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={form.lead_time_days}
                  onChange={(e) => setForm({ ...form, lead_time_days: parseInt(e.target.value) || 0 })}
                  className="bg-slate-950/70 border-slate-800 text-white focus:border-blue-500"
                />
              </div>
            </div>

            {/* Field: Status */}
            <div>
              <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" /> Status
              </Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-slate-950/70 border-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="active">Active (Approved Supplier)</SelectItem>
                  <SelectItem value="inactive">Inactive (Suspended)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Field: Address */}
            <div>
              <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <MapPin className="h-3.5 w-3.5 text-blue-400" /> Postal Address
              </Label>
              <Input
                placeholder="100 Logistics Way, London, UK"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="bg-slate-950/70 border-slate-800 text-white focus:border-blue-500"
              />
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/20"
            >
              {saving ? "Saving..." : editing ? "Update Supplier" : "Create Supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
