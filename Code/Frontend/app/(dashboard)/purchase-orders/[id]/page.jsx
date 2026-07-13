"use client";

import { useParams, useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  ArrowLeft,
  Printer,
  Download,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Trash2 } from
"lucide-react";


import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle } from
"@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";

import { useUserStore } from "@/lib/store";

const mockOrderDetails = {
  "PO-2024-001": {
    id: "PO-2024-001",
    supplier: "TechSupply Ltd",
    supplierContact: "John Doe",
    supplierEmail: "john@techsupply.com",
    orderDate: "2026-07-01",
    expectedDelivery: "2026-07-10",
    status: "received",
    totalAmount: 1250.0,
    notes: "Urgent order for Q3 inventory",
    items: [
    { product: "Wireless Mouse", sku: "SKU-001", quantity: 50, unitCost: 24.99, total: 1249.5 }],

    createdBy: "Admin",
    createdAt: "2026-07-01 10:30:00"
  }
};

const statusColors = {
  draft: "bg-slate-400",
  sent: "bg-blue-500",
  received: "bg-green-500",
  cancelled: "bg-red-500"
};

const statusIcons = {
  draft: <Clock className="mr-1 h-4 w-4" />,
  sent: <Truck className="mr-1 h-4 w-4" />,
  received: <CheckCircle className="mr-1 h-4 w-4" />,
  cancelled: <XCircle className="mr-1 h-4 w-4" />
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { role } = useUserStore();
  const canEdit = role === "admin" || role === "manager";

  const order = useMemo(
    () => mockOrderDetails[params.id],
    [params.id]
  );

  if (!order) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-2xl font-semibold text-slate-300">Order Not Found</p>
        <Button onClick={() => router.push("/purchase-orders")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders
        </Button>
      </div>);

  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/purchase-orders")}>
            
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              {order.id}
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>{order.supplier}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{order.orderDate}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={statusColors[order.status] + " text-white px-3 py-1"}>
            {statusIcons[order.status]}
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Badge>
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" /> PDF
          </Button>
          {canEdit && order.status !== "received" &&
          <>
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </>
          }
        </div>
      </div>

      
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Supplier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{order.supplier}</p>
            <p className="text-sm text-slate-400">{order.supplierContact}</p>
            <p className="text-sm text-slate-400">{order.supplierEmail}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="font-medium">Expected:</span> {order.expectedDelivery}
            </p>
            <p className="text-sm">
              <span className="font-medium">Ordered:</span> {order.orderDate}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold text-teal-600">
              £{order.totalAmount.toFixed(2)}
            </p>
            <p className="text-sm text-slate-400">
              {order.items.length} items · Created by {order.createdBy}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Order Items</CardTitle>
          <CardDescription>Products included in this purchase order</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item, idx) =>
              <TableRow key={idx}>
                  <TableCell className="font-medium">{item.product}</TableCell>
                  <TableCell>{item.sku}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">£{item.unitCost.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    £{item.total.toFixed(2)}
                  </TableCell>
                </TableRow>
              )}
              <TableRow className="bg-slate-900/50 font-semibold">
                <TableCell colSpan={4} className="text-right">
                  Total Amount:
                </TableCell>
                <TableCell className="text-right text-teal-600">
                  £{order.totalAmount.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

   
      {order.notes &&
      <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">{order.notes}</p>
          </CardContent>
        </Card>
      }
    </div>);

}
