"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowDownToLine,
  Barcode,
  CheckCircle2,
  Camera,
  Layers,
  Building,
  MapPin,
  DollarSign,
  Wallet,
  Package,
  Hash,
  FileText,
  StickyNote,
  RefreshCw,
  Zap,
  Volume2,
  VolumeX,
  History,
  Tag,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { productsApi, suppliersApi, locationsApi, stockApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth.store";
import { ModuleGate } from "@/components/shared/ModuleGate";

import { CameraScannerModal } from "@/features/stock-in/components/CameraScannerModal";
import { SampleBarcodesDrawer } from "@/features/stock-in/components/SampleBarcodesDrawer";

const stockInSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  supplierId: z.string().min(1, "Please select a supplier"),
  locationId: z.string().min(1, "Please select a location"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  unitCost: z.coerce.number().min(0).optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

function StockInKpiCard({ title, value, subtitle, icon: Icon, color, glowColor }) {
  return (
    <Card className="relative overflow-hidden bg-slate-900/60 border-slate-800/80 backdrop-blur-xl transition-all duration-300 hover:border-slate-700 hover:shadow-xl group">
      <div className={`absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl ${glowColor} rounded-bl-full pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity`} />
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400">{title}</p>
          <h3 className="text-2xl font-black tracking-tight text-white">{value}</h3>
          {subtitle && <p className="text-[11px] text-slate-400 flex items-center gap-1">{subtitle}</p>}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

function StockInPageContent() {
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [matchedProduct, setMatchedProduct] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Scanner Modals
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSampleDrawerOpen, setIsSampleDrawerOpen] = useState(false);

  // Session Stats
  const [sessionCount, setSessionCount] = useState(0);
  const [sessionValue, setSessionValue] = useState(0);

  const form = useForm({
    resolver: zodResolver(stockInSchema),
    defaultValues: { quantity: 1, unitCost: 0, reference: "", notes: "" },
  });

  const selectedProductId = form.watch("productId");
  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === selectedProductId),
    [products, selectedProductId]
  );
  const quantity = form.watch("quantity") || 0;
  const unitCost = form.watch("unitCost") || 0;
  const totalCost = useMemo(() => quantity * unitCost, [quantity, unitCost]);

  // Audio Beep Generator
  const playScanBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1100, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {}
  }, [soundEnabled]);

  useEffect(() => {
    Promise.all([productsApi.list(), suppliersApi.list(), locationsApi.list()]).then(
      ([p, s, l]) => {
        setProducts(p);
        setSuppliers(s);
        setLocations(l);
        if (l.length > 0) form.setValue("locationId", String(l[0].id));
      }
    );
  }, [form]);

  // Global Hardware Barcode Gun Listener
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      // Don't intercept if user is typing inside text input/textarea
      if (["INPUT", "TEXTAREA"].includes(e.target?.tagName)) return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) buffer = ""; // Clear buffer if pause > 100ms
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (buffer.length > 2) {
          handleBarcodeScan(buffer.trim());
          buffer = "";
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products]);

  const handleBarcodeScan = async (value) => {
    if (!value) return;
    try {
      const res = await productsApi.lookupBySku(value);
      if (res.success && res.data) {
        playScanBeep();
        const found = res.data;
        setMatchedProduct(found);
        form.setValue("productId", String(found.id));
        if (found.supplier) form.setValue("supplierId", String(found.supplier));
        if (found.unit_cost || found.price) form.setValue("unitCost", Number(found.unit_cost || found.price));
        setBarcodeInput("");
        toast.success(`Matched Barcode SKU: ${found.name}`);
      } else {
        toast.error("No product matching scanned barcode");
      }
    } catch {
      toast.error("Product barcode lookup failed");
    }
  };

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
        received_at: new Date().toISOString(),
      });

      playScanBeep();
      toast.success(`Received ${data.quantity} × ${selectedProduct?.name || "Product"}`);

      // Update session totals & transaction feed
      setSessionCount((prev) => prev + Number(data.quantity));
      setSessionValue((prev) => prev + Number(data.quantity) * Number(data.unitCost || 0));

      const newTx = {
        id: Date.now(),
        productName: selectedProduct?.name || "Product",
        sku: selectedProduct?.sku || "SKU",
        quantity: data.quantity,
        totalValue: data.quantity * (data.unitCost || 0),
        timestamp: new Date().toLocaleTimeString(),
        reference: data.reference || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
      };
      setRecentTransactions((prev) => [newTx, ...prev.slice(0, 4)]);

      form.reset({
        quantity: 1,
        unitCost: selectedProduct?.unit_cost || 0,
        reference: "",
        notes: "",
        locationId: data.locationId,
      });
      setMatchedProduct(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Stock in transaction failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <ArrowDownToLine className="h-8 w-8 text-emerald-400" /> Stock In Receiving
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Receive incoming shipments, scan product SKUs with barcode hardware or camera, and update inventory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs py-1">
            <Zap className="mr-1 h-3.5 w-3.5" /> Hardware Scanner Listening
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StockInKpiCard
          title="Received Today"
          value={`${sessionCount} Units`}
          subtitle="Session receiving count"
          icon={Package}
          color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          glowColor="from-emerald-500/20 to-transparent"
        />

        <StockInKpiCard
          title="Session Batch Value"
          value={`£${sessionValue.toFixed(2)}`}
          subtitle="Net received value"
          icon={Wallet}
          color="bg-blue-500/10 text-blue-400 border-blue-500/20"
          glowColor="from-blue-500/20 to-transparent"
        />

        <StockInKpiCard
          title="Receiving Warehouse"
          value={locations.find((l) => String(l.id) === form.watch("locationId"))?.name || "Main Warehouse"}
          subtitle="Active destination location"
          icon={MapPin}
          color="bg-purple-500/10 text-purple-400 border-purple-500/20"
          glowColor="from-purple-500/20 to-transparent"
        />

        <StockInKpiCard
          title="Scanner Mode"
          value="Gun & Camera"
          subtitle="Audio chime feedback active"
          icon={Barcode}
          color="bg-amber-500/10 text-amber-400 border-amber-500/20"
          glowColor="from-amber-500/20 to-transparent"
        />
      </div>

      {/* Redesigned High-Tech Barcode Quick-Scan Card */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-slate-900/60 border-emerald-500/30 shadow-2xl backdrop-blur-2xl">
        <CardContent className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
              <Barcode className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Barcode Quick-Scan Engine</h3>
                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                  Laser Ready
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Scan product barcode label or enter SKU to automatically auto-fill receipt form.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Input
              placeholder="Scan or enter SKU (e.g. SKU-0001)..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan(barcodeInput.trim())}
              className="bg-slate-950/80 border-emerald-500/30 text-white placeholder:text-slate-500 h-10 w-full sm:w-64 focus:border-emerald-500"
            />
            <Button
              onClick={() => handleBarcodeScan(barcodeInput.trim())}
              className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold h-10 px-3.5"
            >
              <Zap className="mr-1.5 h-3.5 w-3.5 text-emerald-400" /> Scan SKU
            </Button>

            <Button
              onClick={() => setIsCameraOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 h-10 px-3.5"
            >
              <Camera className="mr-1.5 h-4 w-4" /> Camera Scan
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsSampleDrawerOpen(true)}
              className="border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs h-10 px-3.5"
            >
              <Tag className="mr-1.5 h-4 w-4 text-emerald-400" /> Test Barcodes
            </Button>
          </div>
        </CardContent>

        {/* Matched Product Preview Chip */}
        {matchedProduct && (
          <div className="mx-5 mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-200">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 bg-emerald-500/20 border border-emerald-500/40">
                <AvatarFallback className="text-emerald-400 font-bold text-xs">
                  {matchedProduct.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-bold text-white">{matchedProduct.name}</div>
                <div className="text-[11px] text-emerald-300">
                  Category: {matchedProduct.category || "General"} · Current Stock: <strong>{matchedProduct.stock ?? 0} units</strong>
                </div>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 font-mono">
              {matchedProduct.sku}
            </Badge>
          </div>
        )}
      </Card>

      {/* Receive Stock Form Card */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
        <CardHeader className="border-b border-slate-800 pb-4">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-emerald-400" /> Stock In Receipt Form
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Select item parameters to issue stock in transaction and generate audit log.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Product Selection */}
                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-emerald-400" /> Product Name *
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="justify-between bg-slate-950/60 border-slate-800 text-white hover:bg-slate-900 h-10"
                          >
                            {field.value
                              ? products.find((p) => String(p.id) === field.value)?.name
                              : "Search or select product..."}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[340px] p-0 bg-slate-900 border-slate-800 text-white">
                          <Command className="bg-slate-900 text-white">
                            <CommandInput placeholder="Search product name or SKU..." className="text-xs text-white" />
                            <CommandEmpty className="p-3 text-xs text-slate-400">No product found.</CommandEmpty>
                            <CommandGroup className="max-h-60 overflow-y-auto">
                              {products.map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={p.name}
                                  onSelect={() => {
                                    field.onChange(String(p.id));
                                    if (p.supplier) form.setValue("supplierId", String(p.supplier));
                                    if (p.unit_cost || p.price) form.setValue("unitCost", Number(p.unit_cost || p.price));
                                  }}
                                  className="flex items-center justify-between text-xs cursor-pointer hover:bg-slate-800"
                                >
                                  <span>{p.name}</span>
                                  <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                    {p.sku || `SKU-${p.id}`}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Supplier Selection */}
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-emerald-400" /> Supplier Vendor *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-950/60 border-slate-800 text-white h-10">
                            <SelectValue placeholder="Select vendor supplier..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Destination Location */}
                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-emerald-400" /> Destination Location *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-950/60 border-slate-800 text-white h-10">
                            <SelectValue placeholder="Select warehouse location..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          {locations.map((l) => (
                            <SelectItem key={l.id} value={String(l.id)}>
                              {l.name} ({l.location_type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Quantity & Quick Chips */}
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                          <Hash className="h-3.5 w-3.5 text-emerald-400" /> Intake Quantity *
                        </FormLabel>
                        <div className="flex items-center gap-1">
                          {[1, 5, 10, 50, 100].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => form.setValue("quantity", num)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-emerald-600 hover:text-white transition-colors"
                            >
                              +{num}
                            </button>
                          ))}
                        </div>
                      </div>
                      <FormControl>
                        <Input type="number" min="1" {...field} className="bg-slate-950/60 border-slate-800 text-white h-10 font-bold text-base" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Unit Cost */}
                <FormField
                  control={form.control}
                  name="unitCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-400" /> Unit Cost (£)
                      </FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} className="bg-slate-950/60 border-slate-800 text-white h-10 font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Reference Code */}
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-emerald-400" /> Reference / PO Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. PO-2026-8841" {...field} className="bg-slate-950/60 border-slate-800 text-white h-10 font-mono" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <StickyNote className="h-3.5 w-3.5 text-emerald-400" /> Receiving Remarks & Audit Notes
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add batch numbers, package condition, or delivery notes..." rows={2} {...field} className="bg-slate-950/60 border-slate-800 text-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Live Batch Valuation Receipt Summary */}
              {selectedProduct && quantity > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-slate-900/80 p-4 text-emerald-200 shadow-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-400" />
                    <div>
                      <h5 className="font-bold text-white text-sm">Receipt Batch Valuation Summary</h5>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Receiving <strong className="text-emerald-300 font-bold">{quantity} units</strong> of{" "}
                        <strong className="text-white font-bold">{selectedProduct.name}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400">Total Batch Value</div>
                    <div className="text-xl font-black text-emerald-400 font-mono">
                      £{totalCost.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset({ quantity: 1, unitCost: 0, reference: "", notes: "" });
                    setMatchedProduct(null);
                  }}
                  className="border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300"
                >
                  Reset Form
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-6 shadow-lg shadow-emerald-500/20"
                >
                  {isSubmitting ? "Processing Transaction..." : "Confirm Stock In"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Recent Stock In Transactions Feed */}
      {recentTransactions.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-400" /> Recent Receiving Session Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Product Name</TableHead>
                  <TableHead className="text-slate-400">SKU</TableHead>
                  <TableHead className="text-slate-400">Reference</TableHead>
                  <TableHead className="text-slate-400 text-right">Qty Received</TableHead>
                  <TableHead className="text-slate-400 text-right">Batch Value (£)</TableHead>
                  <TableHead className="text-slate-400 text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((tx) => (
                  <TableRow key={tx.id} className="border-slate-800/60 hover:bg-slate-800/30">
                    <TableCell className="font-semibold text-white">{tx.productName}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {tx.sku}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">{tx.reference}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-400">+{tx.quantity}</TableCell>
                    <TableCell className="text-right font-mono text-white">£{tx.totalValue.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-xs text-slate-400">{tx.timestamp}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Camera Barcode Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScanSuccess={handleBarcodeScan}
        products={products}
      />

      {/* Printable Barcodes Drawer */}
      <SampleBarcodesDrawer
        isOpen={isSampleDrawerOpen}
        onClose={() => setIsSampleDrawerOpen(false)}
        products={products}
        onScanSuccess={handleBarcodeScan}
      />
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
