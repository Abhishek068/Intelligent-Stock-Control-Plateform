"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Trash2,
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
import { useUserStore } from "@/lib/store";

// Mock Data
const mockInvoices = [
  {
    id: "INV-2024-001",
    customer: "John Smith",
    customerId: "1",
    orderId: "ORD-2024-001",
    date: "2026-07-01",
    dueDate: "2026-07-15",
    total: 1245.50,
    status: "paid",
    items: 3,
  },
  {
    id: "INV-2024-002",
    customer: "Sarah Johnson",
    customerId: "2",
    orderId: "ORD-2024-002",
    date: "2026-07-03",
    dueDate: "2026-07-17",
    total: 875.00,
    status: "unpaid",
    items: 5,
  },
  {
    id: "INV-2024-003",
    customer: "Michael Brown",
    customerId: "3",
    orderId: "ORD-2024-003",
    date: "2026-06-20",
    dueDate: "2026-07-04",
    total: 450.75,
    status: "overdue",
    items: 2,
  },
  {
    id: "INV-2024-004",
    customer: "Emily Davis",
    customerId: "4",
    orderId: "ORD-2024-004",
    date: "2026-07-05",
    dueDate: "2026-07-19",
    total: 2100.00,
    status: "draft",
    items: 4,
  },
];

const mockCustomers = [
  { id: "1", name: "John Smith" },
  { id: "2", name: "Sarah Johnson" },
  { id: "3", name: "Michael Brown" },
  { id: "4", name: "Emily Davis" },
];

const statusColors = {
  paid: "bg-green-500",
  unpaid: "bg-amber-500",
  overdue: "bg-red-500",
  draft: "bg-slate-400",
};

const statusIcons = {
  paid: <CheckCircle className="mr-1 h-3 w-3" />,
  unpaid: <Clock className="mr-1 h-3 w-3" />,
  overdue: <AlertCircle className="mr-1 h-3 w-3" />,
  draft: <FileText className="mr-1 h-3 w-3" />,
};

export default function InvoicesPage() {
  const router = useRouter();
  const { role } = useUserStore();
  const canEdit = role === "admin" || role === "manager";

  const [invoices, setInvoices] = useState(mockInvoices);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    customerId: "",
    dueDate: "",
  });

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.orderId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    const matchesCustomer =
      customerFilter === "all" || inv.customerId === customerFilter;
    return matchesSearch && matchesStatus && matchesCustomer;
  });

  const stats = {
    total: invoices.reduce((s, i) => s + i.total, 0),
    paid: invoices.filter((i) => i.status === "paid").length,
    unpaid: invoices.filter((i) => i.status === "unpaid").length,
    overdue: invoices.filter((i) => i.status === "overdue").length,
  };

  const handleCreateInvoice = () => {
    if (!newInvoice.customerId || !newInvoice.dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    const customer = mockCustomers.find((c) => c.id === newInvoice.customerId);
    const newId = `INV-2024-${String(invoices.length + 1).padStart(3, "0")}`;
    const invoice = {
      id: newId,
      customer: customer?.name || "Unknown",
      customerId: newInvoice.customerId,
      orderId: `ORD-${newId.slice(4)}`,
      date: new Date().toISOString().split("T")[0],
      dueDate: newInvoice.dueDate,
      total: 0,
      status: "draft",
      items: 0,
    };
    setInvoices([invoice, ...invoices]);
    setIsCreateDialogOpen(false);
    setNewInvoice({ customerId: "", dueDate: "" });
    toast.success(`Invoice ${newId} created`);
  };

  const handleMarkAsPaid = (id) => {
    setInvoices(
      invoices.map((inv) =>
        inv.id === id ? { ...inv, status: "paid" } : inv
      )
    );
    toast.success(`Invoice ${id} marked as paid`);
  };

  const handleDelete = (id) => {
    setInvoices(invoices.filter((inv) => inv.id !== id));
    toast.success(`Invoice ${id} deleted`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Invoices & Billing
          </h1>
          <p className="text-slate-500">Manage customer invoices and payments</p>
        </div>
        {canEdit && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="mr-2 h-4 w-4" /> Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Invoice</DialogTitle>
                <DialogDescription>
                  Generate a new invoice for a customer.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer *</Label>
                  <Select
                    value={newInvoice.customerId}
                    onValueChange={(v) =>
                      setNewInvoice({ ...newInvoice, customerId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockCustomers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    type="date"
                    value={newInvoice.dueDate}
                    onChange={(e) =>
                      setNewInvoice({ ...newInvoice, dueDate: e.target.value })
                    }
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
                <Button onClick={handleCreateInvoice} className="bg-teal-600">
                  Create Invoice
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Revenue</p>
            <p className="text-2xl font-bold text-teal-600">
              £{stats.total.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Paid</p>
            <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Unpaid</p>
            <p className="text-2xl font-bold text-amber-600">{stats.unpaid}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-red-500">
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search invoices..."
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
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {mockCustomers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-sm text-slate-400">
            {filtered.length} invoices
          </span>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono font-medium">
                    {inv.id}
                  </TableCell>
                  <TableCell>{inv.customer}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {inv.orderId}
                  </TableCell>
                  <TableCell>{inv.date}</TableCell>
                  <TableCell>{inv.dueDate}</TableCell>
                  <TableCell className="text-right font-mono">
                    £{inv.total.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={statusColors[inv.status]}>
                      {statusIcons[inv.status]}
                      {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
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
                            router.push(`/invoices/${inv.id}`)
                          }
                        >
                          <Eye className="mr-2 h-3 w-3" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-3 w-3" /> Download PDF
                        </DropdownMenuItem>
                        {canEdit && inv.status !== "paid" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleMarkAsPaid(inv.id)}
                            >
                              <CheckCircle className="mr-2 h-3 w-3" /> Mark as Paid
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(inv.id)}
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
    </div>
  );
}
