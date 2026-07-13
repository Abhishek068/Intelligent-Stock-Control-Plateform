"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2 } from
"lucide-react";
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
  TableRow } from
"@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger } from
"@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatsGrid } from "@/components/shared/StatsGrid";
import { StatusBadge } from "@/components/shared/StatusBadge";



import {
  PO_STATUS_COLORS,
  PO_STATUS_ICONS } from
"@/constants/status.constants";
import { useRoleAccess } from "@/hooks/useRoleAccess";

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { role, canEdit } = useRoleAccess();

  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    supplierId: "",
    expectedDelivery: "",
    notes: ""
  });

  const filtered = orders.filter((order) => {
    const matchesSearch =
    order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.supplier.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSupplier =
    supplierFilter === "all" || order.supplierId === supplierFilter;
    return matchesSearch && matchesStatus && matchesSupplier;
  });

  const handleCreateOrder = () => {
    if (!newOrder.supplierId || !newOrder.expectedDelivery) {
      toast.error("Please fill in all required fields");
      return;
    }
    const supplier = mockSuppliers.find((s) => s.id === newOrder.supplierId);
    const newId = `PO-2024-${String(orders.length + 1).padStart(3, "0")}`;
    const order = {
      id: newId,
      supplier: supplier?.name || "Unknown",
      supplierId: newOrder.supplierId,
      orderDate: new Date().toISOString().split("T")[0],
      expectedDelivery: newOrder.expectedDelivery,
      status: "draft",
      totalAmount: 0,
      items: 0,
      createdBy: role || "User"
    };
    setOrders([order, ...orders]);
    setIsCreateDialogOpen(false);
    setNewOrder({ supplierId: "", expectedDelivery: "", notes: "" });
    toast.success(`Purchase Order ${newId} created`);
  };

  const handleDeleteOrder = (id) => {
    setOrders(orders.filter((o) => o.id !== id));
    toast.success(`Order ${id} deleted`);
  };

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "draft" || o.status === "sent").length,
    received: orders.filter((o) => o.status === "received").length,
    value: orders.reduce((sum, o) => sum + o.totalAmount, 0)
  };

  return (
    <div className="space-y-6">
      {}
      <PageHeader
        title="Purchase Orders"
        description="Manage supplier orders and deliveries (R2)"
        actions={
        canEdit &&
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="mr-2 h-4 w-4" /> Create PO
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Purchase Order</DialogTitle>
                  <DialogDescription>
                    Enter the details for your new purchase order.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier *</Label>
                    <Select
                  value={newOrder.supplierId}
                  onValueChange={(v) =>
                  setNewOrder({ ...newOrder, supplierId: v })
                  }>
                  
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockSuppliers.map((s) =>
                    <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                    )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery">Expected Delivery Date *</Label>
                    <Input
                  id="delivery"
                  type="date"
                  value={newOrder.expectedDelivery}
                  onChange={(e) =>
                  setNewOrder({ ...newOrder, expectedDelivery: e.target.value })
                  } />
                
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                  id="notes"
                  placeholder="Additional notes..."
                  value={newOrder.notes}
                  onChange={(e) =>
                  setNewOrder({ ...newOrder, notes: e.target.value })
                  }
                  rows={3} />
                
                  </div>
                </div>
                <DialogFooter>
                  <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}>
                
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOrder} className="bg-teal-600">
                    Create Order
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

        } />
      

      {}
      <FilterBar resultCount={filtered.length} resultLabel="orders">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search PO # or supplier..." />
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Supplier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {mockSuppliers.map((s) =>
            <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </FilterBar>

      {}
      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Order Date</TableHead>
                <TableHead>Expected Delivery</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) =>
              <TableRow key={order.id}>
                  <TableCell className="font-mono font-medium">
                    {order.id}
                  </TableCell>
                  <TableCell>{order.supplier}</TableCell>
                  <TableCell>{order.orderDate}</TableCell>
                  <TableCell>{order.expectedDelivery}</TableCell>
                  <TableCell className="text-center">{order.items}</TableCell>
                  <TableCell className="text-right font-mono">
                    £{order.totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <StatusBadge
                    status={order.status}
                    colorMap={PO_STATUS_COLORS}
                    iconMap={PO_STATUS_ICONS} />
                  
                  </TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                        onClick={() =>
                        router.push(`/purchase-orders/${order.id}`)
                        }>
                        
                          <Eye className="mr-2 h-3 w-3" /> View Details
                        </DropdownMenuItem>
                        {canEdit && order.status !== "received" &&
                      <>
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-3 w-3" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDeleteOrder(order.id)}>
                          
                              <Trash2 className="mr-2 h-3 w-3" /> Delete
                            </DropdownMenuItem>
                          </>
                      }
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {}
      <StatsGrid
        stats={[
        { label: "Total Orders", value: stats.total },
        { label: "Pending (Draft/Sent)", value: stats.pending, color: "blue" },
        { label: "Received", value: stats.received, color: "green" },
        { label: "Total Value", value: `£${stats.value.toFixed(2)}`, color: "teal" }]
        } />
      
    </div>);

}
