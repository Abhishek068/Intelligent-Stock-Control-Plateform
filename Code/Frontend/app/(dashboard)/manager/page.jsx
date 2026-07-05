"use client";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ShoppingCart, Clock, Package, Truck, HelpCircle, Sparkles } from "lucide-react";

const forecastData = [
  { name: "Jan", actual: 420, predicted: 400 },
  { name: "Feb", actual: 380, predicted: 410 },
  { name: "Mar", actual: 450, predicted: 430 },
  { name: "Apr", actual: 490, predicted: 480 },
  { name: "May", actual: 520, predicted: 510 },
  { name: "Jun", actual: 580, predicted: 560 },
];

const pendingOrders = [
  { id: "PO-2024-01", supplier: "TechSupply Ltd", items: 3, total: 12450, eta: "2026-07-10" },
  { id: "PO-2024-02", supplier: "Global Parts Co", items: 5, total: 8750, eta: "2026-07-15" },
  { id: "PO-2024-03", supplier: "OfficeDirect", items: 2, total: 3200, eta: "2026-07-18" },
];

const reorderRecommendations = [
  { product: "Wireless Mouse", stock: 12, reorderPoint: 20, suggested: 50, priority: "High" },
  { product: "USB-C Cable (2m)", stock: 5, reorderPoint: 15, suggested: 200, priority: "High" },
  { product: "Desk Monitor Stand", stock: 8, reorderPoint: 10, suggested: 25, priority: "Medium" },
  { product: "Keyboard Wired", stock: 3, reorderPoint: 8, suggested: 40, priority: "Critical" },
];

export default function ManagerDashboard() {
  const healthScore = 78;
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Manager Dashboard</h1>
          <p className="text-slate-500">Purchasing decisions, stock risk, and supplier planning</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button><ShoppingCart className="mr-2 h-4 w-4" /> Create PO</Button>
          <Button variant="outline"><Clock className="mr-2 h-4 w-4" /> Schedule Stock-take</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-teal-500 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Inventory Health</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">{healthScore}%</span>
              <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-700">Good</Badge>
            </div>
            <Progress value={healthScore} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card className="border-l-4 border-amber-500 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Items to Reorder</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">14</span>
              <Badge className="bg-amber-500">Critical: 3</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-red-500 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Predicted Stockouts</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">8</span>
              <span className="text-xs text-red-600">↑ 3 from last week</span>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-blue-500 shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-500">Supplier SLA</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold">94%</span>
              <span className="text-xs text-green-600">On-time delivery</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle className="text-sm font-medium">Forecast vs Actual Demand</CardTitle><CardDescription>Exponential Smoothing</CardDescription></div>
            <Badge variant="outline" className="text-teal-600">MAE: 24.5 · RMSE: 31.2</Badge>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData}>
                <XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} /><Tooltip />
                <Line type="monotone" dataKey="actual" stroke="#0D9488" strokeWidth={2} dot={{ fill: "#0D9488" }} />
                <Line type="monotone" dataKey="predicted" stroke="#94A3B8" strokeDasharray="5 5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader><CardTitle className="flex items-center justify-between text-sm font-medium">Pending POs <Badge variant="secondary">{pendingOrders.length}</Badge></CardTitle></CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[260px] px-4">
              <div className="space-y-3">
                {pendingOrders.map((order) => (
                  <div key={order.id} className="flex items-start justify-between rounded-lg border border-slate-100 p-3">
                    <div><p className="text-sm font-medium">{order.id}</p><p className="text-xs text-slate-500">{order.supplier}</p></div>
                    <div className="text-right"><Badge variant="outline" className="border-amber-200 text-amber-700">{order.eta}</Badge></div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle className="text-sm font-medium">Smart Reorder Recommendations</CardTitle></div>
            <Button variant="ghost" size="sm" className="text-teal-600"><Sparkles className="mr-1 h-3 w-3" /> Auto-generate</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {reorderRecommendations.map((item, idx) => (
              <div key={idx} className="flex flex-wrap items-center justify-between rounded-lg border border-slate-100 p-4">
                <div className="flex items-center gap-4">
                  <Badge className={item.priority === "Critical" ? "bg-red-500" : item.priority === "High" ? "bg-amber-500" : "bg-blue-500"}>{item.priority}</Badge>
                  <div><p className="font-medium">{item.product}</p><p className="text-xs text-slate-500">Stock: {item.stock} · Reorder point: {item.reorderPoint}</p></div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right"><p className="text-sm font-semibold text-teal-700">Order {item.suggested}</p></div>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-teal-600"><HelpCircle className="h-4 w-4" /></Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                      <div className="mt-6"><h3 className="text-lg font-semibold">Why reorder {item.product}?</h3>
                        <div className="mt-4 rounded-lg bg-slate-50 p-4">
                          <p className="font-medium">📊 Forecast Demand</p>
                          <p>Next 14 days predicted: <strong>45 units</strong></p>
                        </div>
                        <div className="mt-4 rounded-lg bg-teal-50 p-4">
                          <p className="font-medium text-teal-900">✅ Recommendation Formula</p>
                          <p className="font-mono text-xs">(Forecast × Lead Time) + Safety Stock − Current Stock</p>
                          <p className="mt-1 font-mono text-xs">= <strong>{item.suggested}</strong></p>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="flex items-center justify-between text-sm font-medium">Expiry Risk <Badge variant="secondary" className="bg-red-50 text-red-600">3 soon</Badge></CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2"><div><p className="text-sm font-medium">Bulk Batteries</p></div><Badge className="bg-amber-500">15 days</Badge></div>
            <div className="flex items-center justify-between border-b pb-2"><div><p className="text-sm font-medium">Medi-Kit Refills</p></div><Badge className="bg-red-500">7 days</Badge></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}