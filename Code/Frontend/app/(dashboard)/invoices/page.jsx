"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  Eye,
  Download,
  CheckCircle,
  Trash2 } from
"lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Card, CardContent } from "@/components/ui/card";


import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatsGrid } from "@/components/shared/StatsGrid";
import { StatusBadge } from "@/components/shared/StatusBadge";



import {
  INVOICE_STATUS_COLORS,
  INVOICE_STATUS_ICONS } from
"@/constants/status.constants";
import { useRoleAccess } from "@/hooks/useRoleAccess";

export default function InvoicesPage() {
  const router = useRouter();
  const { canEdit } = useRoleAccess();

  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    customerId: "",
    dueDate: ""
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
    overdue: invoices.filter((i) => i.status === "overdue").length
  };

  const handleCreateInvoice = () => {
    if (!newInvoice.customerId || !newInvoice.dueDate) {
      toast.error("Please fill in all required fields");
      return;
    }
    const customer = null;
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
      items: 0
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
      {}
      <PageHeader
        title="Invoices & Billing"
        description="Manage customer invoices and payments"
        actions={
        canEdit &&
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
                  }>
                  
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {[].map((c) =>
                    <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                    )}
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
                  } />
                
                  </div>
                </div>
                <DialogFooter>
                  <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}>
                
                    Cancel
                  </Button>
                  <Button onClick={handleCreateInvoice} className="bg-teal-600">
                    Create Invoice
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

        } />
      

      {}
      <StatsGrid
        stats={[
        { label: "Total Revenue", value: `£${stats.total.toFixed(2)}`, color: "teal" },
        { label: "Paid", value: stats.paid, color: "green" },
        { label: "Unpaid", value: stats.unpaid, color: "amber" },
        { label: "Overdue", value: stats.overdue, color: "red", highlight: true }]
        } />
      

      {}
      <FilterBar resultCount={filtered.length} resultLabel="invoices">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search invoices..." />
        
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
            {mockCustomers.map((c) =>
            <SelectItem key={c.id} value={c.id}>
                {c.name}
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
              {filtered.map((inv) =>
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
                    <StatusBadge
                    status={inv.status}
                    colorMap={INVOICE_STATUS_COLORS}
                    iconMap={INVOICE_STATUS_ICONS} />
                  
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
                        }>
                        
                          <Eye className="mr-2 h-3 w-3" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-3 w-3" /> Download PDF
                        </DropdownMenuItem>
                        {canEdit && inv.status !== "paid" &&
                      <>
                            <DropdownMenuItem
                          onClick={() => handleMarkAsPaid(inv.id)}>
                          
                              <CheckCircle className="mr-2 h-3 w-3" /> Mark as Paid
                            </DropdownMenuItem>
                            <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(inv.id)}>
                          
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
    </div>);

}
