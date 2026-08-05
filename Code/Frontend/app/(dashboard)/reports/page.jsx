"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, FileSpreadsheet, Package, AlertTriangle, Activity, TrendingUp, RefreshCw, BarChart3, Database } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";

import { Button } from "@/components/ui/button";
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
        } else {
          setReportData(Array.isArray(res.data) ? res.data : []);
          setMovementSeries([]);
        }
      } else {
        setReportData([]);
        setMovementSeries([]);
      }
      if (showToast) toast.success("Report refreshed successfully");
    } catch (error) {
      setReportData([]);
      setMovementSeries([]);
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

  const exportToExcel = () => {
    if (!reportData.length) {
      toast.error("No data to export");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${activeTab}-report.xlsx`);
    toast.success("Excel downloaded");
  };

  const exportToPDF = useReactToPrint({
    content: () => printRef.current,
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
            <div className="p-2.5 bg-cyan-500/20 rounded-xl border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Reports & Analytics
            </h1>
          </div>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Generate and export reports from live inventory data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => loadReport(activeTab, true)} 
            disabled={loading} 
            className="bg-slate-900/50 border-white/10 hover:bg-white/10 text-slate-200 hover:text-white backdrop-blur-xl rounded-xl h-10 transition-all"
          >
            <RefreshCw className={`mr-2 h-4 w-4 text-cyan-400 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button 
            onClick={exportToExcel} 
            disabled={!reportData.length}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl h-10 px-5 shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-all"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
          </Button>
          <Button 
            onClick={exportToPDF} 
            disabled={!reportData.length}
            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl h-10 px-5 shadow-[0_0_15px_rgba(244,63,94,0.1)] transition-all"
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
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/30 border border-transparent text-slate-400 hover:text-slate-200 transition-all shadow-none data-[state=active]:shadow-[0_0_15px_rgba(6,182,212,0.1)]"
          >
            <Package className="mr-2 h-4 w-4" /> Inventory
          </TabsTrigger>
          <TabsTrigger 
            value="movements" 
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/30 border border-transparent text-slate-400 hover:text-slate-200 transition-all shadow-none data-[state=active]:shadow-[0_0_15px_rgba(6,182,212,0.1)]"
          >
            <Activity className="mr-2 h-4 w-4" /> Movements
          </TabsTrigger>
          <TabsTrigger 
            value="low_stock" 
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400 data-[state=active]:border-rose-500/30 border border-transparent text-slate-400 hover:text-slate-200 transition-all shadow-none data-[state=active]:shadow-[0_0_15px_rgba(244,63,94,0.1)]"
          >
            <AlertTriangle className="mr-2 h-4 w-4" /> Low Stock
          </TabsTrigger>
          <TabsTrigger 
            value="forecast" 
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 data-[state=active]:border-purple-500/30 border border-transparent text-slate-400 hover:text-slate-200 transition-all shadow-none data-[state=active]:shadow-[0_0_15px_rgba(168,85,247,0.1)]"
          >
            <TrendingUp className="mr-2 h-4 w-4" /> Forecast
          </TabsTrigger>
          <TabsTrigger 
            value="purchases" 
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/30 border border-transparent text-slate-400 hover:text-slate-200 transition-all shadow-none data-[state=active]:shadow-[0_0_15px_rgba(6,182,212,0.1)]"
          >
            <Database className="mr-2 h-4 w-4" /> Purchases
          </TabsTrigger>
          <TabsTrigger 
            value="sales" 
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400 data-[state=active]:border-indigo-500/30 border border-transparent text-slate-400 hover:text-slate-200 transition-all shadow-none data-[state=active]:shadow-[0_0_15px_rgba(99,102,241,0.1)]"
          >
            <Activity className="mr-2 h-4 w-4" /> Sales
          </TabsTrigger>
        </TabsList>

        <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

          <CardHeader className="px-8 py-6 border-b border-white/5 bg-slate-950/20 relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-xl font-bold text-slate-100">{tabTitles[activeTab]}</CardTitle>
              <CardDescription className="text-slate-400 mt-1">
                {loading ? "Loading report data..." : `Generated ${reportData.length} records`}
              </CardDescription>
            </div>
            
            {(activeTab === "purchases" || activeTab === "sales") && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                />
                <span className="text-sm text-slate-500">to</span>
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
                <Table>
                  <TableHeader className="bg-slate-950/40 border-b border-white/5">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-4 pl-8 font-semibold text-slate-300">Transaction Type</TableHead>
                      <TableHead className="py-4 pr-8 text-right font-semibold text-slate-300">Total Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-slate-400 py-12">
                          <div className="animate-pulse flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
                            Loading movements data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : reportData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-slate-400 py-12">No movement data available.</TableCell>
                      </TableRow>
                    ) : (
                      reportData.map((item, idx) => (
                        <TableRow key={idx} className="hover:bg-slate-800/40 transition-colors border-b border-white/5">
                          <TableCell className="pl-8 py-4 capitalize text-slate-200">
                            {String(item.type).replace(/_/g, " ")}
                          </TableCell>
                          <TableCell className="text-right pr-8 font-mono text-cyan-400 font-semibold text-lg">
                            {item.count}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
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
