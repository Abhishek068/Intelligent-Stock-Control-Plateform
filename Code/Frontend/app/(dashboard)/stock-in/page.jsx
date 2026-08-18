"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowDownToLine, Barcode, CheckCircle, PackagePlus, Box } from "lucide-react";
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
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
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
    defaultValues: { quantity: 1, unitCost: 0, batchNumber: "", expiryDate: "", reference: "", notes: "" }
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
        batch_number: data.batchNumber || "",
        expiry_date: data.expiryDate || null,
        reference: data.reference,
        notes: data.notes,
        received_at: new Date().toISOString()
      });
      toast.success(`Received ${data.quantity} × ${selectedProduct?.name}`);
      form.reset({ quantity: 1, unitCost: 0, batchNumber: "", expiryDate: "", reference: "", notes: "" });
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-teal-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-teal-50 dark:bg-teal-500/20 rounded-xl border border-teal-200 dark:border-teal-500/30 text-teal-600 dark:text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
              <PackagePlus className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-slate-50 dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              Stock In
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Receive new goods into inventory via quick-scan or manual entry.
          </p>
        </div>

        <Badge className="bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/20 px-4 py-1.5 text-sm font-semibold">
          <ArrowDownToLine className="mr-2 h-4 w-4 animate-bounce" /> Receiving Mode Active
        </Badge>
      </div>

      {/* Barcode Quick-Scan Card */}
      <Card className="bg-white/90 dark:bg-slate-900/40 backdrop-blur-xl border border-teal-200 dark:border-teal-500/20 shadow-sm overflow-hidden rounded-2xl relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-[50px] pointer-events-none" />
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-between relative z-10">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-teal-50 dark:bg-teal-500/20 p-3 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30 shadow-xs">
              <Barcode className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-200 tracking-tight">Barcode Quick-Scan</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Scan a barcode to instantly select the product</p>
            </div>
          </div>
          <div className="flex w-full max-w-md items-center gap-3">
            <div className="relative w-full group">
              <Barcode className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 dark:group-focus-within:text-teal-400 transition-colors" />
              <Input 
                placeholder="Enter SKU or scan barcode..." 
                value={barcodeInput} 
                onChange={(e) => setBarcodeInput(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan(barcodeInput.trim())} 
                className="pl-9 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl h-11"
              />
            </div>
            <Button 
              className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-semibold rounded-xl h-11 px-6 shadow-md cursor-pointer"
              onClick={() => handleBarcodeScan(barcodeInput.trim())}
            >
              Scan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Receiving Form */}
      <Card className="border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="px-8 py-6 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 relative z-10">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-200 font-bold text-lg">
            <Box className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> 
            Receive Stock
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Transaction is persisted via API with audit logging
          </p>
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
                                onSelect={() => {
                                  field.onChange(String(p.id));
                                  form.setValue("supplierId", String(p.supplier));
                                }}
                                className="cursor-pointer text-slate-800 dark:text-slate-300 py-3"
                              >
                                {p.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage className="text-rose-500 text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="supplierId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Supplier <span className="text-rose-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-11 font-medium">
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-2xl rounded-xl text-slate-800 dark:text-slate-200">
                        {suppliers.map((s) => <SelectItem key={s.id} value={String(s.id)} className="cursor-pointer">{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
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

                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Quantity <span className="text-rose-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field} 
                        className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-bold rounded-xl h-11"
                      />
                    </FormControl>
                    <FormMessage className="text-rose-500 text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="unitCost" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Unit Cost (£)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...field} 
                        className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-medium rounded-xl h-11"
                      />
                    </FormControl>
                    <FormMessage className="text-rose-500 text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="batchNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Batch / Lot Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Leave blank to auto-generate" 
                        {...field} 
                        className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-medium rounded-xl h-11 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </FormControl>
                    <FormMessage className="text-rose-500 text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="expiryDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Expiry Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-medium rounded-xl h-11"
                      />
                    </FormControl>
                    <FormMessage className="text-rose-500 text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="reference" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Reference</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., PO-12345"
                        {...field} 
                        className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-medium rounded-xl h-11 placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                      className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-medium rounded-xl resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      placeholder="Add any additional notes about this stock receipt..."
                    />
                  </FormControl>
                  <FormMessage className="text-rose-500 text-xs" />
                </FormItem>
              )} />

              {selectedProduct && quantity > 0 && (
                <div className="flex items-start gap-4 rounded-xl border border-teal-200 dark:border-teal-500/30 bg-teal-50 dark:bg-teal-500/10 p-5 shadow-sm relative overflow-hidden group">
                  <div className="absolute inset-0 bg-teal-500/5 group-hover:bg-teal-500/10 transition-colors pointer-events-none" />
                  <CheckCircle className="h-6 w-6 shrink-0 text-teal-600 dark:text-teal-400 relative z-10" />
                  <div className="relative z-10">
                    <h5 className="font-bold text-teal-900 dark:text-teal-100 text-base">Receipt Summary</h5>
                    <p className="text-sm text-teal-800 dark:text-teal-200 mt-1">
                      Ready to receive <strong className="text-teal-950 dark:text-white font-extrabold text-base mx-1 bg-teal-100 dark:bg-teal-500/20 px-2 py-0.5 rounded">{quantity}</strong> units of <strong className="text-teal-950 dark:text-white font-bold">{selectedProduct.name}</strong> as <span className="italic">{user?.role}</span>.
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
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-md rounded-xl h-11 px-8 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Processing...
                    </span>
                  ) : "Confirm Stock In"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StockInPage() {
  return (
    <ModuleGate module="stock_in" action="create">
      <StockInPageContent />
    </ModuleGate>
  );
}
