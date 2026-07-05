"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Printer,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  Mail,
  Edit,
  Trash2,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useUserStore } from "@/lib/store";

// Mock data for detail view
const mockInvoiceDetails = {
  "INV-2024-001": {
    id: "INV-2024-001",
    orderId: "ORD-2024-001",
    customer: "John Smith",
    customerEmail: "john@example.com",
    customerPhone: "+44 20 7123 4567",
    customerAddress: "123 Main St, London, UK",
    date: "2026-07-01",
    dueDate: "2026-07-15",
    status: "paid",
    subtotal: 1245.50,
    tax: 62.28,
    total: 1307.78,
    notes: "Please pay by the due date",
    items: [
      { description: "Wireless Mouse", quantity: 50, unitPrice: 24.99, total: 1249.50 },
    ],
    paymentHistory: [
      { date: "2026-07-14", amount: 1307.78, method: "Credit Card", status: "completed" },
    ],
    createdBy: "Admin",
  },
  "INV-2024-002": {
    id: "INV-2024-002",
    orderId: "ORD-2024-002",
    customer: "Sarah Johnson",
    customerEmail: "sarah@example.com",
    customerPhone: "+44 20 7123 4568",
    customerAddress: "456 Park Ave, Manchester, UK",
    date: "2026-07-03",
    dueDate: "2026-07-17",
    status: "unpaid",
    subtotal: 875.00,
    tax: 43.75,
    total: 918.75,
    notes: "Payment pending",
    items: [
      { description: "USB-C Cable (2m)", quantity: 100, unitPrice: 8.75, total: 875.00 },
    ],
    paymentHistory: [],
    createdBy: "Manager",
  },
};

const statusColors = {
  paid: "bg-green-500",
  unpaid: "bg-amber-500",
  overdue: "bg-red-500",
  draft: "bg-slate-400",
};

const statusIcons = {
  paid: <CheckCircle className="mr-1 h-4 w-4" />,
  unpaid: <Clock className="mr-1 h-4 w-4" />,
  overdue: <AlertCircle className="mr-1 h-4 w-4" />,
  draft: <Clock className="mr-1 h-4 w-4" />,
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { role } = useUserStore();
  const canEdit = role === "admin" || role === "manager";

  const invoice = useMemo(
    () => mockInvoiceDetails[params.id],
    [params.id]
  );

  if (!invoice) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-2xl font-semibold text-slate-700">Invoice Not Found</p>
        <Button onClick={() => router.push("/invoices")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
        </Button>
      </div>
    );
  }

  const handleMarkAsPaid = () => {
    toast.success(`Invoice ${invoice.id} marked as paid`);
  };

  const handleSendEmail = () => {
    toast.success(`Invoice ${invoice.id} sent to ${invoice.customerEmail}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/invoices")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {invoice.id}
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Order: {invoice.orderId}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{invoice.customer}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className={statusColors[invoice.status] + " text-white px-3 py-1"}>
            {statusIcons[invoice.status]}
            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleSendEmail}>
            <Mail className="mr-2 h-4 w-4" /> Send Email
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          {canEdit && invoice.status !== "paid" && (
            <>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={handleMarkAsPaid}
              >
                <CheckCircle className="mr-2 h-4 w-4" /> Mark Paid
              </Button>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Billing Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Bill To
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium text-lg">{invoice.customer}</p>
            <p className="text-sm text-slate-500">{invoice.customerEmail}</p>
            <p className="text-sm text-slate-500">{invoice.customerPhone}</p>
            <p className="text-sm text-slate-500">{invoice.customerAddress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">
              Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm">
              <span className="font-medium">Invoice Date:</span> {invoice.date}
            </p>
            <p className="text-sm">
              <span className="font-medium">Due Date:</span> {invoice.dueDate}
            </p>
            <p className="text-sm">
              <span className="font-medium">Created By:</span> {invoice.createdBy}
            </p>
            <p className="text-sm">
              <span className="font-medium">Order ID:</span> {invoice.orderId}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Invoice Items</CardTitle>
          <CardDescription>Products and services on this invoice</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">£{item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono">
                    £{item.total.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">
                  Subtotal
                </TableCell>
                <TableCell className="text-right font-mono">
                  £{invoice.subtotal.toFixed(2)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">
                  Tax (5%)
                </TableCell>
                <TableCell className="text-right font-mono">
                  £{invoice.tax.toFixed(2)}
                </TableCell>
              </TableRow>
              <TableRow className="bg-teal-50 font-semibold">
                <TableCell colSpan={3} className="text-right text-teal-900">
                  Total
                </TableCell>
                <TableCell className="text-right font-mono text-lg text-teal-700">
                  £{invoice.total.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment History */}
      {invoice.paymentHistory && invoice.paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Payment History</CardTitle>
            <CardDescription>Transaction records for this invoice</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.paymentHistory.map((payment, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{payment.date}</TableCell>
                    <TableCell className="text-right font-mono">
                      £{payment.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-500">
                        <CheckCircle className="mr-1 h-3 w-3" /> Completed
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payment Button (if unpaid) */}
      {invoice.status === "unpaid" && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex flex-wrap items-center justify-between p-4">
            <div>
              <p className="font-medium text-amber-800">Payment Required</p>
              <p className="text-sm text-amber-700">
                This invoice is due on {invoice.dueDate}. Total: £{invoice.total.toFixed(2)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button className="bg-amber-600 hover:bg-amber-700">
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="4" width="22" height="16" rx="2" />
                  <path d="M7 12h10" />
                </svg>
                Pay Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
