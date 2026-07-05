"use client";

import { useRef, useState } from "react";
import { FileText, Download, FileSpreadsheet, Calendar, Package, TrendingUp, TrendingDown, BarChart3, Users } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from "recharts";


const inventoryData = [
  { product: "Wireless Mouse", stock: 12, value: 299.88, category: "Electronics" },
  { product: "USB-C Cable (2m)", stock: 5, value: 49.95, category: "Cables" },
  { product: "Desk Monitor Stand", stock: 8, value: 712.0, category: "Furniture" },
  { product: "Keyboard Wired", stock: 3, value: 135.0, category: "Electronics" },
];

const salesTrendData = [{ month: "Jan", sales: 420 }, { month: "Feb", sales: 380 }, { month: "Mar", sales: 450 }, { month: "Apr", sales: 490 }, { month: "May", sales: 520 }, { month: "Jun", sales: 580 }];
const valuationData = [{ category: "Electronics", value: 974.8, count: 4 }, { category: "Cables", value: 674.95, count: 2 }, { category: "Furniture", value: 712.0, count: 1 }];

const ReportContent = ({ data, title }) => (
  <div className="p-6"><h2 className="text-2xl font-bold mb-4">{title}</h2><table className="w-full border-collapse text-sm"><thead><tr className="bg-slate-100">{Object.keys(data[0] || {}).map(key => <th key={key} className="border p-2 text-left">{key.charAt(0).toUpperCase() + key.slice(1)}</th>)}</tr></thead><tbody>{data.map((row, idx) => <tr key={idx}>{Object.values(row).map((val, i) => <td key={i} className="border p-2">{typeof val === "number" ? val.toLocaleString() : val}</td>)}</tr>)}</tbody></table></div>
);

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("inventory");
  const [dateRange, setDateRange] = useState("30d");
  const printRef = useRef(null);

  const getReportData = () => {
    switch (activeTab) {
      case "inventory": return inventoryData;
      case "valuation": return valuationData;
      case "sales": return salesTrendData;
      default: return inventoryData;
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(getReportData());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${activeTab}-report.xlsx`);
    toast.success("Excel downloaded");
  };

  const exportToPDF = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `${activeTab}-report`,
    onSuccess: () => toast.success("PDF generated"),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-3xl font-bold tracking-tight text-slate-900">Reports & Export</h1><p className="text-slate-500">Generate and export comprehensive reports</p></div>
        <div className="flex gap-2"><Button variant="outline" size="sm" onClick={exportToExcel}><FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" /> Excel</Button><Button variant="outline" size="sm" onClick={exportToPDF}><FileText className="mr-2 h-4 w-4 text-red-600" /> PDF</Button></div>
      </div>

      <div style={{ display: "none" }}><div ref={printRef}><ReportContent data={getReportData()} title="Report" /></div></div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1">
          <TabsTrigger value="inventory" className="text-xs"><Package className="mr-1 h-3 w-3" /> Inventory</TabsTrigger>
          <TabsTrigger value="sales" className="text-xs"><TrendingUp className="mr-1 h-3 w-3" /> Sales</TabsTrigger>
          <TabsTrigger value="valuation" className="text-xs"><BarChart3 className="mr-1 h-3 w-3" /> Valuation</TabsTrigger>
        </TabsList>

        <Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Report</CardTitle><CardDescription>{dateRange === "30d" ? "Last 30 days" : "Last 90 days"}</CardDescription></div><Select value={dateRange} onValueChange={setDateRange}><SelectTrigger className="w-[120px]"><Calendar className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="30d">30 Days</SelectItem><SelectItem value="90d">90 Days</SelectItem></SelectContent></Select></CardHeader>
          <CardContent>
            <TabsContent value="inventory"><Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Value</TableHead></TableRow></TableHeader><TableBody>{inventoryData.map((item, idx) => <TableRow key={idx}><TableCell>{item.product}</TableCell><TableCell>{item.category}</TableCell><TableCell className="text-right">{item.stock}</TableCell><TableCell className="text-right font-mono">£{item.value.toFixed(2)}</TableCell></TableRow>)}<TableRow className="bg-slate-900/60 text-teal-400 font-semibold border-t border-slate-850"><TableCell colSpan={3} className="text-right">Total:</TableCell><TableCell className="text-right">£{inventoryData.reduce((s, i) => s + i.value, 0).toFixed(2)}</TableCell></TableRow></TableBody></Table></TabsContent>
            <TabsContent value="sales"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={salesTrendData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line type="monotone" dataKey="sales" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div></TabsContent>
            <TabsContent value="valuation"><div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={valuationData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="category" /><YAxis /><Tooltip /><Legend /><Bar dataKey="value" fill="#0D9488" name="Value (£)" /><Bar dataKey="count" fill="#8B5CF6" name="Count" /></BarChart></ResponsiveContainer></div></TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}