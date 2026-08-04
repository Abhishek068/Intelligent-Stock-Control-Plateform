"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  FileSpreadsheet,
  Package,
  AlertTriangle,
  Activity,
  TrendingUp,
  RefreshCw,
  Search,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  BarChart3,
  CheckCircle2,
  PieChart as PieIcon,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area } from "recharts";
import { analyticsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

const REPORT_TYPES = {
  inventory: "inventory",
  movements: "movements",
  low_stock: "low_stock",
  forecast: "forecast",
};

function PrintableReportContent({ data, title }) {
  if (!data?.length) return <div className="p-8 text-black font-sans"><h2 className="text-2xl font-bold mb-4">{title}</h2><p>No data available</p></div>;
  return (
    <div className="p-8 text-black font-sans">
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-xs text-slate-500">Generated from Live Inventory Data — {new Date().toLocaleDateString()}</p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-slate-100 rounded text-slate-700">Official Report</span>
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-100 text-slate-700">
            {Object.keys(data[0]).map((key) => (
              <th key={key} className="border border-slate-300 p-2 text-left capitalize font-semibold">
                {key.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              {Object.values(row).map((val, i) => (
                <td key={i} className="border border-slate-200 p-2 text-slate-800">
                  {typeof val === "number" ? val.toLocaleString() : String(val ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// KPI Summary Card
function ReportKpiCard({ title, value, subtitle, icon: Icon, trend, color, glowColor }) {
  return (
    <Card className="relative overflow-hidden bg-slate-900/60 border-slate-800/80 backdrop-blur-xl transition-all duration-300 hover:border-slate-700 hover:shadow-xl group">
      <div className={`absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl ${glowColor} rounded-bl-full pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity`} />
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400">{title}</p>
          <h3 className="text-2xl font-black tracking-tight text-white">{value}</h3>
          {subtitle && <p className="text-[11px] text-slate-400 flex items-center gap-1">{subtitle}</p>}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState(REPORT_TYPES.inventory);
  const [reportData, setReportData] = useState([]);
  const [movementSeries, setMovementSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const printRef = useRef(null);

  const loadReport = useCallback(async (type) => {
    setLoading(true);
    try {
      const res = await analyticsApi.getReport(type);
      if (res.success && res.data) {
        if (type === REPORT_TYPES.movements && !Array.isArray(res.data)) {
          setReportData(res.data.totals || []);
          setMovementSeries(res.data.series || []);
        } else {
          setReportData(Array.isArray(res.data) ? res.data : []);
          setMovementSeries([]);
        }
      } else {
        setReportData([]);
        setMovementSeries([]);
      }
    } catch (error) {
      setReportData([]);
      setMovementSeries([]);
      toast.error(error instanceof ApiError ? error.message : "Failed to load report data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport(activeTab);
    setSearchQuery("");
    setCategoryFilter("all");
  }, [activeTab, loadReport]);

  // Unique categories list
  const categoriesList = useMemo(() => {
    if (!Array.isArray(reportData)) return [];
    const set = new Set();
    reportData.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [reportData]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    if (!Array.isArray(reportData)) return [];
    return reportData.filter((item) => {
      const matchSearch =
        !searchQuery.trim() ||
        (item.product && item.product.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory = categoryFilter === "all" || item.category === categoryFilter;

      return matchSearch && matchCategory;
    });
  }, [reportData, searchQuery, categoryFilter]);

  // Summary Metrics
  const totalInventoryValue = useMemo(() => {
    return reportData.reduce((sum, row) => sum + (Number(row.value) || 0), 0);
  }, [reportData]);

  const valuationByCategory = useMemo(() => {
    if (activeTab !== REPORT_TYPES.inventory) return [];
    const map = {};
    reportData.forEach((row) => {
      const cat = row.category || "Uncategorised";
      if (!map[cat]) map[cat] = { category: cat, value: 0, count: 0 };
      map[cat].value += Number(row.value) || 0;
      map[cat].count += 1;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [reportData, activeTab]);

  const exportToExcel = () => {
    if (!filteredData.length) {
      toast.error("No data to export");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(filteredData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${activeTab}-inventory-report.xlsx`);
    toast.success("Excel report generated successfully");
  };

  const exportToPDF = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `${activeTab}-inventory-report`,
    onAfterPrint: () => toast.success("PDF document generated"),
  });

  const tabTitles = {
    inventory: "Inventory Valuation Report",
    movements: "Stock Movements & Activity Summary",
    low_stock: "Low Stock & Reorder Warning Report",
    forecast: "Predictive Demand Forecast Report",
  };

  return (
    <div className="space-y-6">
      {/* Hidden PDF Printable Component */}
      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <PrintableReportContent data={filteredData} title={tabTitles[activeTab]} />
        </div>
      </div>

      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <BarChart3 className="h-8 w-8 text-blue-400" /> Reports & Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time inventory valuation, stock movements, low stock warnings, and demand forecasts.
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadReport(activeTab);
              toast.success("Data refreshed");
            }}
            disabled={loading}
            className="border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} /> Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportToExcel}
            disabled={!filteredData.length}
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold"
          >
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Export Excel
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            disabled={!filteredData.length}
            className="border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold"
          >
            <FileText className="mr-1.5 h-3.5 w-3.5 text-rose-400" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Top KPI Metrics Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportKpiCard
          title="Total Valuation"
          value={`£${totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Net inventory asset value"
          icon={TrendingUp}
          color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          glowColor="from-emerald-500/20 to-transparent"
        />

        <ReportKpiCard
          title="Total SKUs Tracked"
          value={reportData.length.toLocaleString()}
          subtitle="Active stock records"
          icon={Package}
          color="bg-blue-500/10 text-blue-400 border-blue-500/20"
          glowColor="from-blue-500/20 to-transparent"
        />

        <ReportKpiCard
          title="Low Stock Items"
          value={activeTab === REPORT_TYPES.low_stock ? reportData.length : "Alerts Active"}
          subtitle="Requires purchase order"
          icon={AlertTriangle}
          color="bg-amber-500/10 text-amber-400 border-amber-500/20"
          glowColor="from-amber-500/20 to-transparent"
        />

        <ReportKpiCard
          title="Forecasted Horizon"
          value="30-60 Days"
          subtitle="Predictive demand model"
          icon={TrendingUp}
          color="bg-purple-500/10 text-purple-400 border-purple-500/20"
          glowColor="from-purple-500/20 to-transparent"
        />
      </div>

      {/* Main Tabs Component */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
            <TabsTrigger value="inventory" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs gap-1.5">
              <Package className="h-3.5 w-3.5" /> Inventory Valuation
            </TabsTrigger>
            <TabsTrigger value="movements" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Stock Movements
            </TabsTrigger>
            <TabsTrigger value="low_stock" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Low Stock
            </TabsTrigger>
            <TabsTrigger value="forecast" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Demand Forecast
            </TabsTrigger>
          </TabsList>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search products/SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 text-xs bg-slate-900 border-slate-800 text-white focus:border-blue-500"
              />
            </div>

            {categoriesList.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 text-xs bg-slate-900 border-slate-800 text-white w-36">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="all">All Categories</SelectItem>
                  {categoriesList.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Tab Content Container */}
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                {tabTitles[activeTab]}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                {loading
                  ? "Fetching latest records..."
                  : `Showing ${filteredData.length} of ${reportData.length} records`}
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
              Live Data
            </Badge>
          </CardHeader>

          <CardContent className="pt-4">
            {/* 1. INVENTORY VALUATION TAB */}
            <TabsContent value="inventory" className="space-y-6 mt-0">
              {valuationByCategory.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-emerald-400" /> Valuation Breakdown by Category
                  </h4>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={valuationByCategory} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="category" fontSize={11} stroke="#64748b" tickLine={false} />
                        <YAxis fontSize={11} stroke="#64748b" tickLine={false} tickFormatter={(v) => `£${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px", color: "#fff" }}
                          formatter={(value) => [`£${Number(value).toFixed(2)}`, "Valuation"]}
                        />
                        <Bar dataKey="value" fill="#10b981" radius={[6, 6, 0, 0]} name="Value (£)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Product</TableHead>
                      <TableHead className="text-slate-400">SKU</TableHead>
                      <TableHead className="text-slate-400">Category</TableHead>
                      <TableHead className="text-slate-400 text-right">Current Stock</TableHead>
                      <TableHead className="text-slate-400 text-right">Value (£)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                          <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-2" />
                          Loading inventory valuation data...
                        </TableCell>
                      </TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                          No matching inventory records found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {filteredData.map((item, idx) => (
                          <TableRow key={idx} className="border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                            <TableCell className="font-semibold text-white">{item.product}</TableCell>
                            <TableCell>
                              <span className="font-mono text-xs text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                {item.sku}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-slate-700 text-slate-300 bg-slate-800/50">
                                {item.category || "General"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-slate-200">
                              {item.stock}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-emerald-400">
                              £{Number(item.value).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-slate-950/60 font-bold border-t-2 border-slate-700">
                          <TableCell colSpan={4} className="text-right text-slate-300 text-sm">
                            Total Inventory Asset Value:
                          </TableCell>
                          <TableCell className="text-right font-mono text-base text-emerald-400">
                            £{totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* 2. STOCK MOVEMENTS TAB */}
            <TabsContent value="movements" className="space-y-6 mt-0">
              {movementSeries.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-400" /> Stock In vs Stock Out Velocity
                  </h4>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={movementSeries} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" fontSize={11} stroke="#64748b" tickFormatter={(v) => String(v).slice(5)} />
                        <YAxis fontSize={11} stroke="#64748b" />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "8px" }} />
                        <Legend />
                        <Bar dataKey="stock_in" fill="#10b981" radius={[4, 4, 0, 0]} name="Stock Received (+)" />
                        <Bar dataKey="stock_out" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Stock Issued (-)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Transaction Type</TableHead>
                      <TableHead className="text-slate-400 text-right">Total Quantity / Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-slate-400 py-8">
                          Loading movements...
                        </TableCell>
                      </TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-slate-400 py-8">
                          No stock movement history recorded.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item, idx) => (
                        <TableRow key={idx} className="border-slate-800/60 hover:bg-slate-800/30">
                          <TableCell className="capitalize font-medium text-white">
                            {String(item.type).replace(/_/g, " ")}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-blue-400">
                            {item.count}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* 3. LOW STOCK TAB */}
            <TabsContent value="low_stock" className="space-y-4 mt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Product</TableHead>
                      <TableHead className="text-slate-400">SKU</TableHead>
                      <TableHead className="text-slate-400 text-right">Current Stock</TableHead>
                      <TableHead className="text-slate-400 text-right">Safety Minimum</TableHead>
                      <TableHead className="text-slate-400 text-right">Reorder Point</TableHead>
                      <TableHead className="text-slate-400 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                          Loading low stock alerts...
                        </TableCell>
                      </TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-emerald-400 py-8">
                          <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-80" />
                          All inventory items are currently healthy above minimum safety levels!
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item, idx) => (
                        <TableRow key={idx} className="border-slate-800/60 hover:bg-slate-800/30">
                          <TableCell className="font-semibold text-white">{item.product}</TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              {item.sku}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-rose-400">
                            {item.stock}
                          </TableCell>
                          <TableCell className="text-right text-slate-300">{item.minimum_level}</TableCell>
                          <TableCell className="text-right text-slate-300">{item.reorder_level}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-xs">
                              Critical Low
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* 4. FORECAST TAB */}
            <TabsContent value="forecast" className="space-y-4 mt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Product</TableHead>
                      <TableHead className="text-slate-400">SKU</TableHead>
                      <TableHead className="text-slate-400">Model Used</TableHead>
                      <TableHead className="text-slate-400">Forecast Horizon</TableHead>
                      <TableHead className="text-slate-400 text-right">Projected Demand</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                          Generating demand projections...
                        </TableCell>
                      </TableRow>
                    ) : filteredData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                          No forecast data generated.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredData.map((item, idx) => (
                        <TableRow key={idx} className="border-slate-800/60 hover:bg-slate-800/30">
                          <TableCell className="font-semibold text-white">{item.product}</TableCell>
                          <TableCell>
                            <span className="font-mono text-xs text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                              {item.sku}
                            </span>
                          </TableCell>
                          <TableCell className="capitalize text-xs text-slate-300">
                            <Badge variant="outline" className="border-purple-500/30 text-purple-300 bg-purple-500/10">
                              {item.model?.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-400">
                            {item.start_date} → {item.end_date}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-indigo-400">
                            {Number(item.predicted_demand).toLocaleString()} units
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
