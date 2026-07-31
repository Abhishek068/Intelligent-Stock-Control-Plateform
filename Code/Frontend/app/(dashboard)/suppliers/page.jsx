"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, MoreHorizontal } from "lucide-react";
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
  DialogTitle } from
"@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Supplier Management</h1>
          <p className="text-slate-400">Manage suppliers and lead times</p>
        </div>
        {canManage &&
        <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Supplier
          </Button>
        }
      </div>

      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9" />
            
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Lead Time</TableHead>
                <TableHead className="text-center">Performance</TableHead>
                <TableHead className="text-center">Products</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ?
              <TableRow>
                  <TableCell colSpan={canManage ? 7 : 6} className="text-center text-slate-400">
                    Loading...
                  </TableCell>
                </TableRow> :
              filtered.length === 0 ?
              <TableRow>
                  <TableCell colSpan={canManage ? 7 : 6} className="text-center text-slate-400">
                    No suppliers found
                  </TableCell>
                </TableRow> :

              filtered.map((sup) =>
              <TableRow key={sup.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 bg-teal-100">
                          <AvatarFallback className="text-teal-700">
                            {sup.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {sup.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{sup.contact_name || "—"}</p>
                        <p className="text-xs text-slate-400">{sup.email || "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>{sup.lead_time_days}d</TableCell>
                    <TableCell className="text-center">
                      <div className="text-sm font-medium">{Number(sup.performance_score || 0).toFixed(0)}%</div>
                      <div className="text-xs text-slate-400">
                        Delivery {Number(sup.delivery_rate || 0).toFixed(0)}% · Accuracy {Number(sup.order_accuracy || 0).toFixed(0)}%
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{sup.product_count ?? 0}</TableCell>
                    <TableCell>
                      <Badge className={sup.status === "active" ? "bg-green-500" : "bg-slate-400"}>
                        {sup.status}
                      </Badge>
                    </TableCell>
                    {canManage &&
                <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(sup)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDelete(sup)}>
                        
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                }
                  </TableRow>
              )
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Contact Name</Label>
              <Input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
              
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
              
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Lead Time (days)</Label>
              <Input
                type="number"
                min="0"
                value={form.lead_time_days}
                onChange={(e) =>
                setForm({ ...form, lead_time_days: parseInt(e.target.value) || 0 })
                } />
              
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}
