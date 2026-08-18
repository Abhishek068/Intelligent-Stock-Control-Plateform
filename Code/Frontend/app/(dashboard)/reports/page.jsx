"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { 
  FileText, 
  FileSpreadsheet, 
  Package, 
  AlertTriangle, 
  Activity, 
  TrendingUp, 
  RefreshCw, 
  BarChart3, 
  Database,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Search,
  ChevronDown,
  ChevronRight,
  Layers,
  Box,
  Calendar,
  User,
  MapPin,
  Tag,
  CheckCircle2,
  ExternalLink,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";
import { analyticsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

const REPORT_TYPES = {
  inventory: "inventory",
  movements: "movements",
  low_stock: "low_stock",
  forecast: "forecast",
  purchases: "purchases",
  sales: "sales"
};

function ReportContent({ data, title }) {
  if (!data?.length) return <div className="p-6"><h2 className="text-2xl font-bold mb-4">{title}</h2><p>No data</p></div>;
  return (
    <div className="p-6 bg-white">
      <h2 className="text-2xl font-bold mb-4 text-black">{title}</h2>
      <table className="w-full border-collapse text-sm text-black">
        <thead>
          <tr className="bg-gray-100">
            {Object.keys(data[0]).map((key) =>
              <th key={key} className="border border-gray-300 p-2 text-left capitalize">
                {key.replace(/_/g, " ")}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) =>
            <tr key={idx}>
              {Object.values(row).map((val, i) =>
                <td key={i} className="border border-gray-300 p-2">
                  {typeof val === "number" ? val.toLocaleString() : String(val ?? "—")}
                </td>
              )}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState(REPORT_TYPES.inventory);
  const [reportData, setReportData] = useState([]);
  const [movementSeries, setMovementSeries] = useState([]);
  const [movementDetails, setMovementDetails] = useState({ stock_in: [], stock_out: [], adjustments: [] });
  const [selectedMovementType, setSelectedMovementType] = useState("stock_in");
  const [movementSearch, setMovementSearch] = useState("");
  const [expandedProductRow, setExpandedProductRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const printRef = useRef(null);

  const loadReport = useCallback(async (type, showToast = false) => {
    setLoading(true);
    try {
      const params = {};
      if ((type === "purchases" || type === "sales") && dateFrom) params.from = dateFrom;
      if ((type === "purchases" || type === "sales") && dateTo) params.to = dateTo;
      const res = await analyticsApi.getReport(type, params);
      if (res.success && res.data) {
        if (type === REPORT_TYPES.movements && !Array.isArray(res.data)) {
          setReportData(res.data.totals || []);
          setMovementSeries(res.data.series || []);
          setMovementDetails(res.data.details || { stock_in: [], stock_out: [], adjustments: [] });
        } else {
          setReportData(Array.isArray(res.data) ? res.data : []);
          setMovementSeries([]);
          setMovementDetails({ stock_in: [], stock_out: [], adjustments: [] });
        }
      } else {
        setReportData([]);
        setMovementSeries([]);
        setMovementDetails({ stock_in: [], stock_out: [], adjustments: [] });
      }
      if (showToast) toast.success("Report refreshed successfully");
    } catch (error) {
      setReportData([]);
      setMovementSeries([]);
      setMovementDetails({ stock_in: [], stock_out: [], adjustments: [] });
      toast.error(error instanceof ApiError ? error.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadReport(activeTab);
  }, [activeTab, loadReport]);

  const valuationByCategory = useMemo(() => {
    if (activeTab !== REPORT_TYPES.inventory) return [];
    const map = {};
    reportData.forEach((row) => {
      const cat = row.category || "Uncategorised";
      if (!map[cat]) map[cat] = { category: cat, value: 0, count: 0 };
      map[cat].value += Number(row.value) || 0;
      map[cat].count += 1;
    });
    return Object.values(map);
  }, [reportData, activeTab]);

  const totalInventoryValue = useMemo(
    () => reportData.reduce((sum, row) => sum + (Number(row.value) || 0), 0),
    [reportData]
  );

  const activeProducts = useMemo(() => {
    if (activeTab !== REPORT_TYPES.movements) return [];
    const list = movementDetails[selectedMovementType] || [];
    if (!movementSearch.trim()) return list;
    const q = movementSearch.toLowerCase().trim();
    return list.filter(
      (p) =>
        p.product_name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.last_supplier?.toLowerCase().includes(q) ||
        p.last_issued_to?.toLowerCase().includes(q) ||
        p.last_reason?.toLowerCase().includes(q)
    );
  }, [activeTab, movementDetails, selectedMovementType, movementSearch]);

  const exportToExcel = () => {
    let dataToExport = reportData;
    if (activeTab === REPORT_TYPES.movements && movementDetails[selectedMovementType]?.length) {
      dataToExport = movementDetails[selectedMovementType].map((item) => ({
        "Product Name": item.product_name,
        "SKU": item.sku,
        "Category": item.category,
        "Total Quantity": item.total_quantity ?? item.net_adjustment,
        "Transaction Count": item.transaction_count,
        "Last Transaction Date": item.last_date || "—",
        "Last Supplier / Recipient / Reason": item.last_supplier || item.last_issued_to || item.last_reason || "—",
        "Last Location": item.last_location || "—",
      }));
    }
    if (!dataToExport || !dataToExport.length) {
      toast.error("No data to export");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${activeTab}-report.xlsx`);
    toast.success("Excel downloaded");
  };

  const exportToPDF = useReactToPrint({
    contentRef: printRef,
    documentTitle: `${activeTab}-report`,
    onAfterPrint: () => toast.success("PDF generated")
  });

  const tabTitles = {
    inventory: "Inventory Valuation Report",
    movements: "Stock Movements Summary",
    low_stock: "Low Stock Report",
    forecast: "Demand Forecast Report",
    purchases: "Purchases Report",
    sales: "Sales / Stock-Out Report"
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-cyan-500/15 dark:bg-cyan-500/20 rounded-xl border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-slate-50 dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              Reports & Analytics
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Generate and export reports from live inventory data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => loadReport(activeTab, true)} 
            disabled={loading} 
            className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl h-10 transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`mr-2 h-4 w-4 text-cyan-600 dark:text-cyan-400 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button 
            onClick={exportToExcel} 
            disabled={!reportData.length}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 rounded-xl h-10 px-5 shadow-xs transition-all cursor-pointer font-semibold"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button 
            onClick={exportToPDF} 
            disabled={!reportData.length}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 rounded-xl h-10 px-5 shadow-xs transition-all cursor-pointer font-semibold"
          >
            <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <ReportContent data={reportData} title={tabTitles[activeTab]} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
          <TabsTrigger 
            value="inventory" 
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-800 data-[state=active]:border-cyan-200 dark:data-[state=active]:bg-cyan-500/20 dark:data-[state=active]:text-cyan-400 dark:data-[state=active]:border-cyan-500/30 border border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all font-semibold cursor-pointer shadow-none"
          >
            <Package className="mr-2 h-4 w-4" /> Inventory
          </TabsTrigger>
          <TabsTrigger 
            value="movements" 
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-800 data-[state=active]:border-cyan-200 dark:data-[state=active]:bg-cyan-500/20 dark:data-[state=active]:text-cyan-400 dark:data-[state=active]:border-cyan-500/30 border border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all font-semibold cursor-pointer shadow-none"
          >
            <Activity className="mr-2 h-4 w-4" /> Movements
          </TabsTrigger>
          <TabsTrigger 
            value="low_stock" 
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-rose-50 data-[state=active]:text-rose-800 data-[state=active]:border-rose-200 dark:data-[state=active]:bg-rose-500/20 dark:data-[state=active]:text-rose-400 dark:data-[state=active]:border-rose-500/30 border border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all font-semibold cursor-pointer shadow-none"
          >
            <AlertTriangle className="mr-2 h-4 w-4" /> Low Stock
          </TabsTrigger>
          <TabsTrigger 
            value="forecast" 
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-800 data-[state=active]:border-purple-200 dark:data-[state=active]:bg-purple-500/20 dark:data-[state=active]:text-purple-400 dark:data-[state=active]:border-purple-500/30 border border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all font-semibold cursor-pointer shadow-none"
          >
            <TrendingUp className="mr-2 h-4 w-4" /> Forecast
          </TabsTrigger>
          <TabsTrigger 
            value="purchases" 
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-cyan-50 data-[state=active]:text-cyan-800 data-[state=active]:border-cyan-200 dark:data-[state=active]:bg-cyan-500/20 dark:data-[state=active]:text-cyan-400 dark:data-[state=active]:border-cyan-500/30 border border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all font-semibold cursor-pointer shadow-none"
          >
            <Database className="mr-2 h-4 w-4" /> Purchases
          </TabsTrigger>
          <TabsTrigger 
            value="sales" 
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-800 data-[state=active]:border-indigo-200 dark:data-[state=active]:bg-indigo-500/20 dark:data-[state=active]:text-indigo-400 dark:data-[state=active]:border-indigo-500/30 border border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all font-semibold cursor-pointer shadow-none"
          >
            <Activity className="mr-2 h-4 w-4" /> Sales
          </TabsTrigger>
        </TabsList>

        <Card className="border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

          <CardHeader className="px-8 py-6 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">{tabTitles[activeTab]}</CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400 mt-1">
                {loading ? "Loading report data..." : `Generated ${reportData.length} records`}
              </CardDescription>
            </div>
            
            {(activeTab === "purchases" || activeTab === "sales") && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 px-3 py-1.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
                <span className="text-sm text-slate-400">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                />
                <Button 
                  size="sm" 
                  onClick={() => loadReport(activeTab)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg px-4 shadow-[0_0_10px_rgba(6,182,212,0.2)] ml-2"
                >
                  Apply
                </Button>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="p-0 relative z-10">
            <div className="overflow-x-auto">
              <TabsContent value="inventory" className="m-0 border-none p-0 outline-none">
                <Table>
                  <TableHeader className="bg-slate-950/40 border-b border-white/5">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-4 pl-8 font-semibold text-slate-300">Product</TableHead>
                      <TableHead className="py-4 font-semibold text-slate-300">SKU</TableHead>
                      <TableHead className="py-4 font-semibold text-slate-300">Category</TableHead>
                      <TableHead className="py-4 text-right font-semibold text-slate-300">Stock</TableHead>
                      <TableHead className="py-4 pr-8 text-right font-semibold text-cyan-400">Value (£)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-400 py-12">
                          <div className="animate-pulse flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                            Loading inventory data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : reportData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-400 py-12">No inventory data available.</TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {reportData.map((item, idx) => (
                          <TableRow key={idx} className="hover:bg-slate-800/40 transition-colors border-b border-white/5">
                            <TableCell className="pl-8 py-3 text-slate-200 font-medium">{item.product}</TableCell>
                            <TableCell className="font-mono text-xs text-slate-400">{item.sku}</TableCell>
                            <TableCell>
                              <Badge className="bg-slate-800 border-white/10 text-slate-300 font-normal">
                                {item.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-slate-300 font-mono">{item.stock}</TableCell>
                            <TableCell className="text-right pr-8 font-mono text-cyan-400 font-semibold">
                              £{Number(item.value).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-slate-950/50 border-t border-white/10 hover:bg-slate-950/50">
                          <TableCell colSpan={4} className="text-right pl-8 py-4 font-bold text-slate-300 uppercase tracking-wider text-xs">
                            Total Value:
                          </TableCell>
                          <TableCell className="text-right pr-8 font-mono text-cyan-400 font-extrabold text-lg">
                            £{totalInventoryValue.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>

                {!loading && valuationByCategory.length > 0 && (
                  <div className="p-8 border-t border-white/5">
                    <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                      <BarChart3 className="h-4 w-4 text-cyan-400" /> Value by Category
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={valuationByCategory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="category" fontSize={11} tick={{fill: '#94a3b8'}} axisLine={{stroke: 'rgba(255,255,255,0.1)'}} />
                          <YAxis fontSize={11} tick={{fill: '#94a3b8'}} axisLine={{stroke: 'rgba(255,255,255,0.1)'}} />
                          <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px'}} />
                          <Legend />
                          <Bar dataKey="value" fill="#06b6d4" name="Value (£)" radius={[4,4,0,0]} />
                          <Bar dataKey="count" fill="#6366f1" name="Products" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="movements" className="m-0 border-none p-0 outline-none">
                {!loading && movementSeries.length > 0 && (
                  <div className="p-8 border-b border-white/5">
                    <h3 className="mb-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                      <Activity className="h-4 w-4 text-cyan-400" /> Movements by Day
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={movementSeries}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="date" fontSize={11} tickFormatter={(v) => String(v).slice(5)} tick={{fill: '#94a3b8'}} axisLine={{stroke: 'rgba(255,255,255,0.1)'}} />
                          <YAxis fontSize={11} tick={{fill: '#94a3b8'}} axisLine={{stroke: 'rgba(255,255,255,0.1)'}} />
                          <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#0F172A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px'}} />
                          <Legend />
                          <Bar dataKey="stock_in" fill="#06b6d4" name="Stock In" radius={[4,4,0,0]} />
                          <Bar dataKey="stock_out" fill="#f59e0b" name="Stock Out" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
                {/* Transaction Types Interactive Cards */}
                <div className="p-6 border-b border-white/5 bg-slate-950/20">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-cyan-400" /> Transaction Types Summary
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">Click any transaction type below to filter and drill down into the affected products.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Stock In Card */}
                    <div
                      onClick={() => {
                        setSelectedMovementType("stock_in");
                        setExpandedProductRow(null);
                      }}
                      className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 backdrop-blur-xl relative overflow-hidden ${
                        selectedMovementType === "stock_in"
                          ? "bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/40"
                          : "bg-slate-900/40 border-white/5 hover:border-white/15 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-cyan-500/15 text-cyan-400 rounded-xl border border-cyan-500/20">
                            <ArrowDownLeft className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-100 text-base">Stock In</h4>
                            <p className="text-xs text-slate-400">Inventory receipts</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={selectedMovementType === "stock_in" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-xs font-semibold" : "bg-slate-800 text-slate-400 border-white/10 text-xs"}>
                          {selectedMovementType === "stock_in" ? "● Active View" : "Click to view"}
                        </Badge>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-baseline justify-between">
                        <div>
                          <span className="text-xs text-slate-400">Total Transactions</span>
                          <p className="text-2xl font-extrabold text-cyan-400 font-mono">
                            {reportData.find((r) => r.type === "stock_in")?.count ?? 0}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400">Total Volume</span>
                          <p className="text-sm font-bold text-slate-200 font-mono">
                            +{movementDetails.stock_in?.reduce((s, p) => s + (p.total_quantity || 0), 0)?.toLocaleString() ?? "—"} units
                          </p>
                          <span className="text-[11px] text-cyan-400 font-medium">
                            {movementDetails.stock_in?.length || 0} products
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Stock Out Card */}
                    <div
                      onClick={() => {
                        setSelectedMovementType("stock_out");
                        setExpandedProductRow(null);
                      }}
                      className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 backdrop-blur-xl relative overflow-hidden ${
                        selectedMovementType === "stock_out"
                          ? "bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40"
                          : "bg-slate-900/40 border-white/5 hover:border-white/15 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-amber-500/15 text-amber-400 rounded-xl border border-amber-500/20">
                            <ArrowUpRight className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-100 text-base">Stock Out</h4>
                            <p className="text-xs text-slate-400">Fulfillments & issues</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={selectedMovementType === "stock_out" ? "bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs font-semibold" : "bg-slate-800 text-slate-400 border-white/10 text-xs"}>
                          {selectedMovementType === "stock_out" ? "● Active View" : "Click to view"}
                        </Badge>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-baseline justify-between">
                        <div>
                          <span className="text-xs text-slate-400">Total Transactions</span>
                          <p className="text-2xl font-extrabold text-amber-400 font-mono">
                            {reportData.find((r) => r.type === "stock_out")?.count ?? 0}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400">Total Volume</span>
                          <p className="text-sm font-bold text-slate-200 font-mono">
                            -{movementDetails.stock_out?.reduce((s, p) => s + (p.total_quantity || 0), 0)?.toLocaleString() ?? "—"} units
                          </p>
                          <span className="text-[11px] text-amber-400 font-medium">
                            {movementDetails.stock_out?.length || 0} products
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Adjustments Card */}
                    <div
                      onClick={() => {
                        setSelectedMovementType("adjustments");
                        setExpandedProductRow(null);
                      }}
                      className={`cursor-pointer rounded-2xl p-5 border transition-all duration-200 backdrop-blur-xl relative overflow-hidden ${
                        selectedMovementType === "adjustments"
                          ? "bg-purple-500/10 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-1 ring-purple-500/40"
                          : "bg-slate-900/40 border-white/5 hover:border-white/15 hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-purple-500/15 text-purple-400 rounded-xl border border-purple-500/20">
                            <SlidersHorizontal className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-100 text-base">Adjustments</h4>
                            <p className="text-xs text-slate-400">Count & variance changes</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={selectedMovementType === "adjustments" ? "bg-purple-500/20 text-purple-300 border-purple-500/40 text-xs font-semibold" : "bg-slate-800 text-slate-400 border-white/10 text-xs"}>
                          {selectedMovementType === "adjustments" ? "● Active View" : "Click to view"}
                        </Badge>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-baseline justify-between">
                        <div>
                          <span className="text-xs text-slate-400">Total Adjustments</span>
                          <p className="text-2xl font-extrabold text-purple-400 font-mono">
                            {reportData.find((r) => r.type === "adjustments")?.count ?? 0}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400">Net Impact</span>
                          <p className="text-sm font-bold text-slate-200 font-mono">
                            {(() => {
                              const net = movementDetails.adjustments?.reduce((s, p) => s + (p.net_adjustment || 0), 0) ?? 0;
                              return `${net > 0 ? "+" : ""}${net.toLocaleString()} units`;
                            })()}
                          </p>
                          <span className="text-[11px] text-purple-400 font-medium">
                            {movementDetails.adjustments?.length || 0} products
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Product Breakdown Table */}
                <div className="p-6 bg-slate-900/30">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${
                        selectedMovementType === "stock_in"
                          ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400"
                          : selectedMovementType === "stock_out"
                          ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                          : "bg-purple-500/20 border-purple-500/30 text-purple-400"
                      }`}>
                        {selectedMovementType === "stock_in" && <ArrowDownLeft className="h-5 w-5" />}
                        {selectedMovementType === "stock_out" && <ArrowUpRight className="h-5 w-5" />}
                        {selectedMovementType === "adjustments" && <SlidersHorizontal className="h-5 w-5" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                          {selectedMovementType === "stock_in" && "Stock In Product Breakdown"}
                          {selectedMovementType === "stock_out" && "Stock Out Product Breakdown"}
                          {selectedMovementType === "adjustments" && "Adjusted Products Breakdown"}
                          <Badge variant="outline" className="text-xs font-mono ml-2 border-white/10 bg-slate-800 text-slate-300">
                            {activeProducts.length} {activeProducts.length === 1 ? "Product" : "Products"}
                          </Badge>
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {selectedMovementType === "stock_in" && "Detailed list of all products received with quantities and supplier details."}
                          {selectedMovementType === "stock_out" && "Detailed list of all products issued/dispatched with quantities and destinations."}
                          {selectedMovementType === "adjustments" && "Detailed list of all products adjusted with count changes and reasons."}
                        </p>
                      </div>
                    </div>

                    <div className="relative w-full sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      <Input
                        placeholder="Search by product, SKU, supplier..."
                        value={movementSearch}
                        onChange={(e) => setMovementSearch(e.target.value)}
                        className="pl-9 bg-slate-950/60 border-white/10 rounded-xl h-9 text-xs text-slate-200 placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 overflow-hidden bg-slate-950/40 shadow-xl">
                    <Table>
                      <TableHeader className="bg-slate-950/60 border-b border-white/5">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="py-3.5 pl-6 font-semibold text-slate-300">Product</TableHead>
                          <TableHead className="py-3.5 font-semibold text-slate-300">Category</TableHead>
                          <TableHead className="py-3.5 text-right font-semibold text-slate-300">
                            {selectedMovementType === "stock_in" && "Total Received"}
                            {selectedMovementType === "stock_out" && "Total Issued"}
                            {selectedMovementType === "adjustments" && "Net Variation"}
                          </TableHead>
                          <TableHead className="py-3.5 text-center font-semibold text-slate-300">Txns</TableHead>
                          <TableHead className="py-3.5 font-semibold text-slate-300">
                            {selectedMovementType === "stock_in" && "Last Supplier & Date"}
                            {selectedMovementType === "stock_out" && "Last Recipient & Date"}
                            {selectedMovementType === "adjustments" && "Last Reason & Date"}
                          </TableHead>
                          <TableHead className="py-3.5 pr-6 text-right font-semibold text-slate-300">Activity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-slate-400 py-12">
                              <div className="animate-pulse flex items-center justify-center gap-2">
                                <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                                Loading product movement data...
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : activeProducts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-slate-400 py-12">
                              <p className="text-sm">No products found matching the search for {selectedMovementType.replace(/_/g, " ")}.</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          activeProducts.map((p) => {
                            const isExpanded = expandedProductRow === `${selectedMovementType}_${p.product_id}`;
                            return (
                              <React.Fragment key={p.product_id}>
                                <TableRow className="hover:bg-slate-800/40 transition-colors border-b border-white/5">
                                  <TableCell className="pl-6 py-4">
                                    <div>
                                      <span className="font-bold text-slate-100 text-sm">{p.product_name}</span>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 border-white/10 bg-slate-900 text-slate-300">
                                          {p.sku}
                                        </Badge>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-4 text-xs text-slate-300">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/60 border border-white/5">
                                      <Tag className="h-3 w-3 text-cyan-400" /> {p.category}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-4 text-right font-mono font-bold text-sm">
                                    {selectedMovementType === "stock_in" && (
                                      <span className="text-cyan-400">+{p.total_quantity?.toLocaleString()} units</span>
                                    )}
                                    {selectedMovementType === "stock_out" && (
                                      <span className="text-amber-400">-{p.total_quantity?.toLocaleString()} units</span>
                                    )}
                                    {selectedMovementType === "adjustments" && (
                                      <span className={p.net_adjustment >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                        {p.net_adjustment > 0 ? `+${p.net_adjustment.toLocaleString()}` : p.net_adjustment?.toLocaleString()} units
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-4 text-center font-mono text-xs text-slate-300">
                                    <Badge variant="outline" className="border-white/10 bg-slate-900 text-slate-300">
                                      {p.transaction_count} {p.transaction_count === 1 ? "entry" : "entries"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-4 text-xs text-slate-300">
                                    <div>
                                      <span className="font-medium text-slate-200">
                                        {p.last_supplier || p.last_issued_to || p.last_reason || "—"}
                                      </span>
                                      <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                                        <Calendar className="h-3 w-3 text-slate-500" /> {p.last_date || "—"}
                                        {p.last_location && (
                                          <>
                                            <span className="text-slate-600">·</span>
                                            <MapPin className="h-3 w-3 text-slate-500" /> {p.last_location}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="pr-6 py-4 text-right">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setExpandedProductRow(isExpanded ? null : `${selectedMovementType}_${p.product_id}`)}
                                      className={`h-8 px-2.5 text-xs rounded-lg border transition-all ${
                                        isExpanded
                                          ? "bg-white/10 border-white/20 text-white"
                                          : "border-white/5 bg-slate-900/60 text-slate-300 hover:bg-white/10 hover:text-white"
                                      }`}
                                    >
                                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5 mr-1" /> : <ChevronRight className="h-3.5 w-3.5 mr-1" />}
                                      {isExpanded ? "Hide Logs" : "View Logs"}
                                    </Button>
                                  </TableCell>
                                </TableRow>

                                {/* Expanded Activity Logs */}
                                {isExpanded && (
                                  <TableRow className="bg-slate-950/80 border-b border-white/10">
                                    <TableCell colSpan={6} className="p-4 pl-10 pr-6">
                                      <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5 text-cyan-400" /> Recent {selectedMovementType.replace(/_/g, " ")} Activity for {p.product_name}
                                          </span>
                                          <span className="text-[11px] text-slate-400">Showing up to 8 most recent transactions</span>
                                        </div>

                                        <div className="grid gap-2">
                                          {(p.transactions || []).map((txn, tIdx) => (
                                            <div key={tIdx} className="flex flex-wrap items-center justify-between gap-3 text-xs p-2.5 rounded-lg bg-slate-950/60 border border-white/5">
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono text-slate-400 text-[11px]">{txn.date || "—"}</span>
                                                <span className="text-slate-600">|</span>
                                                <span className="font-semibold text-slate-200">
                                                  {txn.supplier ? `Supplier: ${txn.supplier}` : txn.issued_to ? `Issued To: ${txn.issued_to}` : `Reason: ${txn.reason}`}
                                                </span>
                                                {txn.reference && txn.reference !== "—" && (
                                                  <Badge variant="outline" className="text-[10px] font-mono px-1 py-0 border-white/10 bg-slate-900 text-slate-400">
                                                    Ref: {txn.reference}
                                                  </Badge>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-4">
                                                {txn.location && (
                                                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                                                    <MapPin className="h-3 w-3" /> {txn.location}
                                                  </span>
                                                )}
                                                <span className="font-mono font-bold text-sm">
                                                  {selectedMovementType === "stock_in" && <span className="text-cyan-400">+{txn.quantity} units</span>}
                                                  {selectedMovementType === "stock_out" && <span className="text-amber-400">-{txn.quantity} units</span>}
                                                  {selectedMovementType === "adjustments" && (
                                                    <span className={txn.diff >= 0 ? "text-emerald-400" : "text-rose-400"}>
                                                      {txn.diff > 0 ? `+${txn.diff}` : txn.diff} units ({txn.previous_qty}→{txn.adjusted_qty})
                                                    </span>
                                                  )}
                                                </span>
                                                {txn.user && (
                                                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                                                    <User className="h-3 w-3" /> {txn.user}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </React.Fragment>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="low_stock" className="m-0 border-none p-0 outline-none">
                <Table>
                  <TableHeader className="bg-slate-950/40 border-b border-white/5">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-4 pl-8 font-semibold text-slate-300">Product</TableHead>
                      <TableHead className="py-4 font-semibold text-slate-300">SKU</TableHead>
                      <TableHead className="py-4 text-right font-semibold text-rose-400">Current Stock</TableHead>
                      <TableHead className="py-4 text-right font-semibold text-slate-300">Minimum</TableHead>
                      <TableHead className="py-4 pr-8 text-right font-semibold text-slate-300">Reorder Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-400 py-12">
                          <div className="animate-pulse flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                            Loading low stock data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : reportData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-slate-400 py-12">No low-stock items.</TableCell>
                      </TableRow>
                    ) : (
                      reportData.map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-800/40 transition-colors border-b border-white/5">
                          <TableCell className="pl-8 py-3 text-slate-200">{item.product}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-400">{item.sku}</TableCell>
                          <TableCell className="text-right font-mono font-bold text-rose-400 bg-rose-500/5">{item.stock}</TableCell>
                          <TableCell className="text-right text-slate-300 font-mono">{item.minimum_level}</TableCell>
                          <TableCell className="text-right pr-8 text-slate-300 font-mono">{item.reorder_level}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="forecast" className="m-0 border-none p-0 outline-none">
                <Table>
                  <TableHeader className="bg-slate-950/40 border-b border-white/5">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-4 pl-8 font-semibold text-slate-300">Product</TableHead>
                      <TableHead className="py-4 font-semibold text-slate-300">SKU</TableHead>
                      <TableHead className="py-4 font-semibold text-slate-300">Model Used</TableHead>
                      <TableHead className="py-4 font-semibold text-slate-300">Start Date</TableHead>
                      <TableHead className="py-4 font-semibold text-slate-300">End Date</TableHead>
                      <TableHead className="py-4 pr-8 text-right font-semibold text-purple-400">Projected Demand</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-400 py-12">
                          <div className="animate-pulse flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                            Loading forecast data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : reportData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-slate-400 py-12">No forecast data generated yet.</TableCell>
                      </TableRow>
                    ) : (
                      reportData.map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-800/40 transition-colors border-b border-white/5">
                          <TableCell className="pl-8 py-3 text-slate-200">{item.product}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-400">{item.sku}</TableCell>
                          <TableCell className="capitalize text-xs text-slate-400">
                            <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/20 font-normal">
                              {item.model?.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-slate-300">{item.start_date}</TableCell>
                          <TableCell className="text-xs text-slate-300">{item.end_date}</TableCell>
                          <TableCell className="text-right pr-8 font-mono text-purple-400 font-semibold bg-purple-500/5">
                            {Number(item.predicted_demand).toLocaleString()} units
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="purchases" className="m-0 border-none p-0 outline-none">
                <Table>
                  <TableHeader className="bg-slate-950/40 border-b border-white/5">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-4 pl-8 font-semibold text-slate-300">Date</TableHead>
                      <TableHead className="py-4 font-semibold text-slate-300">Supplier</TableHead>
                      <TableHead className="py-4 font-semibold text-slate-300">Product</TableHead>
                      <TableHead className="py-4 font-semibold text-slate-300">SKU</TableHead>
                      <TableHead className="py-4 text-right font-semibold text-slate-300">Qty</TableHead>
                      <TableHead className="py-4 text-right font-semibold text-slate-300">Unit Cost</TableHead>
                      <TableHead className="py-4 text-right font-semibold text-cyan-400">Line Value</TableHead>
                      <TableHead className="py-4 font-semibold text-slate-300">Location</TableHead>
                      <TableHead className="py-4 pr-8 font-semibold text-slate-300">Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-slate-400 py-12">
                          <div className="animate-pulse flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                            Loading purchases data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : reportData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-slate-400 py-12">No purchase records found.</TableCell>
                      </TableRow>
                    ) : (
                      reportData.map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-800/40 transition-colors border-b border-white/5">
                          <TableCell className="pl-8 py-3 text-xs text-slate-400">{item.date}</TableCell>
                          <TableCell className="text-slate-200">{item.supplier}</TableCell>
                          <TableCell className="text-slate-200">{item.product}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{item.sku}</TableCell>
                          <TableCell className="text-right text-slate-300 font-mono">{item.qty}</TableCell>
                          <TableCell className="text-right font-mono text-slate-400">£{Number(item.unit_cost || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-cyan-400 font-semibold bg-cyan-500/5">£{Number(item.line_value || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-slate-300 text-sm">{item.location}</TableCell>
                          <TableCell className="pr-8 text-xs text-slate-500">{item.reference || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="sales" className="m-0 border-none p-0 outline-none">
                <Table>
                  <TableHeader className="bg-slate-950/40 border-b border-white/5">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-4 pl-8 font-semibold text-slate-300">Date</TableHead>
                      <TableHead className="py-4 font-semibold text-slate-300">Product</TableHead>
                      <TableHead className="py-4 font-semibold text-slate-300">SKU</TableHead>
                      <TableHead className="py-4 text-right font-semibold text-slate-300">Qty</TableHead>
                      <TableHead className="py-4 text-right font-semibold text-indigo-400">COGS</TableHead>
                      <TableHead className="py-4 font-semibold text-slate-300">Issued to</TableHead>
                      <TableHead className="py-4 font-semibold text-slate-300">Location</TableHead>
                      <TableHead className="py-4 pr-8 font-semibold text-slate-300">Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-slate-400 py-12">
                          <div className="animate-pulse flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                            Loading sales data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : reportData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-slate-400 py-12">No sales records found.</TableCell>
                      </TableRow>
                    ) : (
                      reportData.map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-800/40 transition-colors border-b border-white/5">
                          <TableCell className="pl-8 py-3 text-xs text-slate-400">{item.date}</TableCell>
                          <TableCell className="text-slate-200">{item.product}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{item.sku}</TableCell>
                          <TableCell className="text-right text-slate-300 font-mono">{item.qty}</TableCell>
                          <TableCell className="text-right font-mono text-indigo-400 font-semibold bg-indigo-500/5">£{Number(item.cogs || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-slate-300 text-sm">{item.issued_to || "—"}</TableCell>
                          <TableCell className="text-slate-300 text-sm">{item.location}</TableCell>
                          <TableCell className="pr-8 text-xs text-slate-500">{item.reference || "—"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </div>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
