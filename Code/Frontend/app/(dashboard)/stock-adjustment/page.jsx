"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertTriangle, CheckCircle, Info, ArrowRight, FileText, ShieldAlert, HelpCircle } from "lucide-react";
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
  { id: "1", sku: "SKU-001", name: "Wireless Mouse", stock: 12 },
  { id: "2", sku: "SKU-002", name: "USB-C Cable (2m)", stock: 5 },
  { id: "3", sku: "SKU-003", name: "Desk Monitor Stand", stock: 8 },
];

const adjustmentReasons = ["Physical count discrepancy", "Damaged goods", "Return to supplier", "Customer return", "Theft / loss", "Other"];

const adjustmentSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  currentStock: z.coerce.number().min(0),
  adjustedStock: z.coerce.number().min(0, "Cannot be negative"),
  reason: z.string().min(1, "Select a reason"),
  reasonDetail: z.string().optional(),
  evidence: z.string().min(10, "Please provide evidence notes"),
}).refine((data) => data.adjustedStock !== data.currentStock, { message: "Adjusted stock must be different", path: ["adjustedStock"] });

export default function StockAdjustmentPage() {
  const { role } = useUserStore();
  const isAdminOrManager = role === "admin" || role === "manager";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuditPreview, setShowAuditPreview] = useState(false);

  const form = useForm({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { currentStock: 0, adjustedStock: 0, evidence: "" },
  });

  const productId = form.watch("productId");
  const currentStock = form.watch("currentStock");
  const adjustedStock = form.watch("adjustedStock");
  const selectedProduct = mockProducts.find(p => p.id === productId);

  useEffect(() => {
    if (productId) {
      const product = mockProducts.find(p => p.id === productId);
      if (product) form.setValue("currentStock", product.stock);
    }
  }, [productId, form]);

  const anomalyScore = (() => {
    if (!selectedProduct) return 0;
    const diff = Math.abs(adjustedStock - currentStock);
    const pct = currentStock > 0 ? (diff / currentStock) * 100 : diff * 100;
    if (pct > 50) return 85;
    if (pct > 25) return 55;
    return 20;
  })();

  const onSubmit = (data) => {
    if (!isAdminOrManager) { toast.warning("Need Admin/Manager approval"); return; }
    setIsSubmitting(true);
    setTimeout(() => { toast.success(`Stock adjusted for ${selectedProduct?.name}`); setIsSubmitting(false); setShowAuditPreview(true); }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Stock Adjustment</h1><p className="text-slate-500">Correct inventory discrepancies</p></div>
        <Badge variant="outline" className="text-amber-600"><ShieldAlert className="mr-1 h-3 w-3" /> {isAdminOrManager ? "Can approve" : "Requires approval"}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card><CardHeader><CardTitle>Adjust Inventory</CardTitle><CardDescription>Enter corrected stock quantity</CardDescription></CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField control={form.control} name="productId" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Product *</FormLabel>
                      <Popover><PopoverTrigger asChild><Button variant="outline" className="justify-between">{field.value ? mockProducts.find(p => p.id === field.value)?.name : "Select..."}</Button></PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0"><Command><CommandInput placeholder="Search..." /><CommandEmpty>No product.</CommandEmpty><CommandGroup>{mockProducts.map(p => <CommandItem key={p.id} value={p.id} onSelect={() => field.onChange(p.id)}>{p.name}</CommandItem>)}</CommandGroup></Command></PopoverContent></Popover>
                      <FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="currentStock" render={({ field }) => (
                    <FormItem><FormLabel>Current Stock (read-only)</FormLabel><FormControl><Input {...field} disabled className="bg-slate-50" /></FormControl></FormItem>
                  )} />

                  <FormField control={form.control} name="adjustedStock" render={({ field }) => (
                    <FormItem><FormLabel>Corrected Stock *</FormLabel><FormControl><Input type="number" min="0" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="reason" render={({ field }) => (
                    <FormItem><FormLabel>Reason *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger></FormControl><SelectContent>{adjustmentReasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="evidence" render={({ field }) => (
                    <FormItem><FormLabel>Evidence Notes <span className="text-red-500">*</span></FormLabel><FormControl><Textarea placeholder="Detailed evidence..." rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  {!isAdminOrManager && <Alert className="border-amber-200 bg-amber-50"><Info className="h-4 w-4 text-amber-600" /><AlertTitle>Approval Required</AlertTitle></Alert>}

                  {selectedProduct && adjustedStock !== undefined && adjustedStock !== currentStock && (
                    <div className="rounded-lg border p-4 bg-slate-50"><p className="mb-2 text-sm font-medium">Before / After</p><div className="flex items-center justify-around"><div className="text-center"><p className="text-xs text-slate-500">Current</p><p className="text-2xl font-bold">{currentStock}</p></div><ArrowRight className="h-6 w-6 text-slate-400" /><div className="text-center"><p className="text-xs text-slate-500">Adjusted</p><p className={`text-2xl font-bold ${adjustedStock > currentStock ? "text-green-600" : "text-red-600"}`}>{adjustedStock}</p></div></div></div>
                  )}

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => form.reset()}>Reset</Button>
                    <Button type="submit" disabled={isSubmitting || !isAdminOrManager}>{isSubmitting ? "Processing..." : isAdminOrManager ? "Confirm" : "Submit for Approval"}</Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {selectedProduct && adjustedStock !== undefined && adjustedStock !== currentStock && (
            <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4 text-amber-600" /> Anomaly Score</CardTitle></CardHeader>
              <CardContent><div className="flex justify-between"><span className="text-sm">Score</span><Badge className={anomalyScore > 70 ? "bg-red-500" : anomalyScore > 40 ? "bg-amber-500" : "bg-green-500"}>{Math.round(anomalyScore)}%</Badge></div><Progress value={anomalyScore} className="h-1.5 mt-2" /><p className="text-xs text-slate-500 mt-1">{anomalyScore > 70 ? "Large change" : anomalyScore > 40 ? "Moderate" : "Minor"}</p>
                <Sheet><SheetTrigger asChild><Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-amber-600"><HelpCircle className="mr-1 h-3 w-3" /> Why?</Button></SheetTrigger>
                  <SheetContent side="right"><div className="mt-6"><h3 className="text-lg font-semibold">Anomaly Score</h3><div className="rounded-lg bg-slate-50 p-4 mt-4"><p className="text-sm">Change: {Math.abs(adjustedStock - currentStock)} units ({currentStock > 0 ? ((Math.abs(adjustedStock - currentStock) / currentStock) * 100).toFixed(1) : "N/A"}%)</p></div></div></SheetContent></Sheet>
              </CardContent>
            </Card>
          )}

          {showAuditPreview && selectedProduct && (
            <Card className="border-amber-200 bg-amber-50/50"><CardHeader><CardTitle className="text-sm font-medium text-amber-800">Audit Preview</CardTitle></CardHeader>
              <CardContent><div className="grid grid-cols-2 gap-1 rounded bg-white/70 p-3 text-sm"><span className="font-medium">Action:</span><span>Adjustment</span><span className="font-medium">Product:</span><span>{selectedProduct.name}</span><span className="font-medium">Before:</span><span>{currentStock}</span><span className="font-medium">After:</span><span>{adjustedStock}</span><span className="font-medium">User:</span><span>{role}</span></div><Button variant="outline" size="sm" onClick={() => setShowAuditPreview(false)}>Close</Button></CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}