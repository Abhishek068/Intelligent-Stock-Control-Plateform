"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowDownToLine, ArrowUpFromLine, ScanBarcode, ClipboardList, Clock } from "lucide-react";

const todayTasks = [
  { id: 1, task: "Receive stock: Order PO-2024-01", priority: "High", deadline: "Today, 4:00 PM" },
  { id: 2, task: "Issue stock for Department A", priority: "Medium", deadline: "Today, 5:00 PM" },
  { id: 3, task: "Count inventory in Warehouse B", priority: "Low", deadline: "Tomorrow, 10:00 AM" },
];

const recentItems = [
  { product: "Laptop Charger", action: "Stock Out", quantity: 2, time: "10:32 AM" },
  { product: "USB-C Hub", action: "Stock In", quantity: 15, time: "09:15 AM" },
];

const belowThreshold = [
  { product: "Keyboard Wired", current: 3, threshold: 8, gap: -5 },
  { product: "Webcam HD", current: 5, threshold: 6, gap: -1 },
];

export default function StaffDashboard() {
  const [barcodeInput, setBarcodeInput] = useState("");

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold tracking-tight text-slate-900">Staff Dashboard</h1><p className="text-slate-500">Your daily operational tasks & quick actions</p></div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer border-2 border-teal-100 bg-gradient-to-br from-teal-50 to-white shadow-sm hover:shadow-md">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="rounded-full bg-teal-100 p-3 text-teal-600"><ArrowDownToLine className="h-6 w-6" /></div>
            <p className="mt-2 font-semibold text-slate-900">Quick Stock In</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="rounded-full bg-blue-100 p-3 text-blue-600"><ArrowUpFromLine className="h-6 w-6" /></div>
            <p className="mt-2 font-semibold text-slate-900">Quick Stock Out</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-white shadow-sm hover:shadow-md">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="rounded-full bg-purple-100 p-3 text-purple-600"><ScanBarcode className="h-6 w-6" /></div>
            <p className="mt-2 font-semibold text-slate-900">Scan Item</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer border-2 border-amber-100 bg-gradient-to-br from-amber-50 to-white shadow-sm hover:shadow-md">
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            <div className="rounded-full bg-amber-100 p-3 text-amber-600"><ClipboardList className="h-6 w-6" /></div>
            <p className="mt-2 font-semibold text-slate-900">Assigned Tasks</p>
            <p className="text-xs text-slate-500">{todayTasks.length} pending</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-teal-100 bg-teal-50/50 shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 p-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3"><div className="rounded-full bg-teal-100 p-2 text-teal-600"><ScanBarcode className="h-5 w-5" /></div><div><p className="text-sm font-medium text-teal-900">Barcode Quick-Scan</p><p className="text-xs text-teal-700">Scan or type barcode to process item</p></div></div>
          <div className="flex w-full max-w-sm items-center gap-2">
            <Input placeholder="Enter barcode" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} className="border-teal-200 bg-white" />
            <Button variant="outline" className="border-teal-200 text-teal-700">Scan</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader><CardTitle className="flex items-center justify-between text-sm font-medium">Today&apos;s Tasks <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" /> {todayTasks.length}</Badge></CardTitle></CardHeader>
          <CardContent className="p-0"><ScrollArea className="h-[200px] px-4"><div className="space-y-3">{todayTasks.map((task) => (<div key={task.id} className="flex items-start justify-between rounded-lg border border-slate-100 p-3"><div><p className="text-sm font-medium">{task.task}</p><p className="text-xs text-slate-400">{task.deadline}</p></div><Badge variant="outline">{task.priority}</Badge></div>))}</div></ScrollArea></CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-sm font-medium">Recently Processed</CardTitle></CardHeader>
          <CardContent className="space-y-2">{recentItems.map((item, idx) => (<div key={idx} className="flex items-center justify-between border-b pb-2"><div><p className="text-sm font-medium">{item.product}</p><Badge variant="outline" className={item.action === "Stock In" ? "border-green-200 text-green-700" : "border-blue-200 text-blue-700"}>{item.action}</Badge></div><span className="text-xs text-slate-400">{item.time}</span></div>))}</CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader><CardTitle className="flex items-center justify-between text-sm font-medium">Products Below Threshold <Badge variant="secondary" className="bg-red-50 text-red-600">Alert</Badge></CardTitle></CardHeader>
          <CardContent className="space-y-3">{belowThreshold.map((item, idx) => (<div key={idx} className="flex items-center justify-between"><div><p className="text-sm font-medium">{item.product}</p><p className="text-xs text-slate-400">Stock: <span className="font-bold text-red-600">{item.current}</span> / {item.threshold}</p></div><Badge variant="destructive">-{Math.abs(item.gap)}</Badge></div>))}</CardContent>
        </Card>
      </div>
    </div>
  );
}