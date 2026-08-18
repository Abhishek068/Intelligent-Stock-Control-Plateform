"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, UsersRound, Search, UserCheck } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { ModuleGate } from "@/components/shared/ModuleGate";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { customersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

function CustomersPageContent() {
  const { isSuperAdmin, hasPermission, canEdit } = useRoleAccess();
  const canManage =
    isSuperAdmin ||
    hasPermission("customers", "create") ||
    hasPermission("customers", "edit") ||
    canEdit;

  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCustomers(await customersApi.list());
    } catch {
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      company: "",
      address: "",
      notes: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name || "",
      email: c.email || "",
      phone: c.phone || "",
      company: c.company || "",
      address: c.address || "",
      notes: c.notes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await customersApi.update(editing.id, form);
        toast.success("Customer updated");
      } else {
        await customersApi.create(form);
        toast.success("Customer created");
      }
      setDialogOpen(false);
      load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await customersApi.delete(id);
      toast.success("Customer deleted");
      load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-500/20 rounded-xl border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <UsersRound className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-slate-50 dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              Customers
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Manage your bill-to customers and invoice recipients.
          </p>
        </div>

        {canManage && (
          <Button 
            onClick={openCreate}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl px-5 shadow-md border border-blue-500/50 cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl bg-white dark:bg-[#0F172A] border-slate-200 dark:border-blue-500/30 shadow-2xl rounded-2xl p-0 overflow-hidden text-slate-900 dark:text-white">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <UserCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              {editing ? "Edit Customer" : "Add New Customer"}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Name <span className="text-rose-500">*</span></Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 h-11 rounded-xl font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Company</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  placeholder="e.g. Acme Corporation"
                  className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 h-11 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="contact@acme.com"
                  className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 h-11 rounded-xl font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 h-11 rounded-xl font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Address</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                rows={2}
                placeholder="123 Business Rd, Suite 100..."
                className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl resize-none"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Any additional details..."
                className="w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl resize-none"
              />
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-2 flex gap-3 sm:justify-end">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl px-5 cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl px-6 shadow-md cursor-pointer">
              {saving ? "Saving..." : "Save Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />
        
        {/* Search Bar Area */}
        <div className="px-8 py-5 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="relative w-full max-w-md group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" />
            <Input
              placeholder="Search customers by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl h-10 w-full"
            />
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto relative z-10">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-white/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 pl-8 font-bold text-slate-700 dark:text-slate-300">Customer Name</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Email Address</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Company</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
                  {canManage && <TableHead className="py-4 pr-8 text-right font-bold text-slate-700 dark:text-slate-300">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500 dark:text-slate-400 py-12">
                      <div className="animate-pulse flex items-center justify-center gap-2">
                        <div className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                        Loading customers...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500 dark:text-slate-400 py-12">
                      <div className="flex flex-col items-center justify-center">
                        <UsersRound className="h-10 w-10 text-slate-400 mb-3" />
                        <p>No customers found.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-200/60 dark:border-white/5 group">
                      <TableCell className="pl-8 py-5">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{c.name}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600 dark:text-slate-300 font-medium">{c.email || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{c.company || "—"}</span>
                      </TableCell>
                      <TableCell>
                        {c.status === "active" ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 font-bold px-2.5 py-1">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20 font-bold px-2.5 py-1">
                            {c.status || "Inactive"}
                          </Badge>
                        )}
                      </TableCell>
                      {canManage && (
                        <TableCell className="text-right pr-8">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-2xl rounded-xl text-slate-800 dark:text-slate-200">
                              <DropdownMenuLabel className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openEdit(c)} className="cursor-pointer font-medium">
                                <Pencil className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(c.id)}
                                className="cursor-pointer text-rose-600 dark:text-rose-400 font-semibold"
                              >
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
    </div>
  );
}

export default function CustomersPage() {
  return (
    <ModuleGate module="customers" action="view">
      <CustomersPageContent />
    </ModuleGate>
  );
}
