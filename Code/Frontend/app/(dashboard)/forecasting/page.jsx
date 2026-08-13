"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TrendingUp, Package, RefreshCw, BarChart2, Calendar, Target, ShoppingCart, Activity, LineChart } from "lucide-react";
import {
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ComposedChart,
  Legend,
  BarChart
} from "recharts";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { productsApi, analyticsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { ExternalFactorsPanel, DemandPatternBadge } from "@/features/dashboard/components";

export default function ForecastingPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [chartPayload, setChartPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

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

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await analyticsApi.getForecastSummary();
      if (res.success && res.data) {
        setSummaryData(res.data);
      }
    } catch (err) {
      toast.error("Failed to load forecast summary.");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProductId) loadForecast(selectedProductId);
  }, [selectedProductId, loadForecast]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const chartData = useMemo(() => {
    if (!chartPayload?.chart || (!chartPayload.chart.history?.length && !chartPayload.chart.forecast?.length)) {
  
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
        loadSummary();
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
        <Badge variant="outline" className="text-purple-650 border-purple-500/30">
          <TrendingUp className="mr-1 h-3 w-3 text-purple-400" /> E08
        </Badge>
      </div>

      <div className="flex border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-2 text-sm font-semibold transition-colors ${activeTab === "overview"
              ? "text-indigo-400 border-b-2 border-indigo-400"
              : "text-slate-400 hover:text-slate-200"
            }`}
        >
          Organization Summary
        </button>
        <button
          onClick={() => setActiveTab("product")}
          className={`pb-2 text-sm font-semibold transition-colors ${activeTab === "product"
              ? "text-indigo-400 border-b-2 border-indigo-400"
              : "text-slate-400 hover:text-slate-200"
            }`}
        >
          Individual Product Forecast
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="glass-card bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Total Projected Demand</p>
                    <h3 className="text-2xl font-bold text-slate-100 mt-1">
                      {summaryData?.total_predicted_demand ? Math.round(summaryData.total_predicted_demand).toLocaleString() : "0"}
                    </h3>
                  </div>
                  <div className="rounded-full bg-purple-500/10 p-3 text-purple-400">
                    <Target className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Actual Sales (90 Days)</p>
                    <h3 className="text-2xl font-bold text-slate-100 mt-1">
                      {summaryData?.total_actual_sales_90_days?.toLocaleString() ?? "0"}
                    </h3>
                  </div>
                  <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-400">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Active Forecast Models</p>
                    <h3 className="text-base font-bold text-slate-100 mt-2">
                      Exponential Smoothing
                    </h3>
                  </div>
                  <div className="rounded-full bg-blue-500/10 p-3 text-blue-400">
                    <Activity className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card bg-slate-900/50 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">Tracked Products</p>
                    <h3 className="text-2xl font-bold text-slate-100 mt-1">
                      {products.length} Items
                    </h3>
                  </div>
                  <div className="rounded-full bg-pink-500/10 p-3 text-pink-400">
                    <Package className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-slate-800 bg-slate-900/40 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-200">
                  <LineChart className="h-5 w-5 text-indigo-400" />
                  Monthly Demand Forecast
                </CardTitle>
                <CardDescription>Predicted sales aggregated month-by-month</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {summaryData?.monthly_forecast?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={summaryData.monthly_forecast}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px" }} />
                      <Legend />
                      <Line type="monotone" dataKey="predicted" stroke="#8B5CF6" strokeWidth={2.5} name="Predicted Demand" />
                      <Line type="monotone" dataKey="actual" stroke="#0D9488" strokeWidth={2} strokeDasharray="3 3" name="Actual Sales" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center text-slate-450">
                    {summaryLoading ? "Loading..." : "No summary data found — try generating forecasts for products."}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/40 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-200">
                  <BarChart2 className="h-5 w-5 text-indigo-400" />
                  Predicted vs Actual Sales
                </CardTitle>
                <CardDescription>Comparison of historical actual sales and forecasted volumes</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {summaryData?.monthly_forecast?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={summaryData.monthly_forecast}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px" }} />
                      <Legend />
                      <Bar dataKey="actual" fill="#0D9488" radius={[4, 4, 0, 0]} name="Actual Sales" />
                      <Line type="monotone" dataKey="predicted" stroke="#EC4899" strokeWidth={2.5} name="Predicted Demand" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center text-slate-450">
                    {summaryLoading ? "Loading..." : "No summary data found."}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/40 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-200">
                  <Calendar className="h-5 w-5 text-indigo-400" />
                  Weekly Demand Trend
                </CardTitle>
                <CardDescription>Detailed weekly forecast vs actual tracking</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {summaryData?.weekly_trend?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={summaryData.weekly_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px" }} />
                      <Legend />
                      <Line type="monotone" dataKey="predicted" stroke="#3B82F6" strokeWidth={2} name="Forecasted" />
                      <Line type="monotone" dataKey="actual" stroke="#10B981" strokeWidth={2} name="Actual" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center text-slate-450">
                    {summaryLoading ? "Loading..." : "No summary data found."}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/40 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-200">
                  <TrendingUp className="h-5 w-5 text-indigo-400" />
                  Top 10 Products with Highest Forecasted Demand
                </CardTitle>
                <CardDescription>Product safety and replenishment priorities by size</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {summaryData?.top_10?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summaryData.top_10} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" fontSize={11} stroke="#94a3b8" />
                      <YAxis dataKey="product_name" type="category" width={110} fontSize={10} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px" }} />
                      <Bar dataKey="predicted_demand" fill="#EC4899" radius={[0, 4, 4, 0]} name="Predicted Demand" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="flex h-full items-center justify-center text-slate-450">
                    {summaryLoading ? "Loading..." : "No products forecasted yet."}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />
            
            <CardContent className="flex flex-wrap items-center gap-4 p-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                  <Package className="h-5 w-5" />
                </div>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <div className="relative w-[300px] flex items-center group cursor-text">
                      <Search className="absolute left-3 h-4 w-4 text-slate-400 group-hover:text-indigo-400 transition-colors pointer-events-none" />
                      <Input
                        placeholder="Search for a product..."
                        className="pl-9 pr-4 bg-slate-950/50 border-white/10 hover:border-indigo-500/50 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-slate-200 rounded-xl h-10 w-full cursor-text"
                        value={selectedProductId ? products.find(p => String(p.id) === selectedProductId)?.name || "" : ""}
                        readOnly
                      />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0 bg-slate-900 border-white/10 shadow-2xl rounded-xl">
                    <Command className="bg-transparent">
                      <CommandInput placeholder="Search products by name..." className="text-slate-200" />
                      <CommandList>
                        <CommandEmpty className="text-slate-400 py-6 text-sm text-center">No product found.</CommandEmpty>
                        <CommandGroup>
                          {products.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={p.name}
                              onSelect={() => {
                                setSelectedProductId(String(p.id));
                              }}
                              className="text-slate-300 aria-selected:bg-indigo-500/20 aria-selected:text-indigo-300"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 text-indigo-400",
                                  selectedProductId === String(p.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {p.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex items-center gap-3 ml-auto">
                <Button 
                  variant="outline" 
                  onClick={() => loadForecast(selectedProductId)} 
                  disabled={loading}
                  className="bg-slate-900/50 border-white/10 text-slate-300 hover:bg-white/5 hover:text-white rounded-xl"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                </Button>
                <Button 
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/20 border border-indigo-500/50 rounded-xl" 
                  onClick={handleGenerate} 
                  disabled={generating || !selectedProductId}
                >
                  {generating ? "Generating..." : "Generate Forecast"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-slate-800 bg-slate-900/40 shadow-sm">
              <CardHeader>
                <CardTitle className="text-slate-200">Demand Forecast</CardTitle>
                <CardDescription>
                  {selectedProduct?.name || "—"} · Actual vs Predicted
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                {loading ? (
                  <p className="flex h-full items-center justify-center text-slate-400">
                    Loading...
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-800" stroke="#1e293b" />
                      <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" />
                      <YAxis fontSize={11} stroke="#94a3b8" />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px" }} />
                      <Legend />
                      <Line type="monotone" dataKey="actual" stroke="#0D9488" strokeWidth={2} dot={{ r: 2 }} name="Actual" />
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke="#8B5CF6"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ r: 2 }}
                        name="Predicted"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="glass-card bg-slate-900/50 border-slate-800">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-200">Accuracy & Pattern</CardTitle>
                  <DemandPatternBadge patternInfo={metrics?.demand_pattern_info || metrics?.weather_context?.demand_pattern_info} />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">MAE</span>
                      <span className="font-mono font-bold text-slate-200">{metrics.mae ?? "—"}</span>
                    </div>
                    <Progress value={metrics.mae ? Math.min(100, 100 - Number(metrics.mae)) : 0} className="mt-1 h-1 bg-slate-800" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">RMSE</span>
                      <span className="font-mono font-bold text-slate-200">{metrics.rmse ?? "—"}</span>
                    </div>
                    <Progress value={metrics.rmse ? Math.min(100, 100 - Number(metrics.rmse)) : 0} className="mt-1 h-1 bg-slate-800" />
                  </div>
                  <div>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 text-sm mt-4 pt-2 border-t border-slate-800">
                      <span className="text-slate-400 font-medium">Model</span>
                      <span className="font-mono text-[11px] text-cyan-300 break-all">{metrics.model_name ?? "—"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* External Influencing Factors Panel */}
              <ExternalFactorsPanel weatherContext={metrics?.weather_context || {}} />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
