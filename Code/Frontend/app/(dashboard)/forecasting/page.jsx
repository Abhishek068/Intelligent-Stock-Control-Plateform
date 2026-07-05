"use client";

import { useState, useMemo } from "react";
import { TrendingUp, Calendar, Package, HelpCircle, Info, ArrowUpDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, ComposedChart, Legend } from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const mockProducts = [
  { id: "1", name: "Wireless Mouse", sku: "SKU-001" },
  { id: "2", name: "USB-C Cable (2m)", sku: "SKU-002" },
  { id: "3", name: "Desk Monitor Stand", sku: "SKU-003" },
];

const generateForecastData = (productId) => {
  const base = [45, 52, 48, 60, 55, 70, 65, 72, 68, 75, 82, 78];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months.map((m, i) => ({
    month: m,
    actual: i < 9 ? base[i] : null,
    predicted: i >= 9 ? base[i] * (1 + (i - 9) * 0.02) : null,
    lowerBound: i >= 9 ? base[i] * (1 + (i - 9) * 0.02) * 0.85 : null,
    upperBound: i >= 9 ? base[i] * (1 + (i - 9) * 0.02) * 1.15 : null,
    naive: i >= 9 ? base[8] * (1 + (i - 9) * 0.01) : null,
  }));
};

const volatilityData = [
  { id: "1", name: "Wireless Mouse", volatility: 0.18, demand: 65, trend: "+8%", class: "Medium" },
  { id: "2", name: "USB-C Cable (2m)", volatility: 0.25, demand: 145, trend: "+5%", class: "High" },
  { id: "3", name: "Desk Monitor Stand", volatility: 0.12, demand: 35, trend: "+12%", class: "Low" },
];

