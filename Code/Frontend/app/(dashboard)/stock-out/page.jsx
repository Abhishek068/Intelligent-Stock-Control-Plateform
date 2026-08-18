"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowUpFromLine, Barcode, AlertTriangle, CheckCircle, PackageMinus, Box } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { productsApi, locationsApi, stockApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth.store";
import { ModuleGate } from "@/components/shared/ModuleGate";

const stockOutSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  locationId: z.string().min(1, "Select a location"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  issuedTo: z.string().min(1, "Select destination"),
  batchId: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional()
});

const DESTINATIONS = [
  { value: "Department A", label: "Department A" },
  { value: "Department B", label: "Department B" },
  { value: "Customer", label: "Customer" },
  { value: "Internal use", label: "Internal use" }
];

function StockOutPageContent() {
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [batches, setBatches] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");

  const form = useForm({
    resolver: zodResolver(stockOutSchema),
    defaultValues: { quantity: 1, batchId: "", reference: "", notes: "" }
  });

  useEffect(() => {
    Promise.all([productsApi.list(), locationsApi.list()]).then(([p, l]) => {
      setProducts(p);
      setLocations(l);
      if (l.length === 1) form.setValue("locationId", String(l[0].id));
    });
  }, [form]);

  const productId = form.watch("productId");
  const locationId = form.watch("locationId");
  const quantity = form.watch("quantity") || 0;
  const selectedProduct = products.find((p) => String(p.id) === productId);
  const availableStock = selectedProduct?.stock ?? 0;
  const isOverIssuing = quantity > availableStock;

  useEffect(() => {
    if (selectedProduct) form.setValue("quantity", 1);
  }, [productId, form, selectedProduct]);

  useEffect(() => {
    if (!productId || !locationId) {
      setBatches([]);
      form.setValue("batchId", "");
      return;
    }
    stockApi
      .listBatches({ product: productId, location: locationId, active_only: true })
      .then((rows) => {
        setBatches(rows);
        form.setValue("batchId", "");
      })
      .catch(() => setBatches([]));
  }, [productId, locationId, form]);

  const onSubmit = async (data) => {
    if (isOverIssuing) {
      toast.error("Quantity exceeds available stock");
      return;
    }
    setIsSubmitting(true);
    try {
      await stockApi.stockOut({
        product: Number(data.productId),
        location: Number(data.locationId),
        quantity: data.quantity,
        issued_to: data.issuedTo,
        batch_id: data.batchId ? Number(data.batchId) : null,
        reference: data.reference,
        notes: data.notes,
        issued_at: new Date().toISOString()
      });
      toast.success(`Issued ${data.quantity} × ${selectedProduct?.name}`);
      const refreshed = await productsApi.list();
      setProducts(refreshed);
      form.reset({ quantity: 1, batchId: "", reference: "", notes: "" });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Stock out failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBarcodeScan = async (value) => {
    try {
      const res = await productsApi.lookupBySku(value);
      if (res.success && res.data) {
        form.setValue("productId", String(res.data.id));
        setBarcodeInput("");
        toast.success(`Found: ${res.data.name}`);
      }
    } catch {
      toast.error("Product not found");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-blue-50 dark:bg-blue-500/20 rounded-xl border border-blue-200 dark:border-blue-500/30 text-blue-600 dark:text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
              <PackageMinus className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-slate-50 dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              Stock Out
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Issue stock to departments or customers seamlessly.
          </p>
        </div>

        <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 px-4 py-1.5 text-sm font-semibold">
          <ArrowUpFromLine className="mr-2 h-4 w-4 animate-bounce" /> Issuing Mode Active
        </Badge>
      </div>

      {/* Barcode Quick-Scan Card */}
      <Card className="bg-white/90 dark:bg-slate-900/40 backdrop-blur-xl border border-blue-200 dark:border-blue-500/20 shadow-sm overflow-hidden rounded-2xl relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px] pointer-events-none" />
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 dark:bg-blue-500/20 p-3 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 shadow-xs">
              <Barcode className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-200 tracking-tight">Barcode Quick-Scan</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Scan a barcode to instantly select the product</p>
            </div>
          </div>
          <div className="flex w-full max-w-md items-center gap-3">
            <div className="relative w-full group">
              <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" />
              <Input 
                placeholder="Enter SKU or scan barcode..." 
                value={barcodeInput} 
                onChange={(e) => setBarcodeInput(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan(barcodeInput.trim())} 
                className="pl-9 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl h-11"
              />
            </div>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl h-11 px-6 shadow-md cursor-pointer"
              onClick={() => handleBarcodeScan(barcodeInput.trim())}
            >
              Scan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Issuing Form */}
      <Card className="border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="px-8 py-6 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 relative z-10">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-200 font-bold text-lg">
            <Box className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> 
            Issue Stock
          </div>
        </div>

        <CardContent className="p-8 relative z-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField control={form.control} name="productId" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Product <span className="text-rose-500">*</span></FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="justify-between bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-800 dark:text-slate-200 rounded-xl h-11 font-medium cursor-pointer">
                          {field.value ? products.find((p) => String(p.id) === field.value)?.name : "Select product..."}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-2xl rounded-xl">
                        <Command className="bg-transparent text-slate-800 dark:text-slate-200">
                          <CommandInput placeholder="Search products..." className="border-b border-slate-200 dark:border-white/10 h-11" />
                          <CommandEmpty className="py-6 text-center text-sm text-slate-500">No product found.</CommandEmpty>
                          <CommandGroup className="max-h-[300px] overflow-auto">
                            {products.map((p) => (
                              <CommandItem 
                                key={p.id} 
                                value={String(p.id)} 
                                onSelect={() => field.onChange(String(p.id))}
                                className="cursor-pointer text-slate-800 dark:text-slate-300 py-3 flex items-center justify-between"
                              >
                                <span>{p.name}</span>
                                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">Stock: {p.stock}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage className="text-rose-500 text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="locationId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Location <span className="text-rose-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-11 font-medium">
                          <SelectValue placeholder="Select location" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-2xl rounded-xl text-slate-800 dark:text-slate-200">
                        {locations.map((l) => <SelectItem key={l.id} value={String(l.id)} className="cursor-pointer">{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-rose-500 text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="batchId" render={({ field }) => {
                  const selectedBatch = batches.find((b) => String(b.id) === field.value);
                  const recommendedBatch = batches.find((b) => b.is_fifo_recommended);
                  const isNonFifoSelection = selectedBatch && recommendedBatch && selectedBatch.id !== recommendedBatch.id;
                  const isSelectedExpired = selectedBatch && (selectedBatch.days_to_expiry < 0 || selectedBatch.expiry_status === "expired");

                  return (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex justify-between items-center">
                        <span>Batch / Lot (optional)</span>
                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                          Defaults to FEFO (Earliest Expiry)
                        </span>
                      </FormLabel>
                      <Select onValueChange={(v) => field.onChange(v === "fefo" ? "" : v)} value={field.value || "fefo"}>
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-11 font-medium">
                            <SelectValue placeholder="⭐ Automatic FEFO Selection (Earliest Expiry)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-2xl rounded-xl text-slate-800 dark:text-slate-200 max-h-60">
                          <SelectItem value="fefo" className="cursor-pointer font-bold text-indigo-600 dark:text-indigo-300">
                            ⭐ Automatic FEFO (Recommended Earliest Expiry)
                          </SelectItem>
                          {batches.map((b) => {
                            const isExpired = b.days_to_expiry !== null && b.days_to_expiry < 0;
                            return (
                              <SelectItem 
                                key={b.id} 
                                value={String(b.id)} 
                                disabled={isExpired}
                                className={`cursor-pointer ${isExpired ? "opacity-50 text-rose-500 line-through" : ""}`}
                              >
                                {b.is_fifo_recommended ? "⭐ " : ""}{b.batch_number} — Qty: {b.quantity_on_hand} 
                                {b.expiry_date ? ` (Exp: ${b.expiry_date})` : " (No Expiry)"}
                                {isExpired ? " — EXPIRED [BLOCKED]" : b.is_fifo_recommended ? " [FEFO PICK]" : ""}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      
                      {/* Non-FIFO Warning Notice */}
                      {isNonFifoSelection && !isSelectedExpired && (
                        <div className="mt-2 text-xs p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                          <div>
                            <strong className="font-bold block">Non-FIFO Selection Warning</strong>
                            An earlier expiring batch (<span className="font-mono font-bold text-slate-900 dark:text-white">{recommendedBatch.batch_number}</span>, exp {recommendedBatch.expiry_date}) exists for this location. FIFO guidelines recommend issuing earlier stock first.
                          </div>
                        </div>
                      )}

                      {/* Expired Batch Alert Notice */}
                      {isSelectedExpired && (
                        <div className="mt-2 text-xs p-3 bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 rounded-xl text-rose-800 dark:text-rose-200 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5 animate-pulse" />
                          <div>
                            <strong className="font-bold block">Expired Lot Issuance Blocked</strong>
                            Batch '{selectedBatch.batch_number}' expired on {selectedBatch.expiry_date}. Standard stock-out is blocked for expired goods. Please perform a stock adjustment or supplier return.
                          </div>
                        </div>
                      )}
                      
                      <FormMessage className="text-rose-500 text-xs" />
                    </FormItem>
                  );
                }} />

                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex justify-between">
                      <span>Quantity <span className="text-rose-500">*</span></span>
                      {selectedProduct && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                          Available: <strong className="text-blue-600 dark:text-blue-400 font-mono font-bold">{availableStock}</strong>
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field} 
                        className={`bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-bold rounded-xl h-11 ${isOverIssuing ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30' : 'focus:border-blue-500/50 focus:ring-blue-500/30'}`}
                      />
                    </FormControl>
                    <FormMessage className="text-rose-500 text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="issuedTo" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Destination <span className="text-rose-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-11 font-medium">
                          <SelectValue placeholder="Select destination" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-2xl rounded-xl text-slate-800 dark:text-slate-200">
                        {DESTINATIONS.map((d) => <SelectItem key={d.value} value={d.value} className="cursor-pointer">{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-rose-500 text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="reference" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Reference</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., SO-2024-042" 
                        {...field} 
                        className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 focus:border-blue-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl h-11 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </FormControl>
                    <FormMessage className="text-rose-500 text-xs" />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={3} 
                      {...field} 
                      className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 focus:border-blue-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      placeholder="Add any additional notes about this stock issuance..."
                    />
                  </FormControl>
                  <FormMessage className="text-rose-500 text-xs" />
                </FormItem>
              )} />

              {isOverIssuing && (
                <div className="flex items-start gap-4 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-5 shadow-sm relative overflow-hidden group">
                  <div className="absolute inset-0 bg-rose-500/5 group-hover:bg-rose-500/10 transition-colors pointer-events-none" />
                  <AlertTriangle className="h-6 w-6 shrink-0 text-rose-600 dark:text-rose-400 relative z-10 animate-pulse" />
                  <div className="relative z-10">
                    <h5 className="font-bold text-rose-800 dark:text-rose-100 text-base">Insufficient Stock</h5>
                    <p className="text-sm text-rose-700 dark:text-rose-200 mt-1">
                      You are attempting to issue more stock than is available. Only <strong className="text-rose-950 dark:text-white font-mono bg-rose-100 dark:bg-rose-500/20 px-1.5 py-0.5 rounded">{availableStock}</strong> units available.
                    </p>
                  </div>
                </div>
              )}

              {selectedProduct && !isOverIssuing && quantity > 0 && (
                <div className="flex items-start gap-4 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 p-5 shadow-sm relative overflow-hidden group">
                  <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors pointer-events-none" />
                  <CheckCircle className="h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400 relative z-10" />
                  <div className="relative z-10">
                    <h5 className="font-bold text-blue-900 dark:text-blue-100 text-base font-sans">Issue Summary</h5>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                      Ready to issue <strong className="text-blue-950 dark:text-white font-extrabold text-base mx-1 bg-blue-100 dark:bg-blue-500/20 px-2 py-0.5 rounded">{quantity}</strong> units of <strong className="text-blue-950 dark:text-white font-bold">{selectedProduct.name}</strong> under <span className="italic">{form.watch("batchId") ? "specified lot" : "automatic FEFO (earliest expiry) rule"}</span>.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-4 pt-4 border-t border-slate-200/80 dark:border-white/5">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => form.reset()}
                  className="hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 rounded-xl h-11 px-6 cursor-pointer"
                >
                  Reset Form
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || isOverIssuing}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-md rounded-xl h-11 px-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Processing...
                    </span>
                  ) : "Confirm Stock Out"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StockOutPage() {
  return (
    <ModuleGate module="stock_out" action="create">
      <StockOutPageContent />
    </ModuleGate>
  );
}
