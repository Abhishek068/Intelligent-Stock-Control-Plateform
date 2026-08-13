"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, MoreHorizontal, Eye, Trash2, Send, PackageCheck, Sparkles, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatsGrid } from "@/components/shared/StatsGrid";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { PO_STATUS_COLORS } from "@/constants/status.constants";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import {
  purchaseOrdersApi,
  suppliersApi,
  productsApi,
  locationsApi,
} from "@/lib/api";
import { ApiError } from "@/lib/api/client";

function PurchaseOrdersPageContent() {
  const router = useRouter();
  const { isSuperAdmin, hasPermission } = useRoleAccess();
  const canCreate = isSuperAdmin || hasPermission("purchase_orders", "create");
  const canApprove = isSuperAdmin || hasPermission("purchase_orders", "approve");
  const canDelete = isSuperAdmin || hasPermission("purchase_orders", "delete");

  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newOrder, setNewOrder] = useState({
    supplierId: "",
    locationId: "",
    expectedDelivery: "",
    notes: "",
    productId: "",
    quantity: 1,
    unitCost: "",
  });
  const [riskPrediction, setRiskPrediction] = useState(null);
  const [predictingRisk, setPredictingRisk] = useState(false);

  useEffect(() => {
    if (!newOrder.supplierId) {
      setRiskPrediction(null);
      return;
    }
    const timer = setTimeout(async () => {
      setPredictingRisk(true);
      try {
        const qty = Number(newOrder.quantity) || 1;
        const cost = Number(newOrder.unitCost) || 0;
        const res = await suppliersApi.predictRisk({
          supplier: Number(newOrder.supplierId),
          location: newOrder.locationId ? Number(newOrder.locationId) : null,
          total_volume: qty,
          total_amount: qty * cost,
          expected_delivery: newOrder.expectedDelivery || null,
        });
        const data = res?.data || res;
        setRiskPrediction(data);
      } catch (err) {
        console.error("Risk prediction error:", err);
      } finally {
        setPredictingRisk(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [newOrder.supplierId, newOrder.quantity, newOrder.unitCost, newOrder.expectedDelivery, newOrder.locationId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pos, sups, prods, locs] = await Promise.all([
        purchaseOrdersApi.list(),
        suppliersApi.list().catch(() => []),
        productsApi.list().catch(() => []),
        locationsApi.list().catch(() => []),
      ]);
      setOrders(pos);
      setSuppliers(sups);
      setProducts(prods);
      setLocations(locs);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to load POs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = orders.filter((order) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      String(order.po_number || "").toLowerCase().includes(q) ||
      String(order.supplier_name || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSupplier =
      supplierFilter === "all" || String(order.supplier) === supplierFilter;
    return matchesSearch && matchesStatus && matchesSupplier;
  });

  const stats = {
    draft: orders.filter((o) => o.status === "draft").length,
    sent: orders.filter((o) => o.status === "sent" || o.status === "partial").length,
    received: orders.filter((o) => o.status === "received").length,
    total: orders.length,
  };

  const handleCreateOrder = async () => {
    if (!newOrder.supplierId || !newOrder.productId || !newOrder.quantity) {
      toast.error("Supplier, product, and quantity are required");
      return;
    }
    setSaving(true);
    try {
      const product = products.find((p) => String(p.id) === newOrder.productId);
      const res = await purchaseOrdersApi.create({
        supplier: Number(newOrder.supplierId),
        location: newOrder.locationId ? Number(newOrder.locationId) : null,
        expected_delivery: newOrder.expectedDelivery || null,
        notes: newOrder.notes,
        lines: [
          {
            product: Number(newOrder.productId),
            quantity_ordered: Number(newOrder.quantity),
            unit_cost: newOrder.unitCost
              ? Number(newOrder.unitCost)
              : product?.unit_price,
          },
        ],
      });
      const created = res?.data || res;
      toast.success(`Created ${created.po_number || "PO"}`);
      setIsCreateDialogOpen(false);
      setNewOrder({
        supplierId: "",
        locationId: "",
        expectedDelivery: "",
        notes: "",
        productId: "",
        quantity: 1,
        unitCost: "",
      });
      load();
      if (created?.id) router.push(`/purchase-orders/${created.id}`);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (id, action) => {
    try {
      if (action === "submit") await purchaseOrdersApi.submit(id);
      if (action === "receive") await purchaseOrdersApi.receive(id);
      if (action === "cancel") await purchaseOrdersApi.cancel(id);
      if (action === "delete") await purchaseOrdersApi.delete(id);
      toast.success("Updated");
      load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Action failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Draft → submit → receive into inventory"
        actions={
          canCreate && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> New PO
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create Purchase Order</DialogTitle>
                  <DialogDescription>
                    Starts as draft. Submit to order, then receive to stock-in.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label>Supplier *</Label>
                    <Select
                      value={newOrder.supplierId}
                      onValueChange={(v) => setNewOrder((s) => ({ ...s, supplierId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Receive location</Label>
                    <Select
                      value={newOrder.locationId}
                      onValueChange={(v) => setNewOrder((s) => ({ ...s, locationId: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={String(l.id)}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Product *</Label>
                    <Select
                      value={newOrder.productId}
                      onValueChange={(v) => {
                        const p = products.find((x) => String(x.id) === v);
                        setNewOrder((s) => ({
                          ...s,
                          productId: v,
                          unitCost: p ? String(p.unit_price) : s.unitCost,
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={newOrder.quantity}
                        onChange={(e) =>
                          setNewOrder((s) => ({
                            ...s,
                            quantity: parseInt(e.target.value) || 1,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Unit cost</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newOrder.unitCost}
                        onChange={(e) =>
                          setNewOrder((s) => ({ ...s, unitCost: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Expected delivery</Label>
                    <Input
                      type="date"
                      value={newOrder.expectedDelivery}
                      onChange={(e) =>
                        setNewOrder((s) => ({
                          ...s,
                          expectedDelivery: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={newOrder.notes}
                      onChange={(e) =>
                        setNewOrder((s) => ({ ...s, notes: e.target.value }))
                      }
                    />
                  </div>

                  {newOrder.supplierId && (
                    <div className="rounded-lg border border-purple-500/30 bg-purple-950/20 p-3.5 space-y-2.5 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-semibold text-purple-400">
                          <Sparkles className="h-4 w-4 animate-pulse text-purple-400" />
                          <span>AI Supplier Delay Risk Assessment</span>
                        </div>
                        {predictingRisk && (
                          <span className="text-xs text-purple-300/70 animate-pulse">Calculating ML Risk...</span>
                        )}
                      </div>

                      {riskPrediction && !predictingRisk && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-md">
                            <div>
                              <p className="text-xs text-slate-400">Predicted Delay Probability</p>
                              <p className="text-lg font-bold font-mono text-white">
                                {riskPrediction.delay_probability}%
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-400">Dynamic Risk Score</p>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                                riskPrediction.risk_level === "low" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                                riskPrediction.risk_level === "medium" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                                riskPrediction.risk_level === "high" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                                "bg-red-500/20 text-red-400 border border-red-500/30"
                              }`}>
                                {riskPrediction.risk_level === "low" && <CheckCircle2 className="h-3 w-3" />}
                                {riskPrediction.risk_level === "medium" && <AlertTriangle className="h-3 w-3" />}
                                {(riskPrediction.risk_level === "high" || riskPrediction.risk_level === "critical") && <ShieldAlert className="h-3 w-3" />}
                                {riskPrediction.risk_level} ({riskPrediction.risk_score}/100)
                              </span>
                            </div>
                          </div>

                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                riskPrediction.delay_probability < 25 ? "bg-emerald-400" :
                                riskPrediction.delay_probability < 50 ? "bg-amber-400" :
                                riskPrediction.delay_probability < 75 ? "bg-orange-400" : "bg-red-500"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, riskPrediction.delay_probability))}%` }}
                            />
                          </div>

                          {riskPrediction.risk_factors?.drivers?.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs text-slate-400 font-medium">Key Risk Drivers:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {riskPrediction.risk_factors.drivers.map((d, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60" title={d.impact}>
                                    • {d.factor}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOrder} disabled={saving}>
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
          { label: "Total", value: stats.total, color: "blue" },
          { label: "Draft", value: stats.draft, color: "slate" },
          { label: "Open", value: stats.sent, color: "amber" },
          { label: "Received", value: stats.received, color: "green" },
        ]}
      />

      <Card className="glass-card">
        <CardContent className="p-4 space-y-4">
          <FilterBar>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search PO or supplier..."
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Supplier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All suppliers</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterBar>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>AI Risk Level</TableHead>
                <TableHead>Expected</TableHead>
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
                    No purchase orders
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">{order.po_number}</TableCell>
                  <TableCell>{order.supplier_name}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={order.status}
                      colorMap={PO_STATUS_COLORS}
                    />
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-mono font-medium ${
                      order.risk_level === "critical" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                      order.risk_level === "high" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30" :
                      order.risk_level === "medium" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                      "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    }`}>
                      {order.risk_level || "low"} ({Number(order.delay_probability || 0).toFixed(1)}%)
                    </span>
                  </TableCell>
                  <TableCell>{order.expected_delivery || "—"}</TableCell>
                  <TableCell className="text-right font-mono">
                    £{Number(order.total_amount || 0).toLocaleString()}
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
                          onClick={() => router.push(`/purchase-orders/${order.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        {canApprove && order.status === "draft" && (
                          <DropdownMenuItem onClick={() => runAction(order.id, "submit")}>
                            <Send className="mr-2 h-4 w-4" /> Submit
                          </DropdownMenuItem>
                        )}
                        {canApprove &&
                          ["sent", "partial"].includes(order.status) && (
                            <DropdownMenuItem
                              onClick={() => runAction(order.id, "receive")}
                            >
                              <PackageCheck className="mr-2 h-4 w-4" /> Receive all
                            </DropdownMenuItem>
                          )}
                        {canDelete && order.status === "draft" && (
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => runAction(order.id, "delete")}
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

export default function PurchaseOrdersPage() {
  return (
    <ModuleGate module="purchase_orders" action="view">
      <PurchaseOrdersPageContent />
    </ModuleGate>
  );
}