export default function ForecastingPage() {
  const [selectedProductId, setSelectedProductId] = useState("1");
  const [dateRange, setDateRange] = useState("12m");
  const [showConfidence, setShowConfidence] = useState(true);
  const [showNaive, setShowNaive] = useState(false);
  const [intermittentMode, setIntermittentMode] = useState(false);

  const data = useMemo(() => generateForecastData(selectedProductId), [selectedProductId]);
  const selectedProduct = mockProducts.find((p) => p.id === selectedProductId);
  const filteredData = useMemo(() => {
    const slice = dateRange === "6m" ? 6 : 12;
    return data.slice(-slice);
  }, [data, dateRange]);

  const metrics = useMemo(() => {
    const preds = filteredData.filter((d) => d.predicted !== null);
    if (preds.length === 0) return { mae: 0, rmse: 0, mape: 0 };
    const mae = preds.reduce((s, d) => s + Math.abs(d.actual - d.predicted), 0) / preds.length;
    const rmse = Math.sqrt(preds.reduce((s, d) => s + Math.pow(d.actual - d.predicted, 2), 0) / preds.length);
    const mape = (preds.reduce((s, d) => s + Math.abs((d.actual - d.predicted) / d.actual), 0) / preds.length) * 100;
    return { mae: mae.toFixed(1), rmse: rmse.toFixed(1), mape: mape.toFixed(1) };
  }, [filteredData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight text-slate-900">Demand Forecasting</h1><p className="text-slate-500">AI-powered predictions to optimise inventory planning</p></div>
        <Badge variant="outline" className="text-purple-600"><TrendingUp className="mr-1 h-3 w-3" /> E08</Badge>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2"><Package className="h-4 w-4 text-slate-400" />
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>{mockProducts.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-slate-400" />
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="6m">Last 6 months</SelectItem><SelectItem value="12m">Last 12 months</SelectItem></SelectContent>
            </Select>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"><Checkbox id="confidence" checked={showConfidence} onCheckedChange={(v) => setShowConfidence(!!v)} /><Label htmlFor="confidence" className="text-sm">Confidence Band</Label></div>
            <div className="flex items-center gap-2"><Checkbox id="naive" checked={showNaive} onCheckedChange={(v) => setShowNaive(!!v)} /><Label htmlFor="naive" className="text-sm">Baseline (Naive)</Label></div>
            <div className="flex items-center gap-2"><Checkbox id="intermittent" checked={intermittentMode} onCheckedChange={(v) => setIntermittentMode(!!v)} /><Label htmlFor="intermittent" className="text-sm">Intermittent Mode</Label></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div><CardTitle>Demand Forecast</CardTitle><CardDescription>{selectedProduct?.name} · Actual vs Predicted</CardDescription></div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-teal-500" />Actual</span>
                <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-purple-500" />Predicted</span>
                {showNaive && <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded-full bg-slate-400" />Baseline</span>}
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Legend />
                {showConfidence && <Area type="monotone" dataKey="upperBound" stroke="transparent" fill="#C084FC" fillOpacity={0.2} />}
                {showConfidence && <Area type="monotone" dataKey="lowerBound" stroke="transparent" fill="#C084FC" fillOpacity={0.2} />}
                <Line type="monotone" dataKey="actual" stroke="#0D9488" strokeWidth={2} dot={{ r: 3 }} name="Actual" />
                <Line type="monotone" dataKey="predicted" stroke="#8B5CF6" strokeWidth={2} strokeDasharray={intermittentMode ? "2 4" : "0"} dot={{ r: 3 }} name="Predicted" />
                {showNaive && <Line type="monotone" dataKey="naive" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="5 5" dot={{ r: 2 }} name="Baseline" />}
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card><CardHeader><CardTitle className="text-sm font-medium">Accuracy Metrics</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><div className="flex justify-between text-sm"><span className="text-slate-500">MAE</span><span className="font-mono font-bold">{metrics.mae}</span></div><Progress value={70} className="h-1" /></div>
              <div><div className="flex justify-between text-sm"><span className="text-slate-500">RMSE</span><span className="font-mono font-bold">{metrics.rmse}</span></div><Progress value={65} className="h-1" /></div>
              <div><div className="flex justify-between text-sm"><span className="text-slate-500">MAPE</span><span className="font-mono font-bold">{metrics.mape}%</span></div><Progress value={parseFloat(metrics.mape) > 20 ? 30 : 75} className="h-1" /></div>
            </CardContent>
          </Card>

          <Card><CardHeader><CardTitle className="text-sm font-medium">Forecast Model</CardTitle></CardHeader>
            <CardContent>
              <Select defaultValue="ets"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ets">Exponential Smoothing (ETS)</SelectItem><SelectItem value="arima">ARIMA</SelectItem><SelectItem value="prophet">Prophet</SelectItem></SelectContent>
              </Select>
              <Sheet><SheetTrigger asChild><Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-purple-600"><HelpCircle className="mr-1 h-3 w-3" /> Model comparison</Button></SheetTrigger>
                <SheetContent side="right"><div className="mt-6"><h3 className="text-lg font-semibold">Model Comparison</h3><div className="space-y-3 mt-4 text-sm"><div className="flex justify-between border-b py-2"><span>ETS</span><Badge className="bg-green-500">Best</Badge></div><div className="flex justify-between border-b py-2"><span>ARIMA</span><span className="text-slate-500">MAE: 6.8</span></div><div className="flex justify-between border-b py-2"><span>Naive</span><span className="text-slate-500">MAE: 12.4</span></div></div></div></SheetContent></Sheet>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm font-medium"><ArrowUpDown className="h-4 w-4 text-slate-500" /> Product Prioritisation by Volatility</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {volatilityData.map((item) => (
              <div key={item.id} className={`rounded-lg border p-4 ${item.id === selectedProductId ? "border-purple-400 bg-purple-50/50" : "border-slate-200"}`}>
                <div className="flex items-center justify-between"><p className="font-medium">{item.name}</p><Badge className={item.class === "High" ? "bg-red-500" : item.class === "Medium" ? "bg-amber-500" : "bg-green-500"}>{item.class}</Badge></div>
                <div className="mt-2 space-y-1 text-sm"><div className="flex justify-between"><span className="text-slate-500">Volatility</span><span className="font-mono">{(item.volatility * 100).toFixed(0)}%</span></div><div className="flex justify-between"><span className="text-slate-500">Avg Demand</span><span className="font-mono">{item.demand}</span></div></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}