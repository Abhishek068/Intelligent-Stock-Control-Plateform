"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowDownToLine, Barcode, CheckCircle, PackagePlus, Box, History, Search } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productsApi, suppliersApi, locationsApi, stockApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth.store";
import { ModuleGate } from "@/components/shared/ModuleGate";

const stockInSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  supplierId: z.string().min(1, "Please select a supplier"),
  locationId: z.string().optional(),
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
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const form = useForm({
    resolver: zodResolver(stockInSchema),
    defaultValues: { quantity: 1, unitCost: 0, batchNumber: "", expiryDate: "", reference: "", notes: "" }
  });

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await stockApi.listStockIn();
      setHistoryLogs(data);
    } catch {
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          productsApi.list().catch(() => []),
          suppliersApi.list().catch(() => [])
        ]);
        const pList = Array.isArray(pRes) ? pRes : (pRes?.results || pRes?.data || []);
        const sList = Array.isArray(sRes) ? sRes : (sRes?.results || sRes?.data || []);
        
        setProducts(pList);
        setSuppliers(sList);
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    };
    loadInitialData();
    loadHistory();
  }, [loadHistory]);

  const selectedProductId = form.watch("productId");
  const selectedProduct = products.find((p) => String(p.id) === selectedProductId);
  const quantity = form.watch("quantity") || 0;

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      await stockApi.stockIn({
        product: Number(data.productId),
        supplier: Number(data.supplierId),
        location: data.locationId ? Number(data.locationId) : undefined,
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
      await loadHistory();
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

  const handleAutoGenerateBatch = () => {
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.floor(1000 + Math.random() * 9000);
    const code = `LOT-${todayStr}-${rand}`;
    form.setValue("batchNumber", code);
    toast.info(`Auto-generated batch: ${code}`);
  };

  const handleSetExpiryPreset = (monthsToAdd) => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthsToAdd);
    const isoDate = d.toISOString().slice(0, 10);
    form.setValue("expiryDate", isoDate);
    toast.info(`Expiry date set to ${isoDate} (+${monthsToAdd}m)`);
  };

  const unitCost = form.watch("unitCost") || 0;
  const totalValuation = (quantity || 0) * (unitCost || 0);

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
      <Card className="border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-2xl overflow-hidden rounded-2xl relative w-full">
        <div className="px-8 py-6 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-200 font-bold text-lg">
              <Box className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> 
              Receive Stock Form
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Live audit logging with automatic FIFO batch creation & inventory valuation
            </p>
          </div>
        </div>

        <CardContent className="p-8 relative z-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                <FormField control={form.control} name="productId" render={({ field }) => (
                  <FormItem className="col-span-2 md:col-span-1">
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Product <span className="text-rose-500">*</span></FormLabel>
                      {selectedProduct && (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          On Hand: {selectedProduct.stock ?? 0} units
                        </span>
                      )}
                    </div>
                    <Select
                      value={field.value || ""}
                      onValueChange={(val) => {
                        field.onChange(val);
                        const selected = products.find((p) => String(p.id) === String(val));
                        if (selected) {
                          const suppId = selected.supplier || selected.supplier_id || selected.supplierId || selected.primary_supplier;
                          if (suppId) {
                            form.setValue("supplierId", String(suppId));
                          } else if (suppliers.length > 0) {
                            form.setValue("supplierId", String(suppliers[0].id));
                          }
                          const cost = selected.unit_price || selected.cost_price || selected.unit_cost || 0;
                          if (cost) {
                            form.setValue("unitCost", Number(cost));
                          }
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-11 font-medium">
                          <SelectValue placeholder="Select product..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-2xl rounded-xl text-slate-800 dark:text-slate-200 max-h-60">
                        {products.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)} className="cursor-pointer">
                            {p.name} {p.sku ? `(${p.sku})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-rose-500 text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="supplierId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Supplier <span className="text-rose-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
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
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Batch / Lot Number</FormLabel>
                      <button
                        type="button"
                        onClick={handleAutoGenerateBatch}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        ⚡ Auto-Generate
                      </button>
                    </div>
                    <FormControl>
                      <Input 
                        placeholder="Leave blank or click Auto-Generate" 
                        {...field} 
                        className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-medium rounded-xl h-11 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </FormControl>
                    <FormMessage className="text-rose-500 text-xs" />
                  </FormItem>
                )} />

                <FormField control={form.control} name="expiryDate" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Expiry Date</FormLabel>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSetExpiryPreset(3)}
                          className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          +3m
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetExpiryPreset(6)}
                          className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          +6m
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetExpiryPreset(12)}
                          className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          +1yr
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetExpiryPreset(24)}
                          className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          +2yr
                        </button>
                      </div>
                    </div>
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
                <div className="flex items-start gap-4 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-5 shadow-sm relative overflow-hidden group">
                  <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
                  <CheckCircle className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400 relative z-10 mt-0.5" />
                  <div className="relative z-10 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h5 className="font-bold text-emerald-900 dark:text-emerald-100 text-base">Receipt Valuation Summary</h5>
                      <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-0.5">
                        Receiving <strong className="text-emerald-950 dark:text-white font-extrabold text-base mx-1 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded">{quantity}</strong> units of <strong className="text-emerald-950 dark:text-white font-bold">{selectedProduct.name}</strong> into Central Warehouse.
                      </p>
                    </div>
                    <div className="text-right shrink-0 bg-white/80 dark:bg-slate-950/60 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-500/30">
                      <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Total Receipt Value</div>
                      <div className="text-xl font-extrabold text-emerald-900 dark:text-emerald-100">
                        £{totalValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
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

      {/* Recently Stocked In Products History */}
      <Card className="border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full mt-8">
        <div className="px-8 py-6 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-lg">
              <History className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Recently Stocked In Products History
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live audit history of received inventory transactions for Central Warehouse
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Filter by product or warehouse..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-xs rounded-xl h-9"
            />
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-white/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-3.5 pl-6 font-bold text-slate-700 dark:text-slate-300">Date & Time</TableHead>
                  <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300">Product</TableHead>
                  <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300">Location / Warehouse</TableHead>
                  <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300">Supplier</TableHead>
                  <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 text-right">Quantity Received</TableHead>
                  <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300">Batch / Expiry</TableHead>
                  <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 pr-6">Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">Loading stock in history...</TableCell>
                  </TableRow>
                )}
                {!historyLoading && historyLogs.filter((i) => 
                  !searchFilter || 
                  (i.product_name || "").toLowerCase().includes(searchFilter.toLowerCase()) || 
                  (i.location_name || "").toLowerCase().includes(searchFilter.toLowerCase())
                ).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">No stock in transactions found.</TableCell>
                  </TableRow>
                )}
                {!historyLoading && historyLogs.filter((i) => 
                  !searchFilter || 
                  (i.product_name || "").toLowerCase().includes(searchFilter.toLowerCase()) || 
                  (i.location_name || "").toLowerCase().includes(searchFilter.toLowerCase())
                ).map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-b border-slate-200/60 dark:border-white/5 text-xs">
                    <TableCell className="pl-6 font-mono text-slate-600 dark:text-slate-400 py-3">
                      {item.created_at || item.received_at ? new Date(item.created_at || item.received_at).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900 dark:text-slate-200">
                      {item.product_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 font-medium">
                        {item.location_name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">
                      {item.supplier_name || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                        +{item.quantity} units
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-slate-600 dark:text-slate-400">
                      {item.batch_label || item.batch_number || "Auto"}
                    </TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400 pr-6">
                      {item.reference || item.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
