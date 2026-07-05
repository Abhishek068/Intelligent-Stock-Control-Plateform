"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowUpFromLine, Search, Barcode, AlertTriangle, CheckCircle, Calendar, Truck, HelpCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUserStore } from "@/lib/store";


const mockProducts = [
  { id: "1", sku: "SKU-001", name: "Wireless Mouse", stock: 12, reorderLevel: 20, leadTime: 3, batches: [{ batch: "B2024-01", expiry: "2026-12-31", qty: 8 }, { batch: "B2024-04", expiry: "2026-08-20", qty: 4 }] },
  { id: "2", sku: "SKU-002", name: "USB-C Cable (2m)", stock: 5, reorderLevel: 15, leadTime: 5, batches: [{ batch: "B2024-02", expiry: "2027-01-15", qty: 5 }] },
  { id: "3", sku: "SKU-003", name: "Desk Monitor Stand", stock: 8, reorderLevel: 10, leadTime: 7, batches: [] },
  { id: "4", sku: "SKU-004", name: "Keyboard Wired", stock: 3, reorderLevel: 8, leadTime: 2, batches: [{ batch: "B2024-03", expiry: "2026-11-01", qty: 3 }] },
];

const stockOutSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  destination: z.string().min(1, "Select destination"),
  reference: z.string().optional(),
  notes: z.string().optional(),
  useFifo: z.boolean().default(true),
});

