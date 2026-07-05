"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowDownToLine, Search, Barcode, Package, User, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useUserStore } from "@/lib/store";


const mockProducts = [
  { id: "1", sku: "SKU-001", name: "Wireless Mouse", supplier: "TechSupply Ltd" },
  { id: "2", sku: "SKU-002", name: "USB-C Cable (2m)", supplier: "Global Parts Co" },
  { id: "3", sku: "SKU-003", name: "Desk Monitor Stand", supplier: "OfficeDirect" },
  { id: "4", sku: "SKU-004", name: "Keyboard Wired", supplier: "TechSupply Ltd" },
];

const mockSuppliers = [
  { id: "sup-1", name: "TechSupply Ltd" },
  { id: "sup-2", name: "Global Parts Co" },
  { id: "sup-3", name: "OfficeDirect" },
];


const stockInSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  supplierId: z.string().min(1, "Please select a supplier"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  unitCost: z.coerce.number().positive().optional(),
  batchCode: z.string().optional(),
  expiryDate: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  locationId: z.string().optional(),
});

export default function StockInPage() {
  const { role } = useUserStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");

  const form = useForm({
    resolver: zodResolver(stockInSchema),
    defaultValues: { quantity: 1, unitCost: 0 },
  });

  const selectedProductId = form.watch("productId");
  const selectedProduct = mockProducts.find((p) => p.id === selectedProductId);
  const quantity = form.watch("quantity") || 0;
  const unitCost = form.watch("unitCost") || 0;

  const onSubmit = (data) => {
    setIsSubmitting(true);
    setTimeout(() => {
      toast.success(`Received ${data.quantity} × ${selectedProduct?.name}`);
      setIsSubmitting(false);
      setShowSummary(true);
    }, 1200);
  };

  const handleBarcodeScan = (value) => {
    const found = mockProducts.find((p) => p.sku === value);
    if (found) {
      form.setValue("productId", found.id);
      setBarcodeInput("");
      toast.success(`🔍 Found: ${found.name}`);
    } else {
      toast.error("Product not found");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Stock In</h1>
          <p className="text-slate-500">Receive new goods into inventory</p>
        </div>
        <Badge variant="outline" className="text-teal-600">
          <ArrowDownToLine className="mr-1 h-3 w-3" /> Receiving
        </Badge>
      </div>

      
      <Card className="border-teal-100 bg-teal-50/50">
        <CardContent className="flex flex-col items-center gap-3 p-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-teal-100 p-2 text-teal-600"><Barcode className="h-5 w-5" /></div>
            <div><p className="text-sm font-medium text-teal-900">Barcode Quick-Scan</p><p className="text-xs text-teal-700">Scan or type barcode to select product</p></div>
          </div>
          <div className="flex w-full max-w-sm items-center gap-2">
            <Input placeholder="Enter barcode (e.g., SKU-001)" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleBarcodeScan(barcodeInput.trim()); }} className="border-teal-200 bg-white" />
            <Button variant="outline" className="border-teal-200 text-teal-700" onClick={() => handleBarcodeScan(barcodeInput.trim())}>Scan</Button>
          </div>
        </CardContent>
      </Card>

      
      <Card>
        <CardHeader><CardTitle>Receive Stock</CardTitle><CardDescription>Enter the details of the incoming shipment</CardDescription></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField control={form.control} name="productId" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Product *</FormLabel>
                    <Popover><PopoverTrigger asChild><Button variant="outline" className="justify-between">{field.value ? mockProducts.find(p => p.id === field.value)?.name : "Select product..."}</Button></PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0"><Command><CommandInput placeholder="Search..." /><CommandEmpty>No product.</CommandEmpty><CommandGroup>{mockProducts.map(p => <CommandItem key={p.id} value={p.id} onSelect={() => field.onChange(p.id)}>{p.name}</CommandItem>)}</CommandGroup></Command></PopoverContent></Popover>
                    <FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="supplierId" render={({ field }) => (
                  <FormItem><FormLabel>Supplier *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger></FormControl><SelectContent>{mockSuppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem><FormLabel>Quantity *</FormLabel><FormControl><Input type="number" min="1" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="unitCost" render={({ field }) => (
                  <FormItem><FormLabel>Unit Cost (£)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="batchCode" render={({ field }) => (
                  <FormItem><FormLabel>Batch Code <Badge variant="outline" className="text-[10px]">Optional</Badge></FormLabel><FormControl><Input placeholder="e.g., B2024-001" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="expiryDate" render={({ field }) => (
                  <FormItem><FormLabel>Expiry Date <Badge variant="outline" className="text-[10px]">Optional</Badge></FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="reference" render={({ field }) => (
                  <FormItem><FormLabel>Reference / PO</FormLabel><FormControl><Input placeholder="e.g., PO-2024-001" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="locationId" render={({ field }) => (
                  <FormItem><FormLabel>Location</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger></FormControl><SelectContent><SelectItem value="wh-a">Warehouse A</SelectItem><SelectItem value="wh-b">Warehouse B</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Additional notes..." rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              {selectedProduct && quantity > 0 && (
                <Alert className="border-teal-200 bg-teal-50">
                  <CheckCircle className="h-4 w-4 text-teal-600" />
                  <AlertTitle>Receipt Summary</AlertTitle>
                  <AlertDescription>Receiving <strong>{quantity}</strong> × <strong>{selectedProduct.name}</strong> from {mockSuppliers.find(s => s.id === form.watch("supplierId"))?.name || "supplier"}.</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => form.reset()}>Reset</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Processing..." : "Confirm Stock In"}</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {showSummary && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader><CardTitle className="text-sm font-medium text-amber-800">Audit Log Preview</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-1 rounded bg-white/70 p-3">
              <span className="font-medium">Action:</span><span>Stock In</span>
              <span className="font-medium">Product:</span><span>{selectedProduct?.name}</span>
              <span className="font-medium">Quantity:</span><span>+{quantity}</span>
              <span className="font-medium">User:</span><span>{role || "Staff"}</span>
              <span className="font-medium">Timestamp:</span><span>{new Date().toLocaleString()}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowSummary(false)}>Close</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}