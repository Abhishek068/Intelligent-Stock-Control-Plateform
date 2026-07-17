"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, FileSpreadsheet, Package, AlertTriangle, Activity } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { analyticsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

const REPORT_TYPES = {
  inventory: "inventory",
  movements: "movements",
  low_stock: "low_stock"
};

function ReportContent({ data, title }) {
  if (!data?.length) return <div className="p-6"><h2 className="text-2xl font-bold mb-4">{title}</h2><p>No data</p></div>;
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-800/50">
            {Object.keys(data[0]).map((key) =>
            <th key={key} className="border p-2 text-left capitalize">
                {key.replace(/_/g, " ")}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) =>
          <tr key={idx}>
              {Object.values(row).map((val, i) =>
            <td key={i} className="border p-2">
                  {typeof val === "number" ? val.toLocaleString() : String(val ?? "—")}
                </td>
            )}
            </tr>
          )}
        </tbody>
      </table>
    </div>);

}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState(REPORT_TYPES.inventory);
  const [reportData, setReportData] = useState([]);
  const [movementSeries, setMovementSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef(null);

  const loadReport = useCallback(async (type) => {
    setLoading(true);
    try {
      const res = await analyticsApi.getReport(type);
      if (res.success && res.data) {
        // movements API returns { totals, series }; flatten totals for the table
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
      toast.error(error instanceof ApiError ? error.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, []);

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
    low_stock: "Low Stock Report"
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Reports & Export</h1>
          <p className="text-slate-400">Generate and export reports from live inventory data</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => loadReport(activeTab)} disabled={loading}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportToExcel} disabled={!reportData.length}>
            <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF} disabled={!reportData.length}>
            <FileText className="mr-2 h-4 w-4 text-red-600" /> PDF
          </Button>
        </div>
      </div>

      <div style={{ display: "none" }}>
        <div ref={printRef}>
          <ReportContent data={reportData} title={tabTitles[activeTab]} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-800/50 p-1">
          <TabsTrigger value="inventory" className="text-xs">
            <Package className="mr-1 h-3 w-3" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="movements" className="text-xs">
            <Activity className="mr-1 h-3 w-3" /> Movements
          </TabsTrigger>
          <TabsTrigger value="low_stock" className="text-xs">
            <AlertTriangle className="mr-1 h-3 w-3" /> Low Stock
          </TabsTrigger>
        </TabsList>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{tabTitles[activeTab]}</CardTitle>
              <CardDescription>{loading ? "Loading..." : `${reportData.length} records`}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="inventory">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Value (£)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ?
                  <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-400">Loading...</TableCell>
                    </TableRow> :
                  reportData.length === 0 ?
                  <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-400">No inventory data</TableCell>
                    </TableRow> :

                  <>
                      {reportData.map((item, idx) =>
                    <TableRow key={idx}>
                          <TableCell>{item.product}</TableCell>
                          <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell className="text-right">{item.stock}</TableCell>
                          <TableCell className="text-right font-mono">
                            £{Number(item.value).toFixed(2)}
                          </TableCell>
                        </TableRow>
                    )}
                      <TableRow className="bg-slate-900/50 font-semibold">
                        <TableCell colSpan={4} className="text-right">Total:</TableCell>
                        <TableCell className="text-right font-mono">£{totalInventoryValue.toFixed(2)}</TableCell>
                      </TableRow>
                    </>
                  }
                </TableBody>
              </Table>

              {valuationByCategory.length > 0 &&
              <div className="mt-8 h-64">
                  <h3 className="mb-4 text-sm font-medium text-slate-400">Value by Category</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={valuationByCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#0D9488" name="Value (£)" />
                      <Bar dataKey="count" fill="#8B5CF6" name="Products" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              }
            </TabsContent>

            <TabsContent value="movements">
              {movementSeries.length > 0 && (
                <div className="mb-6 h-64">
                  <h3 className="mb-4 text-sm font-medium text-slate-400">Movements by Day</h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={movementSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={11} tickFormatter={(v) => String(v).slice(5)} />
                      <YAxis fontSize={11} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="stock_in" fill="#0D9488" name="Stock In" />
                      <Bar dataKey="stock_out" fill="#F59E0B" name="Stock Out" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction Type</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ?
                  <TableRow>
                      <TableCell colSpan={2} className="text-center text-slate-400">Loading...</TableCell>
                    </TableRow> :
                  reportData.length === 0 ?
                  <TableRow>
                      <TableCell colSpan={2} className="text-center text-slate-400">No movement data</TableCell>
                    </TableRow> :

                  reportData.map((item, idx) =>
                  <TableRow key={idx}>
                        <TableCell className="capitalize">{String(item.type).replace(/_/g, " ")}</TableCell>
                        <TableCell className="text-right font-mono">{item.count}</TableCell>
                      </TableRow>
                  )
                  }
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="low_stock">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Minimum</TableHead>
                    <TableHead className="text-right">Reorder Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ?
                  <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-400">Loading...</TableCell>
                    </TableRow> :
                  reportData.length === 0 ?
                  <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-400">No low-stock items</TableCell>
                    </TableRow> :

                  reportData.map((item, idx) =>
                  <TableRow key={idx}>
                        <TableCell>{item.product}</TableCell>
                        <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                        <TableCell className="text-right font-mono text-red-600">{item.stock}</TableCell>
                        <TableCell className="text-right">{item.minimum_level}</TableCell>
                        <TableCell className="text-right">{item.reorder_level}</TableCell>
                      </TableRow>
                  )
                  }
                </TableBody>
              </Table>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>);

}
