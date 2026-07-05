"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  Truck,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingUp,
  HelpCircle,
  Printer,
  Download,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const mockProducts = [
  {
    id: "1",
    sku: "SKU-001",
    name: "Wireless Mouse",
    category: "Electronics",
    supplier: "TechSupply Ltd",
    supplierContact: "John Doe",
    supplierEmail: "john@techsupply.com",
    stock: 12,
    reorderLevel: 20,
    leadTime: 3,
    unitPrice: 24.99,
    forecastDemand: 45,
    recommendedReorder: 50,
    batch: "B2024-01",
    expiryDate: "2026-12-31",
    status: "low-stock",
    description: "Ergonomic wireless mouse with 2.4GHz connectivity.",
    location: "Warehouse A - Shelf 3",
  },
];

const mockMovements = [
  { date: "2026-07-02 10:30", type: "Stock In", qty: 20, by: "Staff01", ref: "PO-001" },
  { date: "2026-07-01 14:15", type: "Stock Out", qty: 5, by: "Staff02", ref: "SO-042" },
  { date: "2026-06-28 09:00", type: "Adjustment", qty: -2, by: "Admin", ref: "ADJ-012" },
];

const forecastHistory = [
  { month: "Jan", actual: 45, predicted: 42 },
  { month: "Feb", actual: 52, predicted: 48 },
  { month: "Mar", actual: 48, predicted: 55 },
  { month: "Apr", actual: 60, predicted: 58 },
  { month: "May", actual: 55, predicted: 62 },
  { month: "Jun", actual: 70, predicted: 68 },
  { month: "Jul", actual: null, predicted: 72 },
  { month: "Aug", actual: null, predicted: 78 },
];

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id;

  const product = useMemo(() => mockProducts.find((p) => p.id === productId), [productId]);

  if (!product) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Package className="h-16 w-16 text-slate-300" />
        <h2 className="text-2xl font-semibold text-slate-700">Product Not Found</h2>
        <Button onClick={() => router.push("/products")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
        </Button>
      </div>
    );
  }

  const riskScore = Math.min(100, ((product.leadTime * product.forecastDemand) / (product.stock + 1)) * 1.8);
  const riskBg = riskScore > 70 ? "bg-red-500" : riskScore > 40 ? "bg-amber-500" : "bg-green-500";
  const expiryDays = product.expiryDate
    ? Math.ceil((new Date(product.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/products")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{product.name}</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="font-mono text-xs">{product.sku}</span>
              <Badge variant="outline">{product.category}</Badge>
              <span>{product.supplier}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Printer className="mr-2 h-4 w-4" /> Label</Button>
          <Button size="sm">Edit</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-teal-500">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Current Stock</CardTitle></CardHeader>
          <CardContent className="flex items-end justify-between">
            <span className="text-3xl font-bold">{product.stock}</span>
            <Badge className="bg-amber-500">Low Stock</Badge>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-amber-500">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Risk Heat</CardTitle></CardHeader>
          <CardContent>
            <Progress value={riskScore} className="h-2" />
            <p className="mt-2 text-xs text-slate-500">{Math.round(riskScore)}% · {riskScore > 70 ? "High Risk" : "Moderate"}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-blue-500">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Supplier</CardTitle></CardHeader>
          <CardContent>
            <p className="font-medium">{product.supplier}</p>
            <p className="text-xs text-slate-500">Lead: {product.leadTime} days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Forecast Trend</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={forecastHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="actual" stroke="#0D9488" strokeWidth={2} />
                  <Line type="monotone" dataKey="predicted" stroke="#94A3B8" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Movement History</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Qty</TableHead></TableRow></TableHeader>
                <TableBody>
                  {mockMovements.map((movement, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="text-xs">{movement.date}</TableCell>
                      <TableCell><Badge variant="outline">{movement.type}</Badge></TableCell>
                      <TableCell className={`text-right font-mono ${movement.qty > 0 ? "text-green-600" : "text-red-600"}`}>
                        {movement.qty > 0 ? `+${movement.qty}` : movement.qty}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-teal-200 bg-teal-50/50">
            <CardHeader><CardTitle className="text-sm font-medium text-teal-900">Reorder Calculation</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-white/80 p-3 text-xs font-mono">(Forecast × Lead Time) + Safety − Current</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-xs text-slate-500">Forecast</p><p className="font-bold">{product.forecastDemand}</p></div>
                <div><p className="text-xs text-slate-500">Lead Time</p><p className="font-bold">{product.leadTime}d</p></div>
              </div>
              <Separator />
              <div className="flex items-center justify-between rounded-lg bg-teal-100 p-3">
                <span className="text-sm font-semibold">Suggested Order</span>
                <span className="text-2xl font-bold text-teal-700">{product.recommendedReorder}</span>
              </div>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full text-xs text-teal-600">
                    <HelpCircle className="mr-1 h-3 w-3" /> Explain
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                  <div className="mt-6"><h3 className="text-lg font-semibold">Explainable Reorder</h3>
                    <div className="rounded-lg bg-slate-50 p-4 mt-4">
                      <p className="font-mono text-sm">({product.forecastDemand} × {product.leadTime}) + 15 − {product.stock}</p>
                      <p className="mt-2 font-bold text-teal-700">= {product.recommendedReorder}</p>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Barcode & Batch</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <div><p className="text-xs text-slate-500">Barcode</p><p className="font-mono text-sm">{product.sku}</p></div>
                <QRCodeSVG value={product.sku} size={64} />
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Batch</span>
                <span className="font-mono">{product.batch}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-slate-500">Expiry</span>
                <Badge className={expiryDays < 30 ? "bg-red-500" : "bg-blue-500"}>{expiryDays} days</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}