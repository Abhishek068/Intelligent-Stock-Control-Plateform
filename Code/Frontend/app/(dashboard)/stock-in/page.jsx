"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowDownToLine, Barcode, CheckCircle } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { productsApi, suppliersApi, locationsApi, stockApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth.store";
import { ModuleGate } from "@/components/shared/ModuleGate";

const stockInSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  supplierId: z.string().min(1, "Please select a supplier"),
  locationId: z.string().min(1, "Please select a location"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  unitCost: z.coerce.number().min(0).optional(),
  reference: z.string().optional(),
  notes: z.string().optional()
});

function StockInPageContent() {
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");

  const form = useForm({
    resolver: zodResolver(stockInSchema),
    defaultValues: { quantity: 1, unitCost: 0, reference: "", notes: "" }
  });

  useEffect(() => {
    Promise.all([productsApi.list(), suppliersApi.list(), locationsApi.list()]).then(
      ([p, s, l]) => {
        setProducts(p);
        setSuppliers(s);
        setLocations(l);
        if (l.length === 1) form.setValue("locationId", String(l[0].id));
      }
    );
  }, [form]);

  const selectedProductId = form.watch("productId");
  const selectedProduct = products.find((p) => String(p.id) === selectedProductId);
  const quantity = form.watch("quantity") || 0;

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await stockApi.stockIn({
        product: Number(data.productId),
        supplier: Number(data.supplierId),
        location: Number(data.locationId),
        quantity: data.quantity,
        unit_cost: data.unitCost || 0,
        reference: data.reference,
        notes: data.notes,
        received_at: new Date().toISOString()
      });
      toast.success(`Received ${data.quantity} × ${selectedProduct?.name}`);
      form.reset({ quantity: 1, unitCost: 0, reference: "", notes: "" });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Stock in failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBarcodeScan = async (value) => {
    try {
      const res = await productsApi.lookupBySku(value);
      if (res.success && res.data) {
        form.setValue("productId", String(res.data.id));
        form.setValue("supplierId", String(res.data.supplier));
        setBarcodeInput("");
        toast.success(`Found: ${res.data.name}`);
      }
    } catch {
      toast.error("Product not found");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Stock In</h1>
          <p className="text-slate-400">Receive new goods into inventory</p>
        </div>
        <Badge variant="outline" className="text-teal-600">
          <ArrowDownToLine className="mr-1 h-3 w-3" /> Receiving
        </Badge>
      </div>

      <Card className="border-teal-100 bg-teal-50/50">
        <CardContent className="flex flex-col items-center gap-3 p-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-teal-100 p-2 text-teal-600"><Barcode className="h-5 w-5" /></div>
            <div><p className="text-sm font-medium text-teal-900">Barcode Quick-Scan</p></div>
          </div>
          <div className="flex w-full max-w-sm items-center gap-2">
            <Input placeholder="Enter SKU" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan(barcodeInput.trim())} />
            <Button variant="outline" onClick={() => handleBarcodeScan(barcodeInput.trim())}>Scan</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle>Receive Stock</CardTitle><CardDescription>Transaction is persisted via API with audit logging</CardDescription></CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField control={form.control} name="productId" render={({ field }) =>
                <FormItem className="flex flex-col"><FormLabel>Product *</FormLabel>
                    <Popover><PopoverTrigger asChild><Button variant="outline" className="justify-between">{field.value ? products.find((p) => String(p.id) === field.value)?.name : "Select product..."}</Button></PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0"><Command><CommandInput placeholder="Search..." /><CommandEmpty>No product.</CommandEmpty><CommandGroup>{products.map((p) => <CommandItem key={p.id} value={String(p.id)} onSelect={() => {field.onChange(String(p.id));form.setValue("supplierId", String(p.supplier));}}>{p.name}</CommandItem>)}</CommandGroup></Command></PopoverContent></Popover>
                    <FormMessage /></FormItem>
                } />

                <FormField control={form.control} name="supplierId" render={({ field }) =>
                <FormItem><FormLabel>Supplier *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger></FormControl><SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                } />

                <FormField control={form.control} name="locationId" render={({ field }) =>
                <FormItem><FormLabel>Location *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger></FormControl><SelectContent>{locations.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                } />

                <FormField control={form.control} name="quantity" render={({ field }) =>
                <FormItem><FormLabel>Quantity *</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                } />

                <FormField control={form.control} name="unitCost" render={({ field }) =>
                <FormItem><FormLabel>Unit Cost (£)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                } />

                <FormField control={form.control} name="reference" render={({ field }) =>
                <FormItem><FormLabel>Reference</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                } />
              </div>

              <FormField control={form.control} name="notes" render={({ field }) =>
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              } />

              {selectedProduct && quantity > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-teal-500/20 bg-teal-950/20 p-4 text-teal-200">
                  <CheckCircle className="h-5 w-5 shrink-0 text-teal-400" />
                  <div>
                    <h5 className="font-semibold text-teal-100 text-sm">Receipt Summary</h5>
                    <p className="text-xs text-teal-300/90 mt-0.5">
                      Receiving <strong className="text-teal-50 font-bold">{quantity}</strong> × <strong className="text-teal-50 font-bold">{selectedProduct.name}</strong> as {user?.role}.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => form.reset()}>Reset</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Processing..." : "Confirm Stock In"}</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>);

}

export default function StockInPage() {
  return (
    <ModuleGate module="stock_in" action="create">
      <StockInPageContent />
    </ModuleGate>
  );
}
