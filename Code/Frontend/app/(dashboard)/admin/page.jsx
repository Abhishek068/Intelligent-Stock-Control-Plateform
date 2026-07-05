"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, Package, AlertCircle, DollarSign, 
  RefreshCw, FileSpreadsheet, UserPlus, Settings 
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const forecastData = [
  { name: "Mon", actual: 45, predicted: 48 },
  { name: "Tue", actual: 52, predicted: 50 },
  { name: "Wed", actual: 48, predicted: 55 },
  { name: "Thu", actual: 60, predicted: 58 },
  { name: "Fri", actual: 55, predicted: 62 },
  { name: "Sat", actual: 70, predicted: 68 },
];

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
          <p className="text-slate-500">System overview & intelligent inventory insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
          <Button size="sm"><UserPlus className="mr-2 h-4 w-4" /> Add User</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-teal-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£124,582</div>
            <p className="text-xs text-green-600">↑ 12.5% from last month</p>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Low Stock Items</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-amber-600">5 items below safety threshold</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-red-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Out of Stock</CardTitle>
            <Package className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-red-600">Urgent action required</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Open Alerts</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-xs text-blue-600">3 predictive AI alerts</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Forecast vs Actual Demand</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="actual" stroke="#0D9488" strokeWidth={2} />
                <Line type="monotone" dataKey="predicted" stroke="#94A3B8" strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-teal-100 bg-teal-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-teal-800">
              <span className="inline-block h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
              AI Reorder Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b border-teal-100 pb-2">
              <div>
                <p className="font-medium text-sm">Wireless Mouse</p>
                <p className="text-xs text-slate-500">Stock: 12 | Lead time: 3 days</p>
              </div>
              <Button variant="outline" size="sm" className="border-teal-300 text-teal-700">Order 50</Button>
            </div>
            <div className="flex items-center justify-between border-b border-teal-100 pb-2">
              <div>
                <p className="font-medium text-sm">USB-C Cables</p>
                <p className="text-xs text-slate-500">Stock: 5 | Lead time: 5 days</p>
              </div>
              <Button variant="outline" size="sm" className="border-amber-300 text-amber-700">Order 200</Button>
            </div>
            <Button variant="ghost" size="sm" className="w-full text-xs text-teal-600">
              Why these recommendations? (Explainability Drawer)
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-sm font-medium">Recent Audit Anomalies</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between border-b py-1"><span>User &apos;Staff01&apos; adjusted quantity by -50</span><span className="text-amber-600">Pending review</span></div>
            <div className="flex justify-between border-b py-1"><span>Stock transfer #2342 to Warehouse B</span><span className="text-green-600">Completed</span></div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-sm font-medium">System Config Status</CardTitle></CardHeader>
          <CardContent className="flex gap-4 flex-wrap">
            <Button variant="outline" size="sm"><Settings className="mr-2 h-3 w-3" /> Thresholds</Button>
            <Button variant="outline" size="sm"><FileSpreadsheet className="mr-2 h-3 w-3" /> Export Logs</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}