export default function StockOutPage() {
  const { role } = useUserStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);

  const form = useForm({
    resolver: zodResolver(stockOutSchema),
    defaultValues: { quantity: 1, useFifo: true },
  });

  const productId = form.watch("productId");
  const quantity = form.watch("quantity") || 0;

  useEffect(() => {
    const product = mockProducts.find((p) => p.id === productId);
    setSelectedProduct(product || null);
    if (product) form.setValue("quantity", 1);
  }, [productId, form]);

  const availableStock = selectedProduct?.stock || 0;
  const isOverIssuing = quantity > availableStock;
  const fifoSuggestion = selectedProduct?.batches?.filter(b => b.qty > 0).sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
  const dailyDemand = 2;
  const predictedDays = Math.floor(availableStock / dailyDemand);

  const onSubmit = (data) => {
    if (isOverIssuing) { toast.error("Quantity exceeds available stock"); return; }
    setIsSubmitting(true);
    setTimeout(() => {
      toast.success(`✅ Issued ${data.quantity} × ${selectedProduct?.name}`);
      setIsSubmitting(false);
      setShowSummary(true);
    }, 1200);
  };

  const handleBarcodeScan = (value) => {
    const found = mockProducts.find((p) => p.sku === value);
    if (found) { form.setValue("productId", found.id); setBarcodeInput(""); toast.success(`🔍 Found: ${found.name}`); } 
    else toast.error("Product not found");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Stock Out</h1><p className="text-slate-500">Issue stock to departments or customers</p></div>
        <Badge variant="outline" className="text-blue-600"><ArrowUpFromLine className="mr-1 h-3 w-3" /> Issuing</Badge>
      </div>

      <Card className="border-blue-100 bg-blue-50/50">
        <CardContent className="flex flex-col items-center gap-3 p-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3"><div className="rounded-full bg-blue-100 p-2 text-blue-600"><Barcode className="h-5 w-5" /></div><div><p className="text-sm font-medium text-blue-900">Barcode Quick-Scan</p></div></div>
          <div className="flex w-full max-w-sm items-center gap-2">
            <Input placeholder="Enter barcode" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleBarcodeScan(barcodeInput.trim()); }} className="border-blue-200 bg-white" />
            <Button variant="outline" className="border-blue-200 text-blue-700" onClick={() => handleBarcodeScan(barcodeInput.trim())}>Scan</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader><CardTitle>Issue Stock</CardTitle></CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField control={form.control} name="productId" render={({ field }) => (
                      <FormItem className="flex flex-col"><FormLabel>Product *</FormLabel>
                        <Popover><PopoverTrigger asChild><Button variant="outline" className="justify-between">{field.value ? mockProducts.find(p => p.id === field.value)?.name : "Select..."}</Button></PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0"><Command><CommandInput placeholder="Search..." /><CommandEmpty>No product.</CommandEmpty><CommandGroup>{mockProducts.map(p => <CommandItem key={p.id} value={p.id} onSelect={() => field.onChange(p.id)}>{p.name} <span className="ml-auto text-xs text-slate-400">Stock: {p.stock}</span></CommandItem>)}</CommandGroup></Command></PopoverContent></Popover>
                        <FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="quantity" render={({ field }) => (
                      <FormItem><FormLabel>Quantity *</FormLabel><FormControl><Input type="number" min="1" max={availableStock} {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>{selectedProduct && <p className="text-xs text-slate-500">Available: <strong>{availableStock}</strong></p>}<FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="destination" render={({ field }) => (
                      <FormItem><FormLabel>Destination *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent><SelectItem value="department-a">Department A</SelectItem><SelectItem value="department-b">Department B</SelectItem><SelectItem value="customer">Customer</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="reference" render={({ field }) => (
                      <FormItem><FormLabel>Reference</FormLabel><FormControl><Input placeholder="SO-2024-042" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="useFifo" render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0"><FormControl><input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-teal-600" /></FormControl><FormLabel className="text-sm font-normal">Use FIFO (earliest expiry first)</FormLabel></FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
                  )} />

                  {isOverIssuing && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Insufficient Stock</AlertTitle><AlertDescription>Only {availableStock} available.</AlertDescription></Alert>}
                  {selectedProduct && !isOverIssuing && quantity > 0 && (availableStock - quantity < selectedProduct.reorderLevel) && (
                    <Alert className="border-amber-200 bg-amber-50"><AlertTriangle className="h-4 w-4 text-amber-600" /><AlertTitle>Warning: Stock will drop below reorder level</AlertTitle></Alert>
                  )}

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => form.reset()}>Reset</Button>
                    <Button type="submit" disabled={isSubmitting || isOverIssuing}>{isSubmitting ? "Processing..." : "Confirm Stock Out"}</Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {selectedProduct && fifoSuggestion && fifoSuggestion.length > 0 && (
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-teal-600" /> FIFO Suggestion</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {fifoSuggestion.map((batch, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg border p-2 text-sm"><div><p className="font-medium">{batch.batch}</p><p className="text-xs text-slate-500">Exp: {batch.expiry} · Qty: {batch.qty}</p></div><Badge variant={new Date(batch.expiry) < new Date(Date.now() + 7*86400000) ? "destructive" : "outline"}>{Math.ceil((new Date(batch.expiry) - Date.now()) / 86400000)} days</Badge></div>
                ))}
              </CardContent>
            </Card>
          )}

          {selectedProduct && (
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Truck className="h-4 w-4 text-amber-600" /> Stockout Prediction</CardTitle></CardHeader>
              <CardContent><div className="flex justify-between text-sm"><span>Current Stock</span><span className="font-mono font-bold">{availableStock}</span></div><div className="flex justify-between text-sm"><span>Days to Stockout</span><span className="font-mono font-bold text-amber-600">{predictedDays > 0 ? `${predictedDays} days` : "Out of stock"}</span></div><Progress value={Math.min(100, (availableStock / selectedProduct.reorderLevel) * 100)} className="h-1.5 mt-2" />
                <Sheet><SheetTrigger asChild><Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-amber-600"><HelpCircle className="mr-1 h-3 w-3" /> How calculated?</Button></SheetTrigger>
                  <SheetContent side="right"><div className="mt-6"><h3 className="text-lg font-semibold">Stockout Prediction</h3><div className="rounded-lg bg-slate-50 p-4 mt-4"><p className="font-mono text-sm">Days = Current Stock / Daily Demand</p><p className="mt-2"><strong>{availableStock}</strong> / <strong>{dailyDemand}</strong> = <span className="font-bold text-amber-700">{predictedDays} days</span></p></div></div></SheetContent></Sheet>
              </CardContent>
            </Card>
          )}

          {showSummary && (
            <Card className="border-amber-200 bg-amber-50/50"><CardHeader><CardTitle className="text-sm font-medium text-amber-800">Audit Preview</CardTitle></CardHeader>
              <CardContent><div className="grid grid-cols-2 gap-1 rounded bg-white/70 p-3 text-sm"><span className="font-medium">Action:</span><span>Stock Out</span><span className="font-medium">Product:</span><span>{selectedProduct?.name}</span><span className="font-medium">Qty:</span><span>-{quantity}</span><span className="font-medium">User:</span><span>{role}</span></div><Button variant="outline" size="sm" onClick={() => setShowSummary(false)}>Close</Button></CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}