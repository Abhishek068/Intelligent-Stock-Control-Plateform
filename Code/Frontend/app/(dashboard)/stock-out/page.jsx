"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowUpFromLine,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Layers,
  MapPin,
  DollarSign,
  Wallet,
  Package,
  Hash,
  FileText,
  StickyNote,
  Zap,
  History,
  Tag,
  Send,
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { productsApi, locationsApi, stockApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth.store";
import { ModuleGate } from "@/components/shared/ModuleGate";

import { CameraScannerModal } from "@/features/stock-in/components/CameraScannerModal";
import { SampleBarcodesDrawer } from "@/features/stock-in/components/SampleBarcodesDrawer";

const stockOutSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  locationId: z.string().min(1, "Select a location"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  issuedTo: z.string().min(1, "Select destination"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

const DESTINATIONS = [
  { value: "Department A", label: "Department A (Production)" },
  { value: "Department B", label: "Department B (Maintenance)" },
  { value: "Customer Order", label: "Direct Customer Order" },
  { value: "Internal Use", label: "Internal Facility Use" },
  { value: "Transfer Out", label: "External Branch Transfer" },
];

function StockOutKpiCard({ title, value, subtitle, icon: Icon, color, glowColor }) {
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

function StockOutPageContent() {
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState([]);
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
    resolver: zodResolver(stockOutSchema),
    defaultValues: { quantity: 1, reference: "", notes: "", issuedTo: "Department A" },
  });

  const productId = form.watch("productId");
  const quantity = form.watch("quantity") || 0;
  const selectedProduct = useMemo(
    () => products.find((p) => String(p.id) === productId),
    [products, productId]
  );
  const availableStock = selectedProduct?.stock ?? 0;
  const isOverIssuing = quantity > availableStock || availableStock <= 0;
  const unitPrice = selectedProduct?.unit_cost || selectedProduct?.price || 0;
  const totalIssueValue = useMemo(() => quantity * unitPrice, [quantity, unitPrice]);

  // Audio Beep Generator
  const playScanBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.12);
    } catch (e) {}
  }, [soundEnabled]);

  useEffect(() => {
    Promise.all([productsApi.list(), locationsApi.list()]).then(([p, l]) => {
      setProducts(p);
      setLocations(l);
      if (l.length > 0) form.setValue("locationId", String(l[0].id));
    });
  }, [form]);

  useEffect(() => {
    if (selectedProduct) form.setValue("quantity", 1);
  }, [productId, form, selectedProduct]);

  // Global Hardware Barcode Gun Listener
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      if (["INPUT", "TEXTAREA"].includes(e.target?.tagName)) return;

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) buffer = "";
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
        setBarcodeInput("");
        toast.success(`Matched Barcode SKU: ${found.name} (Stock: ${found.stock ?? 0})`);
      } else {
        toast.error("No product matching scanned barcode");
      }
    } catch {
      toast.error("Product barcode lookup failed");
    }
  };

  const onSubmit = async (data) => {
    if (isOverIssuing) {
      toast.error("Requested quantity exceeds available stock!");
      return;
    }

    setIsSubmitting(true);
    try {
      await stockApi.stockOut({
        product: Number(data.productId),
        location: Number(data.locationId),
        quantity: data.quantity,
        issued_to: data.issuedTo,
        reference: data.reference,
        notes: data.notes,
        issued_at: new Date().toISOString(),
      });

      playScanBeep();
      toast.success(`Issued ${data.quantity} × ${selectedProduct?.name || "Product"}`);

      // Update session totals & transaction log
      setSessionCount((prev) => prev + Number(data.quantity));
      setSessionValue((prev) => prev + Number(data.quantity) * unitPrice);

      const newTx = {
        id: Date.now(),
        productName: selectedProduct?.name || "Product",
        sku: selectedProduct?.sku || "SKU",
        quantity: data.quantity,
        issuedTo: data.issuedTo,
        totalValue: data.quantity * unitPrice,
        timestamp: new Date().toLocaleTimeString(),
        reference: data.reference || `SO-${Math.floor(1000 + Math.random() * 9000)}`,
      };
      setRecentTransactions((prev) => [newTx, ...prev.slice(0, 4)]);

      // Refresh products list
      const refreshed = await productsApi.list();
      setProducts(refreshed);

      form.reset({
        quantity: 1,
        reference: "",
        notes: "",
        locationId: data.locationId,
        issuedTo: data.issuedTo,
      });
      setMatchedProduct(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Stock out transaction failed");
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
            <ArrowUpFromLine className="h-8 w-8 text-blue-400" /> Stock Out Dispatch
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Issue inventory goods to departments, orders, or customers with automated barcode lookup and audit trails.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs py-1">
            <Zap className="mr-1 h-3.5 w-3.5" /> Barcode Gun & Camera Active
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StockOutKpiCard
          title="Issued Today"
          value={`${sessionCount} Units`}
          subtitle="Session dispatch count"
          icon={Package}
          color="bg-blue-500/10 text-blue-400 border-blue-500/20"
          glowColor="from-blue-500/20 to-transparent"
        />

        <StockOutKpiCard
          title="Session Issued Value"
          value={`£${sessionValue.toFixed(2)}`}
          subtitle="Net dispatched value"
          icon={Wallet}
          color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          glowColor="from-emerald-500/20 to-transparent"
        />

        <StockOutKpiCard
          title="Source Warehouse"
          value={locations.find((l) => String(l.id) === form.watch("locationId"))?.name || "Main Warehouse"}
          subtitle="Active dispatch location"
          icon={MapPin}
          color="bg-purple-500/10 text-purple-400 border-purple-500/20"
          glowColor="from-purple-500/20 to-transparent"
        />

        <StockOutKpiCard
          title="Scanner Mode"
          value="Gun & Camera"
          subtitle="Audio chime feedback active"
          icon={Barcode}
          color="bg-amber-500/10 text-amber-400 border-amber-500/20"
          glowColor="from-amber-500/20 to-transparent"
        />
      </div>

      {/* High-Tech Barcode Quick-Scan Card */}
      <Card className="relative overflow-hidden bg-gradient-to-r from-blue-950/40 via-slate-900/80 to-slate-900/60 border-blue-500/30 shadow-2xl backdrop-blur-2xl">
        <CardContent className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/30 animate-pulse">
              <Barcode className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Barcode Quick-Scan Engine</h3>
                <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-[10px]">
                  Issuing Laser Ready
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Scan product barcode label or enter SKU to automatically auto-fill stock out form.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Input
              placeholder="Scan or enter SKU (e.g. SKU-0001)..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan(barcodeInput.trim())}
              className="bg-slate-950/80 border-blue-500/30 text-white placeholder:text-slate-500 h-10 w-full sm:w-64 focus:border-blue-500"
            />
            <Button
              onClick={() => handleBarcodeScan(barcodeInput.trim())}
              className="bg-blue-500/10 border border-blue-500/30 text-blue-300 hover:bg-blue-500/20 text-xs font-semibold h-10 px-3.5"
            >
              <Zap className="mr-1.5 h-3.5 w-3.5 text-blue-400" /> Scan SKU
            </Button>

            <Button
              onClick={() => setIsCameraOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 h-10 px-3.5"
            >
              <Camera className="mr-1.5 h-4 w-4" /> Camera Scan
            </Button>

            <Button
              variant="outline"
              onClick={() => setIsSampleDrawerOpen(true)}
              className="border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs h-10 px-3.5"
            >
              <Tag className="mr-1.5 h-4 w-4 text-blue-400" /> Test Barcodes
            </Button>
          </div>
        </CardContent>

        {/* Matched Product Preview Chip */}
        {matchedProduct && (
          <div className="mx-5 mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between text-xs text-blue-200">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 bg-blue-500/20 border border-blue-500/40">
                <AvatarFallback className="text-blue-400 font-bold text-xs">
                  {matchedProduct.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-bold text-white">{matchedProduct.name}</div>
                <div className="text-[11px] text-blue-300">
                  Category: {matchedProduct.category || "General"} · Available Stock:{" "}
                  <strong className={matchedProduct.stock > 0 ? "text-emerald-400" : "text-rose-400"}>
                    {matchedProduct.stock ?? 0} units
                  </strong>
                </div>
              </div>
            </div>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 font-mono">
              {matchedProduct.sku}
            </Badge>
          </div>
        )}
      </Card>

      {/* Stock Out Form Card */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
        <CardHeader className="border-b border-slate-800 pb-4">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-400" /> Stock Out Issue Form
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Issue items from inventory to designated department or customer with audit logging.
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
                        <Package className="h-3.5 w-3.5 text-blue-400" /> Product Name *
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
                                  onSelect={() => field.onChange(String(p.id))}
                                  className="flex items-center justify-between text-xs cursor-pointer hover:bg-slate-800"
                                >
                                  <span>{p.name}</span>
                                  <span className="font-mono text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                                    Stock: {p.stock ?? 0}
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

                {/* Location Selection */}
                <FormField
                  control={form.control}
                  name="locationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-blue-400" /> Source Location *
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
                          <Hash className="h-3.5 w-3.5 text-blue-400" /> Quantity to Issue *
                        </FormLabel>
                        <div className="flex items-center gap-1">
                          {[1, 5, 10, 50, 100].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => form.setValue("quantity", num)}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-blue-600 hover:text-white transition-colors"
                            >
                              +{num}
                            </button>
                          ))}
                        </div>
                      </div>
                      <FormControl>
                        <Input type="number" min="1" {...field} className="bg-slate-950/60 border-slate-800 text-white h-10 font-bold text-base" />
                      </FormControl>
                      {selectedProduct && (
                        <p className="text-[11px] text-slate-400">
                          Current available stock:{" "}
                          <strong className={availableStock > 0 ? "text-emerald-400" : "text-rose-400"}>
                            {availableStock} units
                          </strong>
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Destination */}
                <FormField
                  control={form.control}
                  name="issuedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Send className="h-3.5 w-3.5 text-blue-400" /> Issue Destination *
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-950/60 border-slate-800 text-white h-10">
                            <SelectValue placeholder="Select destination department or customer..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          {DESTINATIONS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Reference Code */}
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-blue-400" /> Reference / Order Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. SO-2026-0042" {...field} className="bg-slate-950/60 border-slate-800 text-white h-10 font-mono" />
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
                      <StickyNote className="h-3.5 w-3.5 text-blue-400" /> Issue Purpose & Notes
                    </FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add requisition details, project code, or dispatch notes..." rows={2} {...field} className="bg-slate-950/60 border-slate-800 text-white" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Warnings & Valuation Cards */}
              {isOverIssuing && (
                <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/30 text-rose-300">
                  <AlertTriangle className="h-4 w-4 text-rose-400" />
                  <AlertTitle className="font-bold text-sm">Insufficient Stock Level</AlertTitle>
                  <AlertDescription className="text-xs">
                    Requested <strong>{quantity} units</strong> exceeds total available stock (<strong>{availableStock} units</strong>).
                  </AlertDescription>
                </Alert>
              )}

              {selectedProduct && !isOverIssuing && quantity > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-950/30 via-slate-900/60 to-slate-900/80 p-4 text-blue-200 shadow-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 shrink-0 text-blue-400" />
                    <div>
                      <h5 className="font-bold text-white text-sm">Issue Dispatch Summary</h5>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Issuing <strong className="text-blue-300 font-bold">{quantity} units</strong> of{" "}
                        <strong className="text-white font-bold">{selectedProduct.name}</strong> to{" "}
                        <strong className="text-blue-300 font-bold">{form.watch("issuedTo")}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-slate-400">Total Issue Value</div>
                    <div className="text-xl font-black text-blue-400 font-mono">
                      £{totalIssueValue.toFixed(2)}
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
                    form.reset({ quantity: 1, reference: "", notes: "" });
                    setMatchedProduct(null);
                  }}
                  className="border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300"
                >
                  Reset Form
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isOverIssuing}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 shadow-lg shadow-blue-500/20"
                >
                  {isSubmitting ? "Processing Dispatch..." : "Confirm Stock Out"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Recent Stock Out Activity Log */}
      {recentTransactions.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <History className="h-4 w-4 text-blue-400" /> Recent Dispatch Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Product Name</TableHead>
                  <TableHead className="text-slate-400">SKU</TableHead>
                  <TableHead className="text-slate-400">Destination</TableHead>
                  <TableHead className="text-slate-400">Reference</TableHead>
                  <TableHead className="text-slate-400 text-right">Qty Issued</TableHead>
                  <TableHead className="text-slate-400 text-right">Total Value (£)</TableHead>
                  <TableHead className="text-slate-400 text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((tx) => (
                  <TableRow key={tx.id} className="border-slate-800/60 hover:bg-slate-800/30">
                    <TableCell className="font-semibold text-white">{tx.productName}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {tx.sku}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-300">{tx.issuedTo}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">{tx.reference}</TableCell>
                    <TableCell className="text-right font-bold text-blue-400">-{tx.quantity}</TableCell>
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

export default function StockOutPage() {
  return (
    <ModuleGate module="stock_out" action="create">
      <StockOutPageContent />
    </ModuleGate>
  );
}
