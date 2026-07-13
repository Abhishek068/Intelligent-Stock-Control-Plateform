"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Package, AlertTriangle, TrendingUp } from "lucide-react";
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

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id;

  const [product, setProduct] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [recommendation, setRecommendation] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const [detail, recs, ins, outs, adjs, forecastRes] = await Promise.all([
        productsApi.get(productId),
        analyticsApi.listRecommendations().catch(() => []),
        stockApi.listStockIn(productId).catch(() => []),
        stockApi.listStockOut(productId).catch(() => []),
        stockApi.listAdjustments(productId).catch(() => []),
        analyticsApi.getForecast(productId).catch(() => null)]
        );

        if (!mounted) return;
        setProduct(detail);
        setRecommendation(recs.find((r) => String(r.product) === String(productId)) ?? null);
        setForecast(forecastRes?.success ? forecastRes.data : null);

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
    if (!forecast?.chart) return [];
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push("/products")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-100">{product.name}</h1>
            <p className="font-mono text-sm text-slate-400">{product.sku}</p>
          </div>
          <Badge variant={statusBadge}>{product.status}</Badge>
        </div>
        {product.barcode &&
        <div className="rounded-lg border bg-white p-3">
            <QRCodeSVG value={product.barcode || product.sku} size={64} />
          </div>
        }
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Current Stock</p>
            <p className="text-2xl font-bold">{product.stock}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Reorder Level</p>
            <p className="text-2xl font-bold">{product.reorder_level}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Unit Price</p>
            <p className="text-2xl font-bold">£{Number(product.unit_price).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400">Suggested Reorder</p>
            <p className="text-2xl font-bold text-teal-600">
              {recommendation?.suggested_quantity ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="movements">Movements</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm md:grid-cols-2">
              <p>
                <span className="text-slate-400">Category:</span> {product.category_name}
              </p>
              <p>
                <span className="text-slate-400">Supplier:</span> {product.supplier_name}
              </p>
              <p>
                <span className="text-slate-400">Minimum Level:</span> {product.minimum_level}
              </p>
              <p>
                <span className="text-slate-400">Description:</span> {product.description || "—"}
              </p>
            </CardContent>
          </Card>

          {product.inventory_by_location?.length > 0 &&
          <Card className="glass-card">
              <CardHeader>
                <CardTitle>Stock by Location</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">On Hand</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.inventory_by_location.map((row) =>
                  <TableRow key={row.location_id}>
                        <TableCell>{row.location_name}</TableCell>
                        <TableCell className="text-right font-mono">{row.quantity_on_hand}</TableCell>
                        <TableCell className="text-right font-mono">{row.available}</TableCell>
                      </TableRow>
                  )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          }

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
              {chartData.length === 0 ?
              <p className="text-center text-slate-400">No forecast data — run seed_demo_data or generate forecast.</p> :

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
              }
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
        </TabsContent>
      </Tabs>
    </div>);

}
