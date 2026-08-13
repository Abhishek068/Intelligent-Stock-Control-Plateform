"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Package, AlertTriangle, TrendingUp, Box, MapPin, Tag, BarChart3 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid } from
"recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productsApi, analyticsApi, stockApi } from "@/lib/api";
import { ExternalFactorsPanel } from "@/features/dashboard/components";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id;

  const [product, setProduct] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [movements, setMovements] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const [detail, recs, ins, outs, adjs, forecastRes, historyRes] = await Promise.all([
        productsApi.get(productId),
        analyticsApi.listRecommendations().catch(() => []),
        stockApi.listStockIn(productId).catch(() => []),
        stockApi.listStockOut(productId).catch(() => []),
        stockApi.listAdjustments(productId).catch(() => []),
        analyticsApi.getForecast(productId).catch(() => null),
        productsApi.history(productId).catch(() => null)]
        );

        if (!mounted) return;
        setProduct(detail);
        setRecommendation(recs.find((r) => String(r.product) === String(productId)) ?? null);
        setForecast(forecastRes?.success ? forecastRes.data : null);
        if (historyRes?.success) setHistory(historyRes.data);

        const combined = [
        ...ins.map((t) => ({
          date: t.received_at || t.created_at,
          type: "Stock In",
          qty: `+${t.quantity}`,
          by: t.created_by || "—",
          ref: t.reference || "—"
        })),
        ...outs.map((t) => ({
          date: t.issued_at || t.created_at,
          type: "Stock Out",
          qty: `-${t.quantity}`,
          by: t.created_by || "—",
          ref: t.reference || t.issued_to || "—"
        })),
        ...adjs.map((t) => ({
          date: t.adjusted_at || t.created_at,
          type: "Adjustment",
          qty: `${t.previous_qty} → ${t.adjusted_qty}`,
          by: t.created_by || "—",
          ref: t.reason || "—"
        }))].

        sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).
        slice(0, 20);

        setMovements(combined);
      } catch {
        if (mounted) setProduct(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [productId]);

  const chartData = useMemo(() => {
    if (!forecast?.chart || (!forecast.chart.history?.length && !forecast.chart.forecast?.length)) {
      
      const flatData = [];
      const today = new Date();
      for (let i = -7; i <= 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        const label = d.toISOString().split("T")[0];
        flatData.push({
          label,
          actual: i <= 0 ? 0 : null,
          predicted: i >= 0 ? 0 : null
        });
      }
      return flatData;
    }
    const history = (forecast.chart.history || []).map((h) => ({
      label: h.date,
      actual: h.actual,
      predicted: null
    }));
    const preds = (forecast.chart.forecast || []).map((f) => ({
      label: f.date,
      actual: null,
      predicted: f.predicted
    }));
    return [...history, ...preds];
  }, [forecast]);

  if (loading) {
    return <div className="flex h-[40vh] items-center justify-center text-slate-400">Loading...</div>;
  }

  if (!product) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Package className="h-16 w-16 text-slate-300" />
        <h2 className="text-2xl font-semibold text-slate-300">Product Not Found</h2>
        <Button onClick={() => router.push("/products")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
        </Button>
      </div>);

  }

  const statusBadge =
  product.status === "critical" ?
  "destructive" :
  product.status === "low" ?
  "default" :
  "outline";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Header Section */}
      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-4">
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none -z-10" />
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/products")} className="bg-slate-900/50 hover:bg-slate-800 border border-white/5 rounded-xl text-slate-300 transition-all hover:-translate-x-1">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
                {product.name}
              </h1>
              <Badge variant={statusBadge} className={`px-3 py-1 font-semibold uppercase tracking-wider text-[10px] ${statusBadge === "destructive" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : statusBadge === "default" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                {product.status}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <Badge variant="outline" className="bg-slate-900/50 text-indigo-300 border-indigo-500/20 font-mono text-xs shadow-inner">
                SKU: {product.sku}
              </Badge>
              {product.barcode && (
                <Badge variant="outline" className="bg-slate-900/50 text-slate-400 border-white/10 font-mono text-xs shadow-inner">
                  BC: {product.barcode}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {product.barcode && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-2 backdrop-blur-md shadow-xl flex items-center justify-center">
            <div className="bg-white p-2 rounded-lg">
              <QRCodeSVG value={product.barcode || product.sku} size={70} />
            </div>
          </div>
        )}
      </div>

      {/* Advanced Stats Grid */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="bg-slate-900/40 backdrop-blur-xl border-indigo-500/20 shadow-lg relative overflow-hidden group rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Current Stock</p>
                <p className="text-4xl font-extrabold text-slate-100 mt-2">{product.stock}</p>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 ring-1 ring-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                <Package className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 backdrop-blur-xl border-amber-500/20 shadow-lg relative overflow-hidden group rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Reorder Level</p>
                <p className="text-4xl font-extrabold text-slate-100 mt-2">{product.reorder_level}</p>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400 ring-1 ring-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 backdrop-blur-xl border-emerald-500/20 shadow-lg relative overflow-hidden group rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Unit Price</p>
                <p className="text-4xl font-extrabold text-slate-100 mt-2">£{Number(product.unit_price).toFixed(2)}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 ring-1 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <Tag className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/40 backdrop-blur-xl border-teal-500/20 shadow-lg relative overflow-hidden group rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-slate-400 tracking-wide uppercase">Suggested Reorder</p>
                <p className="text-4xl font-extrabold text-teal-400 mt-2">
                  {recommendation?.suggested_quantity ?? "—"}
                </p>
              </div>
              <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400 ring-1 ring-teal-500/20 shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="history">Audit History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-lg font-bold text-slate-200 flex items-center gap-2">
                <Box className="h-5 w-5 text-indigo-400" /> Product Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Category</span>
                    <span className="font-medium text-slate-200">{product.category_name}</span>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Minimum Level</span>
                    <span className="font-mono text-slate-200">{product.minimum_level} units</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Supplier</span>
                    <span className="font-medium text-indigo-300 cursor-pointer hover:underline">{product.supplier_name}</span>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Description</span>
                    <span className="text-sm text-slate-300">{product.description || "No description provided."}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {product.inventory_by_location?.length > 0 && (
            <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative">
              <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-400" /> Stock by Location
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-950/40">
                    <TableRow className="border-b border-white/5 hover:bg-transparent">
                      <TableHead className="py-4 pl-6 text-slate-300 font-semibold">Location</TableHead>
                      <TableHead className="py-4 text-center text-slate-300 font-semibold">On Hand</TableHead>
                      <TableHead className="py-4 text-right pr-6 text-slate-300 font-semibold">Available</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.inventory_by_location.map((row) => (
                      <TableRow key={row.location_id} className="border-b border-white/5 hover:bg-slate-800/40 transition-colors">
                        <TableCell className="pl-6 py-4 font-medium text-slate-200">{row.location_name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-slate-900 text-slate-300 border-white/10 font-semibold px-2.5 py-0.5 shadow-inner">
                            {row.quantity_on_hand}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-semibold px-2.5 py-0.5">
                            {row.available}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {recommendation &&
          <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="flex items-start gap-3 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-900">Reorder Recommendation</p>
                  <p className="text-sm text-amber-800">
                    Order {recommendation.suggested_quantity} units — priority{" "}
                    {recommendation.priority}. Predicted demand: {recommendation.predicted_demand}
                  </p>
                </div>
              </CardContent>
            </Card>
          }
        </TabsContent>

        <TabsContent value="movements">
          <Card className="glass-card">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 ?
                  <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-400">
                        No movements recorded
                      </TableCell>
                    </TableRow> :

                  movements.map((m, idx) =>
                  <TableRow key={idx}>
                        <TableCell>{new Date(m.date).toLocaleString()}</TableCell>
                        <TableCell>{m.type}</TableCell>
                        <TableCell className="font-mono">{m.qty}</TableCell>
                        <TableCell>{m.ref}</TableCell>
                      </TableRow>
                  )
                  }
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" /> Demand Forecast
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip />
                    <Line type="monotone" dataKey="actual" stroke="#0D9488" strokeWidth={2} dot={false} />
                    <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false} />
                  
                  </LineChart>
                </ResponsiveContainer>
              {forecast?.chart?.metrics &&
              <div className="mt-4 flex gap-6 text-sm">
                  {forecast.chart.metrics.mae != null &&
                <span>
                      MAE: <strong>{forecast.chart.metrics.mae}</strong>
                    </span>
                }
                  {forecast.chart.metrics.rmse != null &&
                <span>
                      RMSE: <strong>{forecast.chart.metrics.rmse}</strong>
                    </span>
                }
                  {forecast.chart.metrics.model_name &&
                <span>
                      Model: <strong>{forecast.chart.metrics.model_name}</strong>
                    </span>
                }
                </div>
              }
            </CardContent>
          </Card>

          {/* External Influencing Factors Panel */}
          <ExternalFactorsPanel weatherContext={forecast?.chart?.metrics?.weather_context || forecast?.latest_forecast?.weather_context} className="mt-6" />
        </TabsContent>

        <TabsContent value="history">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Audit History & Version Control</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-center text-slate-500 py-6 text-sm">No changes recorded for this product.</p>
              ) : (
                <div className="relative border-l border-white/10 pl-6 space-y-8 py-2 ml-4">
                  {history.map((h) => (
                    <div key={h.id} className="relative">
                      <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full bg-indigo-500 border-2 border-slate-950" />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-sm text-slate-100">
                          Updated by <span className="text-indigo-400">{h.changed_by_name}</span>
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(h.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1.5 bg-white/[0.02] border border-white/5 rounded-lg p-3">
                        {Object.entries(h.diff).map(([field, diffVal]) => (
                          <div key={field} className="text-sm flex flex-wrap gap-2 items-center">
                            <span className="text-slate-400 capitalize min-w-[120px]">{field.replaceAll("_", " ")}:</span>
                            <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded text-xs line-through max-w-[150px] truncate" title={String(diffVal.old)}>
                              {String(diffVal.old ?? "—")}
                            </span>
                            <span className="text-slate-500">→</span>
                            <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-xs font-medium max-w-[150px] truncate" title={String(diffVal.new)}>
                              {String(diffVal.new ?? "—")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>);

}
