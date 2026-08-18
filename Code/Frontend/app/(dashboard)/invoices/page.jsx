"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  Eye,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatsGrid } from "@/components/shared/StatsGrid";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_ICONS } from "@/constants/status.constants";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { invoicesApi, customersApi, productsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

function InvoicesPageContent() {
  const router = useRouter();
  const { isSuperAdmin, hasPermission } = useRoleAccess();
  const canCreate = isSuperAdmin || hasPermission("invoices", "create");
  const canApprove = isSuperAdmin || hasPermission("invoices", "approve");
  const canDelete = isSuperAdmin || hasPermission("invoices", "delete");

  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    customerId: "",
    dueDate: "",
    taxRate: "0",
    notes: "",
    productId: "",
    quantity: 1,
    unitPrice: "",
    description: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invs, custs, prods] = await Promise.all([
        invoicesApi.list(),
        customersApi.list().catch(() => []),
        productsApi.list().catch(() => []),
      ]);
      setInvoices(invs);
      setCustomers(custs);
      setProducts(prods);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      String(inv.invoice_number || "").toLowerCase().includes(q) ||
      String(inv.customer_name || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesCustomer =
      customerFilter === "all" || String(inv.customer) === customerFilter;
    return matchesSearch && matchesStatus && matchesCustomer;
  });

  const stats = {
    total: invoices.reduce((s, i) => s + Number(i.total_amount || 0), 0),
    paid: invoices.filter((i) => i.status === "paid").length,
    unpaid: invoices.filter((i) => i.status === "unpaid").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.customerId || (!newInvoice.productId && !newInvoice.description)) {
      toast.error("Customer and a product or description are required");
      return;
    }
    setSaving(true);
    try {
      const product = products.find((p) => String(p.id) === newInvoice.productId);
      const res = await invoicesApi.create({
        customer: Number(newInvoice.customerId),
        due_date: newInvoice.dueDate || null,
        notes: newInvoice.notes,
        tax_rate: Number(newInvoice.taxRate) || 0,
        lines: [
          {
            product: newInvoice.productId ? Number(newInvoice.productId) : null,
            description: newInvoice.description || product?.name,
            quantity: Number(newInvoice.quantity) || 1,
            unit_price: newInvoice.unitPrice
              ? Number(newInvoice.unitPrice)
              : product?.unit_price,
          },
        ],
      });
      const created = res?.data || res;
      toast.success(`Created ${created.invoice_number || "invoice"}`);
      setIsCreateDialogOpen(false);
      setNewInvoice({
        customerId: "",
        dueDate: "",
        taxRate: "0",
        notes: "",
        productId: "",
        quantity: 1,
        unitPrice: "",
        description: "",
      });
      load();
      if (created?.id) router.push(`/invoices/${created.id}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (id, action) => {
    try {
      if (action === "issue") await invoicesApi.issue(id);
      if (action === "mark_paid") await invoicesApi.markPaid(id);
      if (action === "cancel") await invoicesApi.cancel(id);
      if (action === "delete") await invoicesApi.delete(id);
      toast.success("Updated");
      load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Action failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Draft → issue → mark paid. Overdue updates automatically."
        actions={
          canCreate && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-md cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" /> New Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg bg-white dark:bg-[#0F172A] border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl text-slate-900 dark:text-white">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">Create invoice</DialogTitle>
                  <DialogDescription className="text-slate-500 dark:text-slate-400">
                    Starts as draft. Issue when ready to collect payment.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
                  <div className="grid gap-2">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Customer <span className="text-rose-500">*</span></Label>
                    <Select
                      value={newInvoice.customerId}
                      onValueChange={(v) =>
                        setNewInvoice((s) => ({ ...s, customerId: v }))
                      }
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl">
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-2xl rounded-xl text-slate-800 dark:text-slate-200">
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)} className="cursor-pointer">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!customers.length && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        No customers yet — create one under Customers first.
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Product</Label>
                    <Select
                      value={newInvoice.productId}
                      onValueChange={(v) => {
                        const p = products.find((x) => String(x.id) === v);
                        setNewInvoice((s) => ({
                          ...s,
                          productId: v,
                          unitPrice: p ? String(p.unit_price) : s.unitPrice,
                          description: p ? p.name : s.description,
                        }));
                      }}
                    >
                      <SelectTrigger className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl">
                        <SelectValue placeholder="Optional product" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-2xl rounded-xl text-slate-800 dark:text-slate-200">
                        {products.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)} className="cursor-pointer">
                            {p.name} ({p.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Description</Label>
                    <Input
                      value={newInvoice.description}
                      onChange={(e) =>
                        setNewInvoice((s) => ({ ...s, description: e.target.value }))
                      }
                      placeholder="Line description"
                      className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={newInvoice.quantity}
                        onChange={(e) =>
                          setNewInvoice((s) => ({
                            ...s,
                            quantity: parseInt(e.target.value) || 1,
                          }))
                        }
                        className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-bold rounded-xl"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Unit price (£)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newInvoice.unitPrice}
                        onChange={(e) =>
                          setNewInvoice((s) => ({ ...s, unitPrice: e.target.value }))
                        }
                        className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-bold rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Due date</Label>
                      <Input
                        type="date"
                        value={newInvoice.dueDate}
                        onChange={(e) =>
                          setNewInvoice((s) => ({ ...s, dueDate: e.target.value }))
                        }
                        className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tax %</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newInvoice.taxRate}
                        onChange={(e) =>
                          setNewInvoice((s) => ({ ...s, taxRate: e.target.value }))
                        }
                        className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-bold rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Notes</Label>
                    <Textarea
                      value={newInvoice.notes}
                      onChange={(e) =>
                        setNewInvoice((s) => ({ ...s, notes: e.target.value }))
                      }
                      className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl"
                    />
                  </div>
                </div>
                <DialogFooter className="mt-4 gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 cursor-pointer">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateInvoice} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-md cursor-pointer">
                    {saving ? "Creating..." : "Create Draft"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <StatsGrid
        stats={[
          {
            label: "Revenue (listed)",
            value: `£${stats.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            color: "emerald",
          },
          { label: "Paid", value: stats.paid, color: "green" },
          { label: "Unpaid", value: stats.unpaid, color: "amber" },
          { label: "Overdue", value: stats.overdue, color: "red" },
        ]}
      />

      <Card className="glass-card border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl">
        <CardContent className="p-4 space-y-4">
          <FilterBar>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search invoice or customer..."
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl rounded-xl text-slate-800 dark:text-slate-200">
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[180px] bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl">
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl rounded-xl text-slate-800 dark:text-slate-200">
                <SelectItem value="all">All customers</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterBar>

          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-white/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-4 pl-4 font-bold text-slate-700 dark:text-slate-300">Invoice #</TableHead>
                <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Customer</TableHead>
                <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
                <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Due</TableHead>
                <TableHead className="py-4 text-right font-bold text-slate-700 dark:text-slate-300">Total</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 dark:text-slate-400 py-12">
                    <div className="animate-pulse">Loading invoices...</div>
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 dark:text-slate-400 py-12">
                    No invoices found.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-200/60 dark:border-white/5">
                  <TableCell className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400 pl-4">{inv.invoice_number}</TableCell>
                  <TableCell className="font-bold text-slate-900 dark:text-slate-200">{inv.customer_name}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={inv.status}
                      colorMap={INVOICE_STATUS_COLORS}
                      iconMap={INVOICE_STATUS_ICONS}
                    />
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400 font-medium">{inv.due_date || "—"}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                    £{Number(inv.total_amount || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl rounded-xl">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => router.push(`/invoices/${inv.id}`)}
                          className="cursor-pointer font-medium"
                        >
                          <Eye className="mr-2 h-4 w-4 text-slate-600 dark:text-slate-400" /> View
                        </DropdownMenuItem>
                        {canApprove && inv.status === "draft" && (
                          <DropdownMenuItem onClick={() => runAction(inv.id, "issue")} className="cursor-pointer text-indigo-600 dark:text-indigo-400 font-semibold">
                            <Send className="mr-2 h-4 w-4" /> Issue
                          </DropdownMenuItem>
                        )}
                        {canApprove &&
                          ["unpaid", "overdue"].includes(inv.status) && (
                            <DropdownMenuItem
                              onClick={() => runAction(inv.id, "mark_paid")}
                              className="cursor-pointer text-emerald-600 dark:text-emerald-400 font-semibold"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" /> Mark paid
                            </DropdownMenuItem>
                          )}
                        {canApprove &&
                          ["draft", "unpaid", "overdue"].includes(inv.status) && (
                            <DropdownMenuItem
                              onClick={() => runAction(inv.id, "cancel")}
                              className="cursor-pointer"
                            >
                              <XCircle className="mr-2 h-4 w-4" /> Cancel
                            </DropdownMenuItem>
                          )}
                        {canDelete && inv.status === "draft" && (
                          <DropdownMenuItem
                            className="text-rose-600 dark:text-rose-400 font-semibold cursor-pointer"
                            onClick={() => runAction(inv.id, "delete")}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <ModuleGate module="invoices" action="view">
      <InvoicesPageContent />
    </ModuleGate>
  );
}
