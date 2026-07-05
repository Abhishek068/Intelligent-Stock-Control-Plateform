"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  FileText,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
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
import { useUserStore } from "@/lib/store";

// Mock Data
const mockPOs = [
  {
    id: "PO-2024-001",
    supplier: "TechSupply Ltd",
    supplierId: "sup-1",
    orderDate: "2026-07-01",
    expectedDelivery: "2026-07-10",
    status: "received",
    totalAmount: 1250.0,
    items: 3,
    createdBy: "Admin",
  },
  {
    id: "PO-2024-002",
    supplier: "Global Parts Co",
    supplierId: "sup-2",
    orderDate: "2026-07-03",
    expectedDelivery: "2026-07-15",
    status: "sent",
    totalAmount: 875.5,
    items: 5,
    createdBy: "Manager",
  },
  {
    id: "PO-2024-003",
    supplier: "OfficeDirect",
    supplierId: "sup-3",
    orderDate: "2026-06-28",
    expectedDelivery: "2026-07-08",
    status: "draft",
    totalAmount: 2100.0,
    items: 2,
    createdBy: "Manager",
  },
  {
    id: "PO-2024-004",
    supplier: "TechSupply Ltd",
    supplierId: "sup-1",
    orderDate: "2026-06-25",
    expectedDelivery: "2026-07-05",
    status: "cancelled",
    totalAmount: 320.0,
    items: 1,
    createdBy: "Admin",
  },
];

const mockSuppliers = [
  { id: "sup-1", name: "TechSupply Ltd" },
  { id: "sup-2", name: "Global Parts Co" },
  { id: "sup-3", name: "OfficeDirect" },
];

const statusColors = {
  draft: "bg-slate-400",
  sent: "bg-blue-500",
  received: "bg-green-500",
  cancelled: "bg-red-500",
};

const statusIcons = {
  draft: <Clock className="mr-1 h-3 w-3" />,
  sent: <Truck className="mr-1 h-3 w-3" />,
  received: <CheckCircle className="mr-1 h-3 w-3" />,
  cancelled: <XCircle className="mr-1 h-3 w-3" />,
};

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { role } = useUserStore();
  const canEdit = role === "admin" || role === "manager";

  const [orders, setOrders] = useState(mockPOs);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    supplierId: "",
    expectedDelivery: "",
    notes: "",
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
      createdBy: role || "User",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Purchase Orders
          </h1>
          <p className="text-slate-500">
            Manage supplier orders and deliveries (R2)
          </p>
        </div>
        {canEdit && (
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
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockSuppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
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
                    }
                  />
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
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateOrder} className="bg-teal-600">
                  Create Order
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search PO # or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
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
              {mockSuppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-sm text-slate-400">
            {filtered.length} orders
          </span>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
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
              {filtered.map((order) => (
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
                    <Badge className={statusColors[order.status]}>
                      {statusIcons[order.status]}
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
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
                          }
                        >
                          <Eye className="mr-2 h-3 w-3" /> View Details
                        </DropdownMenuItem>
                        {canEdit && order.status !== "received" && (
                          <>
                            <DropdownMenuItem>
                              <Pencil className="mr-2 h-3 w-3" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteOrder(order.id)}
                            >
                              <Trash2 className="mr-2 h-3 w-3" /> Delete
                            </DropdownMenuItem>
                          </>
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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Orders</p>
            <p className="text-2xl font-bold">{orders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Pending (Draft/Sent)</p>
            <p className="text-2xl font-bold text-blue-600">
              {orders.filter((o) => o.status === "draft" || o.status === "sent")
                .length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Received</p>
            <p className="text-2xl font-bold text-green-600">
              {orders.filter((o) => o.status === "received").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Value</p>
            <p className="text-2xl font-bold text-teal-600">
              £{orders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}