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
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> New Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create invoice</DialogTitle>
                  <DialogDescription>
                    Starts as draft. Issue when ready to collect payment.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto">
                  <div className="grid gap-2">
                    <Label>Customer *</Label>
                    <Select
                      value={newInvoice.customerId}
                      onValueChange={(v) =>
                        setNewInvoice((s) => ({ ...s, customerId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!customers.length && (
                      <p className="text-xs text-amber-500">
                        No customers yet — create one under Customers first.
                      </p>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Label>Product</Label>
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
                      <SelectTrigger>
                        <SelectValue placeholder="Optional product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name} ({p.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Input
                      value={newInvoice.description}
                      onChange={(e) =>
                        setNewInvoice((s) => ({ ...s, description: e.target.value }))
                      }
                      placeholder="Line description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Quantity</Label>
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
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Unit price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newInvoice.unitPrice}
                        onChange={(e) =>
                          setNewInvoice((s) => ({ ...s, unitPrice: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Due date</Label>
                      <Input
                        type="date"
                        value={newInvoice.dueDate}
                        onChange={(e) =>
                          setNewInvoice((s) => ({ ...s, dueDate: e.target.value }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Tax %</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newInvoice.taxRate}
                        onChange={(e) =>
                          setNewInvoice((s) => ({ ...s, taxRate: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={newInvoice.notes}
                      onChange={(e) =>
                        setNewInvoice((s) => ({ ...s, notes: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateInvoice} disabled={saving}>
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

      <Card className="glass-card">
        <CardContent className="p-4 space-y-4">
          <FilterBar>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search invoice or customer..."
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent>
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
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400">
                    No invoices
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.customer_name}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={inv.status}
                      colorMap={INVOICE_STATUS_COLORS}
                      iconMap={INVOICE_STATUS_ICONS}
                    />
                  </TableCell>
                  <TableCell>{inv.due_date || "—"}</TableCell>
                  <TableCell className="text-right font-mono">
                    £{Number(inv.total_amount || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => router.push(`/invoices/${inv.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        {canApprove && inv.status === "draft" && (
                          <DropdownMenuItem onClick={() => runAction(inv.id, "issue")}>
                            <Send className="mr-2 h-4 w-4" /> Issue
                          </DropdownMenuItem>
                        )}
                        {canApprove &&
                          ["unpaid", "overdue"].includes(inv.status) && (
                            <DropdownMenuItem
                              onClick={() => runAction(inv.id, "mark_paid")}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" /> Mark paid
                            </DropdownMenuItem>
                          )}
                        {canApprove &&
                          ["draft", "unpaid", "overdue"].includes(inv.status) && (
                            <DropdownMenuItem
                              onClick={() => runAction(inv.id, "cancel")}
                            >
                              <XCircle className="mr-2 h-4 w-4" /> Cancel
                            </DropdownMenuItem>
                          )}
                        {canDelete && inv.status === "draft" && (
                          <DropdownMenuItem
                            className="text-red-600"
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
