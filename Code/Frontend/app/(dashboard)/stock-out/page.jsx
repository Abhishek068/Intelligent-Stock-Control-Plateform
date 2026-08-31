"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowUpFromLine,
  Barcode,
  AlertTriangle,
  CheckCircle,
  PackageMinus,
  Box,
  History,
  Search,
  Warehouse,
  RotateCcw,
  ExternalLink,
  ShieldAlert,
  Zap,
  Layers,
  Trash2,
  CheckCircle2,
  Volume2,
  VolumeX,
  Camera,
  Loader2,
  ArrowRight,
  FileSpreadsheet,
  Truck,
  ShoppingCart
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { productsApi, locationsApi, stockApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth.store";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { CameraScannerModal } from "@/features/stock-in/components/CameraScannerModal";
import { SampleBarcodesDrawer } from "@/features/stock-in/components/SampleBarcodesDrawer";

const stockOutSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  locationId: z.string().optional(),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  issuedTo: z.string().min(1, "Select destination"),
  batchId: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional()
});

function playScanAudio(success = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = success ? "sine" : "sawtooth";
    osc.frequency.setValueAtTime(success ? 880 : 220, ctx.currentTime);
    if (success) {
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
    }
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

function StockOutPageContent() {
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get("productId");

  // Global Data
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [registeredStores, setRegisteredStores] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Mode: "rapid" or "single"
  const [dispatchMode, setDispatchMode] = useState("rapid");

  // Hardware Scanner / Single Form State
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [sampleDrawerOpen, setSampleDrawerOpen] = useState(false);

  // ----------------------------------------------------
  // RAPID OUTBOUND DISPATCH MANIFEST STATE
  // ----------------------------------------------------
  const [rapidLocationId, setRapidLocationId] = useState("");
  const [rapidIssuedTo, setRapidIssuedTo] = useState("Main Store");
  const [rapidReason, setRapidReason] = useState("sale");
  const [rapidReference, setRapidReference] = useState(
    () => `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`
  );
  const [rapidPackMultiplier, setRapidPackMultiplier] = useState(1);
  const [rapidWorkflowType, setRapidWorkflowType] = useState("manifest"); // "manifest" or "instant"
  const [rapidManifest, setRapidManifest] = useState([]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState(null);

  const rapidInputRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(stockOutSchema),
    defaultValues: { quantity: 1, locationId: "", batchId: "", reference: "", notes: "", issuedTo: "Main Store" }
  });

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await stockApi.listStockOut();
      setHistoryLogs(data || []);
    } catch {
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [pRes, lRes] = await Promise.all([
          productsApi.list().catch(() => []),
          locationsApi.list().catch(() => [])
        ]);
        const pList = Array.isArray(pRes) ? pRes : (pRes?.results || pRes?.data || []);
        const lList = Array.isArray(lRes) ? lRes : (lRes?.results || lRes?.data || []);

        let savedStores = [];
        try {
          const stored = localStorage.getItem("registered_stores");
          if (stored) savedStores = JSON.parse(stored);
        } catch {}

        setProducts(pList);
        setLocations(lList);
        setRegisteredStores(savedStores);

        if (lList.length > 0) {
          const centralWh = lList.find((l) => l.name === "Central Warehouse");
          const defaultLocId = centralWh ? String(centralWh.id) : String(lList[0].id);
          setRapidLocationId(defaultLocId);
          if (!form.getValues("locationId")) {
            form.setValue("locationId", defaultLocId);
          }
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    };
    loadInitialData();
    loadHistory();
  }, [loadHistory, form]);

  // Auto-select product when navigating from barcode scanner with ?productId=
  useEffect(() => {
    if (!preselectedProductId || products.length === 0) return;

    const pid = String(preselectedProductId);
    requestAnimationFrame(() => {
      form.setValue("productId", pid, { shouldValidate: true, shouldDirty: true });
    });
  }, [preselectedProductId, products, form]);

  const productId = form.watch("productId");
  const locationId = form.watch("locationId");
  const quantity = form.watch("quantity") || 0;
  const batchId = form.watch("batchId");
  const selectedProduct = products.find((p) => String(p.id) === productId);

  // Fetch product detail for location-specific balances
  useEffect(() => {
    if (!productId) {
      setSelectedProductDetail(null);
      return;
    }
    productsApi
      .get(productId)
      .then((detail) => setSelectedProductDetail(detail))
      .catch(() => setSelectedProductDetail(null));
  }, [productId]);

  // Fetch active batches for this product & location
  useEffect(() => {
    if (!productId) {
      setBatches([]);
      form.setValue("batchId", "");
      return;
    }
    stockApi
      .listBatches({
        product: productId,
        location: locationId || undefined,
        active_only: true
      })
      .then((rows) => {
        setBatches(rows || []);
        form.setValue("batchId", "");
      })
      .catch(() => setBatches([]));
  }, [productId, locationId, form]);

  // Calculate available stock based on selected product and location
  const availableStock = useMemo(() => {
    if (!selectedProduct) return 0;
    if (locationId && selectedProductDetail?.inventory_by_location) {
      const locBalance = selectedProductDetail.inventory_by_location.find(
        (b) => String(b.location_id) === String(locationId)
      );
      if (locBalance) {
        return locBalance.available ?? locBalance.quantity_on_hand ?? 0;
      }
    }
    return selectedProduct?.stock ?? selectedProduct?.stock_level ?? selectedProduct?.quantity_on_hand ?? 0;
  }, [selectedProduct, locationId, selectedProductDetail]);

  const selectedBatch = batches.find((b) => String(b.id) === batchId);
  const recommendedBatch = batches.find((b) => b.is_fifo_recommended);
  const isNonFifoSelection = selectedBatch && recommendedBatch && selectedBatch.id !== recommendedBatch.id;

  const activeValidBatches = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return batches.filter((b) => !b.expiry_date || b.expiry_date >= today);
  }, [batches]);

  const allBatchesExpired = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return batches.length > 0 && batches.every((b) => b.expiry_date && b.expiry_date < today);
  }, [batches]);

  const isBlockedDueToExpiry = allBatchesExpired || (selectedBatch?.expiry_date && selectedBatch.expiry_date < new Date().toISOString().slice(0, 10));

  // Single Item Submit
  const onSubmit = async (data) => {
    if (quantity > availableStock) {
      toast.error(`Quantity (${quantity}) exceeds available stock (${availableStock})`);
      return;
    }

    if (isBlockedDueToExpiry) {
      toast.error("Cannot issue expired stock. Please adjust or return to supplier.");
      return;
    }

    setIsSubmitting(true);
    try {
      await stockApi.stockOut({
        productId: Number(data.productId),
        locationId: data.locationId ? Number(data.locationId) : undefined,
        quantity: data.quantity,
        reason: "sale",
        batchId: data.batchId ? Number(data.batchId) : undefined,
        reference: data.reference,
        notes: data.notes
          ? `${data.issuedTo ? `[Destination: ${data.issuedTo}] ` : ""}${data.notes}`
          : data.issuedTo
          ? `[Destination: ${data.issuedTo}]`
          : undefined,
        timestamp: new Date().toISOString()
      });

      toast.success(`Successfully dispatched ${data.quantity} × ${selectedProduct?.name || "Product"}`);
      form.reset({ quantity: 1, locationId: data.locationId, batchId: "", reference: "", notes: "", issuedTo: data.issuedTo });
      const refreshed = await productsApi.list();
      setProducts(refreshed);
      await loadHistory();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Stock out failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // RAPID OUTBOUND SCANNER LOGIC
  // ----------------------------------------------------
  const handleRapidScan = async (scannedCode) => {
    const code = scannedCode.trim();
    if (!code) return;

    try {
      // Lookup product by SKU, Barcode, or ID
      const res = await productsApi.lookup(code).catch(() => productsApi.lookupBySku(code));
      const prod = res?.data || res;
      if (!prod || !prod.id) {
        if (soundEnabled) playScanAudio(false);
        toast.error(`Product not found for scan: "${code}"`);
        return;
      }

      // Check current location balance & active batches
      const detailRes = await productsApi.get(prod.id).catch(() => prod);
      const productDetail = detailRes?.data || detailRes || prod;

      let locStock = productDetail.stock ?? productDetail.quantity_on_hand ?? 0;
      if (rapidLocationId && productDetail.inventory_by_location) {
        const locBalance = productDetail.inventory_by_location.find(
          (b) => String(b.location_id) === String(rapidLocationId)
        );
        if (locBalance) {
          locStock = locBalance.available ?? locBalance.quantity_on_hand ?? 0;
        }
      }

      const qtyToAdd = Number(rapidPackMultiplier) || 1;
      const unitPrice = Number(prod.unit_price || prod.unit_cost || prod.cost_price || 0);

      // Instant Auto-Dispatch Mode
      if (rapidWorkflowType === "instant") {
        if (locStock < qtyToAdd) {
          if (soundEnabled) playScanAudio(false);
          toast.error(`Insufficient stock for ${prod.name}! On hand: ${locStock}, Requested: ${qtyToAdd}`);
          return;
        }

        const locId = rapidLocationId ? Number(rapidLocationId) : undefined;
        await stockApi.stockOut({
          productId: Number(prod.id),
          locationId: locId,
          quantity: qtyToAdd,
          reason: rapidReason || "sale",
          reference: rapidReference || `DISP-${new Date().toISOString().slice(0, 10)}`,
          notes: `Instant scan: ${code} [Destination: ${rapidIssuedTo}]`,
          timestamp: new Date().toISOString()
        });

        if (soundEnabled) playScanAudio(true);
        toast.success(`⚡ Auto-Dispatched: -${qtyToAdd} × ${prod.name}`);

        setLastScannedItem({
          id: prod.id,
          name: prod.name,
          sku: prod.sku,
          quantity: qtyToAdd,
          unit_price: unitPrice,
          remaining: locStock - qtyToAdd,
          timestamp: new Date().toLocaleTimeString()
        });

        const refreshed = await productsApi.list();
        setProducts(refreshed);
        loadHistory();
      } else {
        // Manifest Staging Mode: Add to Live Outbound Pick List
        if (soundEnabled) playScanAudio(true);

        setRapidManifest((prev) => {
          const existingIndex = prev.findIndex((item) => String(item.productId) === String(prod.id));
          if (existingIndex >= 0) {
            const updated = [...prev];
            const newQty = updated[existingIndex].quantity + qtyToAdd;
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: newQty,
              subtotal: newQty * updated[existingIndex].unitPrice,
              isOverstock: newQty > updated[existingIndex].currentStock
            };
            return updated;
          } else {
            return [
              {
                productId: prod.id,
                name: prod.name,
                sku: prod.sku,
                category: prod.category_name || "General",
                currentStock: locStock,
                quantity: qtyToAdd,
                unitPrice: unitPrice,
                isOverstock: qtyToAdd > locStock,
                subtotal: qtyToAdd * unitPrice
              },
              ...prev
            ];
          }
        });

        setLastScannedItem({
          id: prod.id,
          name: prod.name,
          sku: prod.sku,
          quantity: qtyToAdd,
          unit_price: unitPrice,
          remaining: locStock - qtyToAdd,
          timestamp: new Date().toLocaleTimeString()
        });

        toast.success(`Added +${qtyToAdd} × ${prod.name} to Dispatch Manifest`);
      }

      setBarcodeInput("");
      if (rapidInputRef.current) rapidInputRef.current.focus();
    } catch (err) {
      if (soundEnabled) playScanAudio(false);
      toast.error(`Scan failed: ${err.message || "Unknown error"}`);
    }
  };

  const handleUpdateManifestItem = (index, field, value) => {
    setRapidManifest((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === "quantity" || field === "unitPrice") {
        item.subtotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
        item.isOverstock = Number(item.quantity) > item.currentStock;
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveManifestItem = (index) => {
    setRapidManifest((prev) => prev.filter((_, i) => i !== index));
    toast.info("Item removed from dispatch manifest");
  };

  const handleBulkCommitManifest = async () => {
    if (rapidManifest.length === 0) {
      toast.error("No items in the dispatch manifest to process.");
      return;
    }

    const hasOverstock = rapidManifest.some((i) => i.quantity > i.currentStock);
    if (hasOverstock) {
      toast.error("One or more items exceed available warehouse stock. Please adjust quantities.");
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const payload = {
        location: rapidLocationId ? Number(rapidLocationId) : undefined,
        reason: rapidReason || "sale",
        reference: rapidReference,
        notes: `Bulk dispatch (${rapidManifest.length} SKUs) to ${rapidIssuedTo}`,
        items: rapidManifest.map((item) => ({
          product: Number(item.productId),
          quantity: Number(item.quantity),
          unit_price: Number(item.unitPrice) || 0,
          reason: rapidReason || "sale",
          reference: rapidReference,
          notes: `Destination: ${rapidIssuedTo}`
        }))
      };

      const res = await stockApi.bulkStockOut(payload);
      if (soundEnabled) playScanAudio(true);
      toast.success(
        `Dispatched successfully! ${res.total_items || rapidManifest.length} item line(s) totaling ${res.total_quantity || manifestTotalUnits} units dispatched.`
      );

      setRapidManifest([]);
      const refreshed = await productsApi.list();
      setProducts(refreshed);
      await loadHistory();
    } catch (err) {
      if (soundEnabled) playScanAudio(false);
      toast.error(err instanceof ApiError ? err.message : "Bulk stock-out failed");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // Manifest Calculated Totals
  const manifestTotalUnits = useMemo(
    () => rapidManifest.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [rapidManifest]
  );
  const manifestTotalValue = useMemo(
    () => rapidManifest.reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0),
    [rapidManifest]
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Header Section with Mode Switcher */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-amber-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-500/20 rounded-xl border border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              <PackageMinus className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-slate-50 dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              Stock Out
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Issue and dispatch goods from warehouse inventory with rapid barcode scanning or manual entry.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
          <button
            type="button"
            onClick={() => setDispatchMode("rapid")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dispatchMode === "rapid"
                ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Zap className="h-4 w-4 text-amber-200 animate-pulse" />
            Rapid Outbound Dispatch
            <Badge className="bg-amber-300/30 text-white border-none text-[10px] px-1.5 py-0 font-extrabold">
              FAST
            </Badge>
          </button>
          <button
            type="button"
            onClick={() => setDispatchMode("single")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              dispatchMode === "single"
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Box className="h-4 w-4 text-amber-500" />
            Single Item Issue
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: RAPID OUTBOUND DISPATCH (MULTI-PRODUCT AUTO-SCAN)                 */}
      {/* ========================================================================= */}
      {dispatchMode === "rapid" && (
        <div className="space-y-6">
          {/* Outbound Delivery Header & Policy Bar */}
          <Card className="border border-amber-300/60 dark:border-amber-500/30 bg-gradient-to-br from-white via-amber-50/30 to-orange-50/20 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-slate-950/80 backdrop-blur-xl shadow-xl overflow-hidden rounded-2xl relative">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-amber-200/60 dark:border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 text-white rounded-xl shadow-sm">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                      Outbound Dispatch Configuration
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Configure warehouse source, customer/store destination, and packing rules for this shipment
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="rounded-xl border-slate-200 dark:border-white/10 text-xs font-semibold"
                  >
                    {soundEnabled ? (
                      <>
                        <Volume2 className="mr-1.5 h-3.5 w-3.5 text-amber-500" /> Audio On
                      </>
                    ) : (
                      <>
                        <VolumeX className="mr-1.5 h-3.5 w-3.5 text-slate-400" /> Audio Muted
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCameraModalOpen(true)}
                    className="rounded-xl border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-50 text-xs font-semibold"
                  >
                    <Camera className="mr-1.5 h-3.5 w-3.5 text-amber-500" /> Camera Scanner
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSampleDrawerOpen(true)}
                    className="rounded-xl border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    <Barcode className="mr-1.5 h-3.5 w-3.5 text-indigo-500" /> Test Barcodes
                  </Button>
                </div>
              </div>

              {/* Dispatch Session Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
                {/* Source Warehouse */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Warehouse className="h-3.5 w-3.5 text-amber-500" /> Source Warehouse
                  </Label>
                  <Select value={rapidLocationId} onValueChange={setRapidLocationId}>
                    <SelectTrigger className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 rounded-xl h-10 text-xs font-semibold">
                      <SelectValue placeholder="Select warehouse..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-xs">
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={String(loc.id)}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Destination / Issued To */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <ShoppingCart className="h-3.5 w-3.5 text-indigo-500" /> Destination / Store
                  </Label>
                  <Select value={rapidIssuedTo} onValueChange={setRapidIssuedTo}>
                    <SelectTrigger className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 rounded-xl h-10 text-xs font-semibold">
                      <SelectValue placeholder="Select destination..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-xs">
                      <SelectItem value="Main Store">Main Store</SelectItem>
                      <SelectItem value="Retail Counter">Retail Counter</SelectItem>
                      <SelectItem value="Internal Department">Internal Department</SelectItem>
                      <SelectItem value="Customer Delivery">Customer Delivery</SelectItem>
                      {registeredStores.map((st, i) => (
                        <SelectItem key={i} value={st.name}>
                          {st.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dispatch Reason */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Dispatch Reason
                  </Label>
                  <Select value={rapidReason} onValueChange={setRapidReason}>
                    <SelectTrigger className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 rounded-xl h-10 text-xs font-semibold">
                      <SelectValue placeholder="Select reason..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-xs">
                      <SelectItem value="sale">Customer Sale / Order</SelectItem>
                      <SelectItem value="internal">Store / Branch Supply</SelectItem>
                      <SelectItem value="damaged">Damage / Discard</SelectItem>
                      <SelectItem value="sample">Sample / Quality Inspection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Order / Reference */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Order / Dispatch Ref
                  </Label>
                  <Input
                    value={rapidReference}
                    onChange={(e) => setRapidReference(e.target.value)}
                    placeholder="e.g. ORD-20260831"
                    className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 rounded-xl h-10 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Scan Pack Multiplier & Mode Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 mt-4 border-t border-slate-200/60 dark:border-white/5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-amber-500" /> Default Scan Pick Increment:
                  </span>
                  {[
                    { label: "+1 Unit", val: 1 },
                    { label: "+6 (Pack)", val: 6 },
                    { label: "+10 (Box)", val: 10 },
                    { label: "+24 (Carton)", val: 24 },
                    { label: "+50 (Crate)", val: 50 }
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setRapidPackMultiplier(p.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        rapidPackMultiplier === p.val
                          ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-400/40"
                          : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Mode:</span>
                  <button
                    type="button"
                    onClick={() => setRapidWorkflowType("manifest")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      rapidWorkflowType === "manifest"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Manifest Review (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRapidWorkflowType("instant")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      rapidWorkflowType === "instant"
                        ? "bg-amber-500 text-white shadow-xs animate-pulse"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Instant Auto-Commit
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* High-Speed Scan Gun Barcode Input */}
          <Card className="border-2 border-amber-500/40 dark:border-amber-500/30 bg-white/95 dark:bg-slate-900/70 backdrop-blur-2xl shadow-xl rounded-2xl overflow-hidden relative">
            <div className="p-6 flex flex-col md:flex-row items-center gap-4 justify-between relative z-10">
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-md">
                  <Barcode className="h-7 w-7 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    High-Speed Gun Scanner Active
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                      LIVE PICKING
                    </Badge>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Scan product barcodes to pick and dispatch from {locations.find((l) => String(l.id) === rapidLocationId)?.name || "Warehouse"}.
                  </p>
                </div>
              </div>

              {/* Scan Form Input */}
              <div className="flex w-full md:max-w-xl items-center gap-2">
                <div className="relative w-full">
                  <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-500" />
                  <Input
                    ref={rapidInputRef}
                    autoFocus
                    placeholder="Scan barcode or type SKU to pick and press Enter..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && barcodeInput.trim()) {
                        e.preventDefault();
                        handleRapidScan(barcodeInput.trim());
                      }
                    }}
                    className="pl-11 pr-24 bg-white dark:bg-slate-950 border-2 border-amber-500/40 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 text-slate-900 dark:text-white font-mono font-bold text-base rounded-2xl h-14 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-inner"
                  />
                  <Button
                    type="button"
                    onClick={() => barcodeInput.trim() && handleRapidScan(barcodeInput.trim())}
                    className="absolute right-2 top-2 h-10 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm"
                  >
                    Scan Pick
                  </Button>
                </div>
              </div>
            </div>

            {/* Last Scanned Feedback Banner */}
            {lastScannedItem && (
              <div className="px-6 py-2.5 bg-amber-50/80 dark:bg-amber-500/10 border-t border-amber-200 dark:border-amber-500/20 flex items-center justify-between text-xs text-amber-900 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span>
                    Last Picked: <strong className="font-bold">{lastScannedItem.name}</strong> ({lastScannedItem.sku}) — Picked: <strong className="font-mono">-{lastScannedItem.quantity} units</strong> (Remaining on shelf: {lastScannedItem.remaining})
                  </span>
                </div>
                <span className="font-mono text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  Unit Val: £{lastScannedItem.unit_price.toFixed(2)}
                </span>
              </div>
            )}
          </Card>

          {/* Staged Dispatch Manifest Table */}
          {rapidWorkflowType === "manifest" && (
            <Card className="border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/40 backdrop-blur-2xl shadow-2xl rounded-2xl overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-lg">
                    <FileSpreadsheet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    Outbound Pick Manifest ({rapidManifest.length} Product{rapidManifest.length !== 1 ? "s" : ""})
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Dispatched from {locations.find((l) => String(l.id) === rapidLocationId)?.name || "Warehouse"} to {rapidIssuedTo}
                  </p>
                </div>

                {/* Stats Chips & Action Buttons */}
                <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
                  <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-white/10">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Pick Units</div>
                      <div className="text-lg font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                        {manifestTotalUnits} units
                      </div>
                    </div>
                    <div className="h-8 w-px bg-slate-200 dark:bg-white/10" />
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Valuation</div>
                      <div className="text-lg font-extrabold text-slate-900 dark:text-white font-mono">
                        £{manifestTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {rapidManifest.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRapidManifest([])}
                      className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl"
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Clear All
                    </Button>
                  )}

                  <Button
                    type="button"
                    disabled={rapidManifest.length === 0 || isBulkSubmitting || rapidManifest.some((i) => i.isOverstock)}
                    onClick={handleBulkCommitManifest}
                    className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl h-11 px-6 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isBulkSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Dispatching...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" /> Confirm Dispatch ({manifestTotalUnits} units)
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              {/* Manifest Table */}
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-white/5">
                      <TableRow className="hover:bg-transparent text-xs">
                        <TableHead className="py-3.5 pl-6 font-bold text-slate-700 dark:text-slate-300">Product / SKU</TableHead>
                        <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 text-center">Available Stock</TableHead>
                        <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 w-48 text-center">Dispatch Qty</TableHead>
                        <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 w-32">Unit Price (£)</TableHead>
                        <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 text-right">Subtotal</TableHead>
                        <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 text-center">Status</TableHead>
                        <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 pr-6 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rapidManifest.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Barcode className="h-10 w-10 text-slate-300 dark:text-slate-700 animate-bounce" />
                              <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">Dispatch Manifest is Empty</p>
                              <p className="text-xs text-slate-400 max-w-sm">
                                Scan product barcodes to build this pick list for fast fulfillment.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        rapidManifest.map((item, idx) => {
                          const remainingStock = item.currentStock - Number(item.quantity || 0);
                          return (
                            <TableRow key={item.productId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-b border-slate-200/60 dark:border-white/5 text-xs">
                              {/* Product Details */}
                              <TableCell className="pl-6 py-3 font-semibold text-slate-900 dark:text-slate-100">
                                <div>
                                  <span className="font-bold text-sm text-slate-900 dark:text-white">{item.name}</span>
                                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                                    <span>SKU: {item.sku}</span>
                                    <span>•</span>
                                    <span>{item.category}</span>
                                  </div>
                                </div>
                              </TableCell>

                              {/* Available Stock vs Remaining */}
                              <TableCell className="text-center">
                                <span className="font-mono text-slate-600 dark:text-slate-400 font-bold">
                                  {item.currentStock}
                                </span>
                                <ArrowRight className="inline mx-1.5 h-3 w-3 text-amber-500" />
                                <span
                                  className={`font-mono font-extrabold px-1.5 py-0.5 rounded ${
                                    remainingStock < 0
                                      ? "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                                      : "bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                                  }`}
                                >
                                  {remainingStock} left
                                </span>
                              </TableCell>

                              {/* Quantity Controls */}
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateManifestItem(idx, "quantity", Math.max(1, item.quantity - 1))}
                                    className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                                  >
                                    -
                                  </button>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => handleUpdateManifestItem(idx, "quantity", Math.max(1, Number(e.target.value) || 1))}
                                    className={`w-16 h-8 text-center font-mono font-extrabold rounded-lg text-sm bg-white dark:bg-slate-950 border ${
                                      item.isOverstock
                                        ? "border-rose-500 text-rose-600 dark:text-rose-400"
                                        : "border-slate-200 dark:border-white/10 text-amber-600 dark:text-amber-400"
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateManifestItem(idx, "quantity", item.quantity + 1)}
                                    className="h-7 w-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
                                  >
                                    +
                                  </button>
                                </div>
                                <div className="flex items-center justify-center gap-1 mt-1">
                                  {[5, 10, 24].map((amt) => (
                                    <button
                                      key={amt}
                                      type="button"
                                      onClick={() => handleUpdateManifestItem(idx, "quantity", item.quantity + amt)}
                                      className="text-[10px] font-bold text-slate-500 hover:text-amber-600 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded cursor-pointer"
                                    >
                                      +{amt}
                                    </button>
                                  ))}
                                </div>
                              </TableCell>

                              {/* Unit Price */}
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdateManifestItem(idx, "unitPrice", Number(e.target.value) || 0)}
                                  className="w-24 h-8 font-mono text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-lg font-bold"
                                />
                              </TableCell>

                              {/* Subtotal */}
                              <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-white">
                                £{(item.subtotal || 0).toFixed(2)}
                              </TableCell>

                              {/* Status */}
                              <TableCell className="text-center">
                                {item.isOverstock ? (
                                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 text-[10px]">
                                    Exceeds Stock
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 text-[10px]">
                                    Ready to Pick
                                  </Badge>
                                )}
                              </TableCell>

                              {/* Remove */}
                              <TableCell className="pr-6 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveManifestItem(idx)}
                                  className="h-7 w-7 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/20 rounded-lg cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: SINGLE ITEM MANUAL STOCK-OUT FORM                                 */}
      {/* ========================================================================= */}
      {dispatchMode === "single" && (
        <Card className="border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-2xl overflow-hidden rounded-2xl relative w-full">
          <div className="px-8 py-6 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-200 font-bold text-lg">
                <Box className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Issue Single Product
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Manual stock-out with strict FEFO batch tracking and compliance enforcement
              </p>
            </div>
          </div>

          <CardContent className="p-8 relative z-10">
            {/* Expired Stock Warning Banner */}
            {allBatchesExpired && (
              <div className="mb-6 rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50/90 dark:bg-rose-950/40 p-4 text-rose-900 dark:text-rose-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="h-6 w-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-sm text-rose-950 dark:text-rose-100">
                      All Available Batches for this Product Have Expired
                    </h5>
                    <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">
                      Per compliance and FEFO standards, expired stock cannot be issued to stores or customers.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href="/stock-adjustment">
                    <Button size="sm" variant="outline" className="border-rose-300 dark:border-rose-500/40 text-xs font-semibold hover:bg-rose-100">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Stock Adjustment
                    </Button>
                  </Link>
                  <Link href="/supplier-returns">
                    <Button size="sm" className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold">
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Return to Supplier
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Warehouse Location Selector */}
                  <FormField
                    control={form.control}
                    name="locationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Source Warehouse / Location
                        </FormLabel>
                        <Select
                          value={field.value || ""}
                          onValueChange={(val) => {
                            field.onChange(val);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-11 font-medium">
                              <SelectValue placeholder="Select warehouse..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-xs">
                            {locations.map((loc) => (
                              <SelectItem key={loc.id} value={String(loc.id)}>
                                {loc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-rose-500 text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Destination */}
                  <FormField
                    control={form.control}
                    name="issuedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Destination / Issued To <span className="text-rose-500">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "Main Store"}>
                          <FormControl>
                            <SelectTrigger className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-11 font-medium">
                              <SelectValue placeholder="Select destination..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-xs">
                            <SelectItem value="Main Store">Main Store</SelectItem>
                            <SelectItem value="Retail Counter">Retail Counter</SelectItem>
                            <SelectItem value="Internal Department">Internal Department</SelectItem>
                            <SelectItem value="Customer Delivery">Customer Delivery</SelectItem>
                            {registeredStores.map((st, i) => (
                              <SelectItem key={i} value={st.name}>
                                {st.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-rose-500 text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Product */}
                  <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem className="col-span-2 md:col-span-1">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Product <span className="text-rose-500">*</span>
                          </FormLabel>
                          {selectedProduct && (
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                              Available in Location: {availableStock} units
                            </span>
                          )}
                        </div>
                        <Select
                          value={field.value || ""}
                          onValueChange={(val) => {
                            field.onChange(val);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-11 font-medium">
                              <SelectValue placeholder="Select product..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-2xl rounded-xl text-slate-800 dark:text-slate-200 max-h-60">
                            {products.map((p) => (
                              <SelectItem key={p.id} value={String(p.id)}>
                                {p.name} {p.sku ? `(${p.sku})` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-rose-500 text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Quantity */}
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Quantity <span className="text-rose-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max={availableStock || undefined}
                            {...field}
                            className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-bold rounded-xl h-11"
                          />
                        </FormControl>
                        <FormMessage className="text-rose-500 text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Batch Selection (FEFO) */}
                  <FormField
                    control={form.control}
                    name="batchId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Batch / Lot Selection (FEFO)
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-11 font-medium">
                              <SelectValue placeholder="Automatic FEFO (Earliest Expiry)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-xs">
                            <SelectItem value="">Automatic FEFO Selection</SelectItem>
                            {batches.map((b) => {
                              const isExp = b.expiry_date && b.expiry_date < new Date().toISOString().slice(0, 10);
                              return (
                                <SelectItem key={b.id} value={String(b.id)} disabled={isExp}>
                                  {b.batch_number} (Qty: {b.quantity_remaining}, Exp: {b.expiry_date || "N/A"})
                                  {isExp ? " [EXPIRED]" : ""}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-rose-500 text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Reference */}
                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Reference / Dispatch Ref
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., ORD-98765"
                            {...field}
                            className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-medium rounded-xl h-11"
                          />
                        </FormControl>
                        <FormMessage className="text-rose-500 text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={3}
                          {...field}
                          className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-medium rounded-xl resize-none"
                          placeholder="Add any specific instructions or delivery details..."
                        />
                      </FormControl>
                      <FormMessage className="text-rose-500 text-xs" />
                    </FormItem>
                  )}
                />

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
                    disabled={isSubmitting || isBlockedDueToExpiry}
                    className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold shadow-md rounded-xl h-11 px-8 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                      </span>
                    ) : isBlockedDueToExpiry ? (
                      "Issuing Blocked (Expired Stock)"
                    ) : (
                      "Confirm Stock Out"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* RECENTLY DISPATCHED PRODUCTS HISTORY TABLE                                */}
      {/* ========================================================================= */}
      <Card className="border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full mt-8">
        <div className="px-8 py-6 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-lg">
              <History className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Recently Stocked Out Products History
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live audit history of dispatched inventory transactions
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Filter by product or location..."
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
                <TableRow className="hover:bg-transparent text-xs">
                  <TableHead className="py-3.5 pl-6 font-bold text-slate-700 dark:text-slate-300">Date & Time</TableHead>
                  <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300">Product</TableHead>
                  <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300">Source Location</TableHead>
                  <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 text-right">Quantity Dispatched</TableHead>
                  <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300">Batch / Lot</TableHead>
                  <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 pr-6">Reference / Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400">Loading stock out history...</TableCell>
                  </TableRow>
                )}
                {!historyLoading &&
                  historyLogs.filter(
                    (i) =>
                      !searchFilter ||
                      (i.product_name || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
                      (i.location_name || "").toLowerCase().includes(searchFilter.toLowerCase())
                  ).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">No stock out transactions found.</TableCell>
                    </TableRow>
                  )}
                {!historyLoading &&
                  historyLogs
                    .filter(
                      (i) =>
                        !searchFilter ||
                        (i.product_name || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
                        (i.location_name || "").toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .map((item) => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-b border-slate-200/60 dark:border-white/5 text-xs"
                      >
                        <TableCell className="pl-6 font-mono text-slate-600 dark:text-slate-400 py-3">
                          {item.created_at || item.timestamp
                            ? new Date(item.created_at || item.timestamp).toLocaleString()
                            : "—"}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900 dark:text-slate-200">
                          {item.product_name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 font-medium"
                          >
                            {item.location_name || "Central Warehouse"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                            -{item.quantity} units
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-slate-600 dark:text-slate-400">
                          {item.batch_label || item.batch_number || "FEFO Auto"}
                        </TableCell>
                        <TableCell className="text-slate-500 dark:text-slate-400 pr-6">
                          {item.reference || item.reason || item.notes || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onScanSuccess={(code) => {
          if (dispatchMode === "rapid") {
            handleRapidScan(code);
          } else {
            form.setValue("productId", String(code));
            toast.success(`Scanned: ${code}`);
          }
          setCameraModalOpen(false);
        }}
        products={products}
      />

      {/* Sample Barcodes Drawer */}
      <SampleBarcodesDrawer
        isOpen={sampleDrawerOpen}
        onClose={() => setSampleDrawerOpen(false)}
        products={products}
        onScanSuccess={(code) => {
          if (dispatchMode === "rapid") {
            handleRapidScan(code);
          } else {
            form.setValue("productId", String(code));
            toast.success(`Scanned: ${code}`);
          }
          setSampleDrawerOpen(false);
        }}
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
