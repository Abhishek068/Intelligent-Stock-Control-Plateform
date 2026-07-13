"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TrendingUp, Package, RefreshCw } from "lucide-react";
import {
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ComposedChart,
  Legend } from
"recharts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { productsApi, analyticsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

export default function ForecastingPage() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [chartPayload, setChartPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    productsApi.list().then((p) => {
      setProducts(p);
      if (p.length > 0) setSelectedProductId(String(p[0].id));
    });
  }, []);

  const loadForecast = useCallback(async (productId) => {
    if (!productId) return;
    setLoading(true);
    try {
      const res = await analyticsApi.getForecast(productId);
      if (res.success && res.data) setChartPayload(res.data);
    } catch {
      setChartPayload(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProductId) loadForecast(selectedProductId);
  }, [selectedProductId, loadForecast]);

  const chartData = useMemo(() => {
    if (!chartPayload?.chart) return [];
    const history = (chartPayload.chart.history || []).map((h) => ({
      label: h.date,
      actual: h.actual,
      predicted: null
    }));
    const forecast = (chartPayload.chart.forecast || []).map((f) => ({
      label: f.date,
      actual: null,
      predicted: f.predicted
    }));
    return [...history, ...forecast];
  }, [chartPayload]);

  const metrics = chartPayload?.chart?.metrics || {};
  const selectedProduct = products.find((p) => String(p.id) === selectedProductId);

  const handleGenerate = async () => {
    if (!selectedProductId) return;
    setGenerating(true);
    try {
      const res = await analyticsApi.generateForecast(Number(selectedProductId));
      if (res.success && res.data) {
        setChartPayload({ chart: res.data.chart, latest_forecast: res.data.forecast });
        toast.success("Forecast generated");
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Forecast generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Demand Forecasting</h1>
          <p className="text-slate-400">Statistical demand predictions from stock movement history</p>
        </div>
        <Badge variant="outline" className="text-purple-600">
          <TrendingUp className="mr-1 h-3 w-3" /> E08
        </Badge>
      </div>

      <Card className="glass-card">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-slate-400" />
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) =>
                <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadForecast(selectedProductId)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={handleGenerate} disabled={generating || !selectedProductId}>
            {generating ? "Generating..." : "Generate Forecast"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Demand Forecast</CardTitle>
            <CardDescription>
              {selectedProduct?.name || "—"} · Actual vs Predicted
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {chartData.length === 0 ?
            <p className="flex h-full items-center justify-center text-slate-400">
                {loading ? "Loading..." : "No forecast data — generate a forecast or run seed_demo_data"}
              </p> :

            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="actual" stroke="#0D9488" strokeWidth={2} dot={{ r: 2 }} name="Actual" />
                  <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 2 }}
                  name="Predicted" />
                
                </ComposedChart>
              </ResponsiveContainer>
            }
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Accuracy Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">MAE</span>
                  <span className="font-mono font-bold">{metrics.mae ?? "—"}</span>
                </div>
                <Progress value={metrics.mae ? Math.min(100, 100 - Number(metrics.mae)) : 0} className="mt-1 h-1" />
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">RMSE</span>
                  <span className="font-mono font-bold">{metrics.rmse ?? "—"}</span>
                </div>
                <Progress value={metrics.rmse ? Math.min(100, 100 - Number(metrics.rmse)) : 0} className="mt-1 h-1" />
              </div>
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Model</span>
                  <span className="font-mono text-xs">{metrics.model_name ?? "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>);

}
