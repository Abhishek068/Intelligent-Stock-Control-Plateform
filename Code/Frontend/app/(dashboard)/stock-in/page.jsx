"use client";

import { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowDownToLine,
  Barcode,
  CheckCircle,
  PackagePlus,
  Box,
  History,
  Search,
  Plus,
  Loader2,
  Zap,
  Truck,
  Warehouse,
  Calendar,
  Layers,
  Trash2,
  CheckCircle2,
  Volume2,
  VolumeX,
  Camera,
  RefreshCw,
  Sparkles,
  ArrowRight,
  FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productsApi, suppliersApi, locationsApi, stockApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth.store";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { CameraScannerModal } from "@/features/stock-in/components/CameraScannerModal";
import { SampleBarcodesDrawer } from "@/features/stock-in/components/SampleBarcodesDrawer";

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
  } catch { }
}

function generateBatchCode(prefix = "LOT") {
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${todayStr}-${rand}`;
}

function StockInPageContent() {
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();
  const preselectedProductId = searchParams.get("productId");

  // Global Data
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Mode: "single" or "rapid"
  const [receivingMode, setReceivingMode] = useState("rapid");

  // Hardware Scanner / Single Form State
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [sampleDrawerOpen, setSampleDrawerOpen] = useState(false);

  // Add Supplier Modal
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", contact_name: "", email: "", phone: "" });

  // ----------------------------------------------------
  // RAPID INBOUND DELIVERY MANIFEST STATE
  // ----------------------------------------------------
  const [rapidSupplierId, setRapidSupplierId] = useState("");
  const [rapidLocationId, setRapidLocationId] = useState("");
  const [rapidReference, setRapidReference] = useState(() => `DEL-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`);
  const [rapidPackMultiplier, setRapidPackMultiplier] = useState(1);
  const [rapidExpiryPresetMonths, setRapidExpiryPresetMonths] = useState(12);
  const [rapidWorkflowType, setRapidWorkflowType] = useState("manifest"); // "manifest" (review & bulk commit) or "instant" (auto-commit on scan)
  const [rapidManifest, setRapidManifest] = useState([]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState(null);

  const rapidInputRef = useRef(null);

  const form = useForm({
    resolver: zodResolver(stockInSchema),
    defaultValues: { quantity: 1, unitCost: 0, batchNumber: "", expiryDate: "", reference: "", notes: "" }
  });

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await stockApi.listStockIn();
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
        const [pRes, sRes, lRes] = await Promise.all([
          productsApi.list().catch(() => []),
          suppliersApi.list().catch(() => []),
          locationsApi.list().catch(() => [])
        ]);
        const pList = Array.isArray(pRes) ? pRes : (pRes?.results || pRes?.data || []);
        const sList = Array.isArray(sRes) ? sRes : (sRes?.results || sRes?.data || []);
        const lList = Array.isArray(lRes) ? lRes : (lRes?.results || lRes?.data || []);

        setProducts(pList);
        setSuppliers(sList);
        setLocations(lList);

        if (sList.length > 0) setRapidSupplierId(String(sList[0].id));
        if (lList.length > 0) {
          const centralWh = lList.find((l) => l.name === "Central Warehouse");
          setRapidLocationId(centralWh ? String(centralWh.id) : String(lList[0].id));
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      }
    };
    loadInitialData();
    loadHistory();
  }, [loadHistory]);

  // Auto-select product when navigating from barcode scanner with ?productId=
  useEffect(() => {
    if (!preselectedProductId || products.length === 0 || suppliers.length === 0) return;

    const pid = String(preselectedProductId);
    requestAnimationFrame(() => {
      form.setValue("productId", pid, { shouldValidate: true, shouldDirty: true });

      const selected = products.find((p) => String(p.id) === pid);
      if (selected) {
        const suppId = selected.supplier || selected.supplier_id || selected.supplierId || selected.primary_supplier;
        if (suppId) {
          form.setValue("supplierId", String(suppId), { shouldValidate: true, shouldDirty: true });
        } else if (suppliers.length > 0) {
          form.setValue("supplierId", String(suppliers[0].id), { shouldValidate: true, shouldDirty: true });
        }
        const cost = selected.unit_price || selected.cost_price || selected.unit_cost || 0;
        if (cost) {
          form.setValue("unitCost", Number(cost), { shouldDirty: true });
        }
      }
    });
  }, [preselectedProductId, products, suppliers, form]);

  const selectedProductId = form.watch("productId");
  const selectedProduct = products.find((p) => String(p.id) === selectedProductId);
  const quantity = form.watch("quantity") || 0;
  const unitCost = form.watch("unitCost") || 0;
  const totalValuation = (quantity || 0) * (unitCost || 0);

  // Single Item Submit
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
      toast.success(`Successfully received ${data.quantity} × ${selectedProduct?.name || "Product"}`);
      form.reset({ quantity: 1, unitCost: 0, batchNumber: "", expiryDate: "", reference: "", notes: "" });
      const refreshed = await productsApi.list();
      setProducts(refreshed);
      await loadHistory();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Stock in failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoGenerateBatch = () => {
    const code = generateBatchCode();
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

  // ----------------------------------------------------
  // RAPID DELIVERY SCANNER LOGIC
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

      if (soundEnabled) playScanAudio(true);

      const qtyToAdd = Number(rapidPackMultiplier) || 1;
      const defaultCost = Number(prod.unit_price || prod.unit_cost || prod.cost_price || 0);

      // Compute expiry date if preset is chosen
      let expiryStr = null;
      if (rapidExpiryPresetMonths > 0) {
        const exp = new Date();
        exp.setMonth(exp.getMonth() + rapidExpiryPresetMonths);
        expiryStr = exp.toISOString().slice(0, 10);
      }

      const generatedBatch = generateBatchCode("LOT");

      setLastScannedItem({
        id: prod.id,
        name: prod.name,
        sku: prod.sku,
        quantity: qtyToAdd,
        unit_cost: defaultCost,
        timestamp: new Date().toLocaleTimeString()
      });

      // Instant Auto-Commit Mode
      if (rapidWorkflowType === "instant") {
        const suppId = rapidSupplierId ? Number(rapidSupplierId) : Number(prod.supplier || prod.supplier_id || suppliers[0]?.id);
        const locId = rapidLocationId ? Number(rapidLocationId) : undefined;

        await stockApi.stockIn({
          product: Number(prod.id),
          supplier: suppId,
          location: locId,
          quantity: qtyToAdd,
          unit_cost: defaultCost,
          batch_number: generatedBatch,
          expiry_date: expiryStr,
          reference: rapidReference || `RAPID-${new Date().toISOString().slice(0, 10)}`,
          notes: `Instant scan: ${code}`,
          received_at: new Date().toISOString()
        });

        toast.success(`⚡ Auto-Received: +${qtyToAdd} × ${prod.name}`);
        const refreshed = await productsApi.list();
        setProducts(refreshed);
        loadHistory();
      } else {
        // Manifest Staging Mode: Add to Live Staging List
        setRapidManifest((prev) => {
          const existingIndex = prev.findIndex((item) => String(item.productId) === String(prod.id));
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + qtyToAdd,
              subtotal: (updated[existingIndex].quantity + qtyToAdd) * updated[existingIndex].unitCost
            };
            return updated;
          } else {
            return [
              {
                productId: prod.id,
                name: prod.name,
                sku: prod.sku,
                category: prod.category_name || "General",
                currentStock: prod.stock ?? prod.quantity_on_hand ?? 0,
                quantity: qtyToAdd,
                unitCost: defaultCost,
                batchNumber: generatedBatch,
                expiryDate: expiryStr || "",
                subtotal: qtyToAdd * defaultCost
              },
              ...prev
            ];
          }
        });

        toast.success(`Added +${qtyToAdd} × ${prod.name} to Manifest`);
      }

      setBarcodeInput("");
      if (rapidInputRef.current) rapidInputRef.current.focus();
    } catch (err) {
      if (soundEnabled) playScanAudio(false);
      toast.error(`Scan processing failed: ${err.message || "Unknown error"}`);
    }
  };

  const handleUpdateManifestItem = (index, field, value) => {
    setRapidManifest((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      if (field === "quantity" || field === "unitCost") {
        item.subtotal = (Number(item.quantity) || 0) * (Number(item.unitCost) || 0);
      }
      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveManifestItem = (index) => {
    setRapidManifest((prev) => prev.filter((_, i) => i !== index));
    toast.info("Item removed from delivery manifest");
  };

  const handleBulkCommitManifest = async () => {
    if (rapidManifest.length === 0) {
      toast.error("No items in the receiving manifest to process.");
      return;
    }

    setIsBulkSubmitting(true);
    try {
      const payload = {
        supplier: rapidSupplierId ? Number(rapidSupplierId) : undefined,
        location: rapidLocationId ? Number(rapidLocationId) : undefined,
        reference: rapidReference,
        notes: `Bulk delivery received (${rapidManifest.length} SKUs)`,
        items: rapidManifest.map((item) => ({
          product: Number(item.productId),
          quantity: Number(item.quantity),
          unit_cost: Number(item.unitCost) || 0,
          batch_number: item.batchNumber || "",
          expiry_date: item.expiryDate || null,
          reference: rapidReference
        }))
      };

      const res = await stockApi.bulkStockIn(payload);
      if (soundEnabled) playScanAudio(true);
      toast.success(
        `Delivery Received Successfully! ${res.total_items || rapidManifest.length} item line(s) totaling ${res.total_quantity || manifestTotalUnits} units received.`
      );

      setRapidManifest([]);
      const refreshed = await productsApi.list();
      setProducts(refreshed);
      await loadHistory();
    } catch (err) {
      if (soundEnabled) playScanAudio(false);
      toast.error(err instanceof ApiError ? err.message : "Bulk stock-in failed");
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
            Receive incoming shipments effortlessly with rapid barcode gun auto-receiving or standard entry.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
          <button
            type="button"
            onClick={() => setReceivingMode("rapid")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${receivingMode === "rapid"
              ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            <Zap className="h-4 w-4 text-amber-300 animate-pulse" />
            Rapid Delivery Receiving
            <Badge className="bg-amber-400/30 text-amber-100 border-none text-[10px] px-1.5 py-0 font-extrabold">
              FAST
            </Badge>
          </button>
          <button
            type="button"
            onClick={() => setReceivingMode("single")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${receivingMode === "single"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
          >
            <Box className="h-4 w-4 text-teal-500" />
            Single Item Entry
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: RAPID INBOUND DELIVERY RECEIVING (MULTI-PRODUCT AUTO-SCAN)        */}
      {/* ========================================================================= */}
      {receivingMode === "rapid" && (
        <div className="space-y-6">
          {/* Inbound Delivery Header & Policy Bar */}
          <Card className="border border-teal-300/60 dark:border-teal-500/30 bg-gradient-to-br from-white via-teal-50/30 to-emerald-50/20 dark:from-slate-900/90 dark:via-slate-900/60 dark:to-slate-950/80 backdrop-blur-xl shadow-xl overflow-hidden rounded-2xl relative">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-teal-200/60 dark:border-teal-500/20">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-500 text-white rounded-xl shadow-sm">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                      Inbound Shipment Configuration
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Configure supplier and default parameters for all scanned items in this delivery
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
                        <Volume2 className="mr-1.5 h-3.5 w-3.5 text-emerald-500" /> Audio On
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
                    className="rounded-xl border-teal-300 dark:border-teal-500/40 text-teal-700 dark:text-teal-300 hover:bg-teal-50 text-xs font-semibold"
                  >
                    <Camera className="mr-1.5 h-3.5 w-3.5 text-teal-500" /> Camera Scanner
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

              {/* Delivery Session Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
                {/* Supplier */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Delivering Supplier
                    </Label>
                    <button
                      type="button"
                      onClick={() => setAddSupplierOpen(true)}
                      className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <Plus className="h-3 w-3" /> Add
                    </button>
                  </div>
                  <Select value={rapidSupplierId} onValueChange={setRapidSupplierId}>
                    <SelectTrigger className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 rounded-xl h-10 text-xs font-semibold">
                      <SelectValue placeholder="Select supplier..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-xs">
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Destination Location */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Warehouse className="h-3.5 w-3.5 text-indigo-500" /> Destination Warehouse
                  </Label>
                  <Select value={rapidLocationId} onValueChange={setRapidLocationId}>
                    <SelectTrigger className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 rounded-xl h-10 text-xs font-semibold">
                      <SelectValue placeholder="Select location..." />
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

                {/* Delivery Ref */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Delivery / Invoice Ref
                  </Label>
                  <Input
                    value={rapidReference}
                    onChange={(e) => setRapidReference(e.target.value)}
                    placeholder="e.g. DEL-20260831"
                    className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 rounded-xl h-10 text-xs font-medium"
                  />
                </div>

                {/* Expiry Preset */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span>Default Expiry Rule</span>
                    <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                      +{rapidExpiryPresetMonths}m
                    </span>
                  </Label>
                  <div className="flex items-center gap-1 pt-0.5">
                    {[
                      { label: "0m", val: 0 },
                      { label: "+3m", val: 3 },
                      { label: "+6m", val: 6 },
                      { label: "+1y", val: 12 },
                      { label: "+2y", val: 24 }
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setRapidExpiryPresetMonths(opt.val)}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex-1 text-center ${rapidExpiryPresetMonths === opt.val
                          ? "bg-teal-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100"
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scan Pack Multiplier & Auto-Commit Mode Toggle */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 mt-4 border-t border-slate-200/60 dark:border-white/5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-teal-500" /> Default Scan Increment:
                  </span>
                  {[
                    { label: "+1 Unit", val: 1 },
                    { label: "+6 (Half-Dozen)", val: 6 },
                    { label: "+10 (Box)", val: 10 },
                    { label: "+24 (Carton)", val: 24 },
                    { label: "+50 (Crate)", val: 50 },
                    { label: "+100 (Pallet)", val: 100 }
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setRapidPackMultiplier(p.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${rapidPackMultiplier === p.val
                        ? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400/40"
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
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${rapidWorkflowType === "manifest"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                  >
                    Manifest Review (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRapidWorkflowType("instant")}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${rapidWorkflowType === "instant"
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
          <Card className="border-2 border-emerald-500/40 dark:border-emerald-500/30 bg-white/95 dark:bg-slate-900/70 backdrop-blur-2xl shadow-xl rounded-2xl overflow-hidden relative">
            <div className="p-6 flex flex-col md:flex-row items-center gap-4 justify-between relative z-10">
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl shadow-md">
                  <Barcode className="h-7 w-7 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    High-Speed Gun Scanner Active
                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                      LIVE
                    </Badge>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Scan any product barcode / SKU / batch label. Each scan adds {rapidPackMultiplier} unit(s).
                  </p>
                </div>
              </div>

              {/* Scan Form Input */}
              <div className="flex w-full md:max-w-xl items-center gap-2">
                <div className="relative w-full">
                  <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                  <Input
                    ref={rapidInputRef}
                    autoFocus
                    placeholder="Scan barcode or type SKU and press Enter..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && barcodeInput.trim()) {
                        e.preventDefault();
                        handleRapidScan(barcodeInput.trim());
                      }
                    }}
                    className="pl-11 pr-24 bg-white dark:bg-slate-950 border-2 border-emerald-500/40 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 text-slate-900 dark:text-white font-mono font-bold text-base rounded-2xl h-14 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-inner"
                  />
                  <Button
                    type="button"
                    onClick={() => barcodeInput.trim() && handleRapidScan(barcodeInput.trim())}
                    className="absolute right-2 top-2 h-10 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm"
                  >
                    Scan
                  </Button>
                </div>
              </div>
            </div>

            {/* Last Scanned Feedback Banner */}
            {lastScannedItem && (
              <div className="px-6 py-2.5 bg-emerald-50/80 dark:bg-emerald-500/10 border-t border-emerald-200 dark:border-emerald-500/20 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Last Scanned: <strong className="font-bold">{lastScannedItem.name}</strong> ({lastScannedItem.sku}) — Received: <strong className="font-mono">+{lastScannedItem.quantity} units</strong> at {lastScannedItem.timestamp}
                  </span>
                </div>
                <span className="font-mono text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  Unit Val: £{lastScannedItem.unit_cost.toFixed(2)}
                </span>
              </div>
            )}
          </Card>

          {/* Staged Delivery Manifest Table (when in Manifest Mode) */}
          {rapidWorkflowType === "manifest" && (
            <Card className="border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/40 backdrop-blur-2xl shadow-2xl rounded-2xl overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-lg">
                    <FileSpreadsheet className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    Inbound Delivery Manifest ({rapidManifest.length} Product{rapidManifest.length !== 1 ? "s" : ""})
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Live staged goods for {suppliers.find((s) => String(s.id) === rapidSupplierId)?.name || "Selected Supplier"} into {locations.find((l) => String(l.id) === rapidLocationId)?.name || "Central Warehouse"}
                  </p>
                </div>

                {/* Stats Chips & Action Buttons */}
                <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
                  <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-950/80 rounded-xl border border-slate-200 dark:border-white/10">
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Inbound Units</div>
                      <div className="text-lg font-extrabold text-teal-600 dark:text-teal-400 font-mono">
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
                    disabled={rapidManifest.length === 0 || isBulkSubmitting}
                    onClick={handleBulkCommitManifest}
                    className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl h-11 px-6 shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isBulkSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Receiving Delivery...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" /> Receive Delivery ({manifestTotalUnits} units)
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
                        <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 text-center">Current Stock</TableHead>
                        <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 w-48 text-center">Receive Qty</TableHead>
                        <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 w-32">Unit Cost (£)</TableHead>
                        <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 w-44">Batch Number</TableHead>
                        <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 w-36">Expiry Date</TableHead>
                        <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 text-right">Subtotal</TableHead>
                        <TableHead className="py-3.5 font-bold text-slate-700 dark:text-slate-300 pr-6 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rapidManifest.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Barcode className="h-10 w-10 text-slate-300 dark:text-slate-700 animate-bounce" />
                              <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">Delivery Manifest is Empty</p>
                              <p className="text-xs text-slate-400 max-w-sm">
                                Scan products with your barcode gun or type SKU above to begin building this shipment's receiving manifest.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        rapidManifest.map((item, idx) => {
                          const forecastStock = item.currentStock + Number(item.quantity || 0);
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

                              {/* Current vs Forecast Stock */}
                              <TableCell className="text-center">
                                <span className="font-mono text-slate-600 dark:text-slate-400 font-bold">
                                  {item.currentStock}
                                </span>
                                <ArrowRight className="inline mx-1.5 h-3 w-3 text-teal-500" />
                                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                  {forecastStock}
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
                                    className="w-16 h-8 text-center font-mono font-extrabold text-teal-600 dark:text-teal-400 bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-lg text-sm"
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
                                      className="text-[10px] font-bold text-slate-500 hover:text-teal-600 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded cursor-pointer"
                                    >
                                      +{amt}
                                    </button>
                                  ))}
                                </div>
                              </TableCell>

                              {/* Unit Cost */}
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.unitCost}
                                  onChange={(e) => handleUpdateManifestItem(idx, "unitCost", Number(e.target.value) || 0)}
                                  className="w-24 h-8 font-mono text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-lg font-bold"
                                />
                              </TableCell>

                              {/* Batch Number */}
                              <TableCell>
                                <Input
                                  value={item.batchNumber}
                                  onChange={(e) => handleUpdateManifestItem(idx, "batchNumber", e.target.value)}
                                  placeholder="Auto"
                                  className="w-36 h-8 font-mono text-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-lg"
                                />
                              </TableCell>

                              {/* Expiry Date */}
                              <TableCell>
                                <Input
                                  type="date"
                                  value={item.expiryDate}
                                  onChange={(e) => handleUpdateManifestItem(idx, "expiryDate", e.target.value)}
                                  className="w-32 h-8 text-[11px] bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-lg"
                                />
                              </TableCell>

                              {/* Subtotal */}
                              <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-white">
                                £{(item.subtotal || 0).toFixed(2)}
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
      {/* MODE 2: SINGLE ITEM MANUAL STOCK-IN FORM                                   */}
      {/* ========================================================================= */}
      {receivingMode === "single" && (
        <Card className="border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-2xl overflow-hidden rounded-2xl relative w-full">
          <div className="px-8 py-6 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-200 font-bold text-lg">
                <Box className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                Receive Single Product
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Manual stock-in entry with detailed batch and supplier invoice tracking
              </p>
            </div>
          </div>

          <CardContent className="p-8 relative z-10">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid gap-6 md:grid-cols-2">
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
                              const suppId =
                                selected.supplier || selected.supplier_id || selected.supplierId || selected.primary_supplier;
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
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Supplier <span className="text-rose-500">*</span>
                          </FormLabel>
                          <button
                            type="button"
                            onClick={() => setAddSupplierOpen(true)}
                            className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 hover:underline cursor-pointer transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add New
                          </button>
                        </div>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-11 font-medium">
                              <SelectValue placeholder="Select supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-2xl rounded-xl text-slate-800 dark:text-slate-200">
                            {suppliers.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)} className="cursor-pointer">
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-rose-500 text-xs" />
                      </FormItem>
                    )}
                  />

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
                            {...field}
                            className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-bold rounded-xl h-11"
                          />
                        </FormControl>
                        <FormMessage className="text-rose-500 text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unitCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Unit Cost (£)
                        </FormLabel>
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
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="batchNumber"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Batch / Lot Number
                          </FormLabel>
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
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Expiry Date
                          </FormLabel>
                          <div className="flex items-center gap-1">
                            {[3, 6, 12, 24].map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => handleSetExpiryPreset(m)}
                                className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                              >
                                +{m >= 12 ? `${m / 12}yr` : `${m}m`}
                              </button>
                            ))}
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
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Reference / Invoice
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., PO-12345"
                            {...field}
                            className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-medium rounded-xl h-11 placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                          className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-medium rounded-xl resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                          placeholder="Add any additional notes about this stock receipt..."
                        />
                      </FormControl>
                      <FormMessage className="text-rose-500 text-xs" />
                    </FormItem>
                  )}
                />

                {selectedProduct && quantity > 0 && (
                  <div className="flex items-start gap-4 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-5 shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
                    <CheckCircle className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400 relative z-10 mt-0.5" />
                    <div className="relative z-10 w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h5 className="font-bold text-emerald-900 dark:text-emerald-100 text-base">
                          Receipt Valuation Summary
                        </h5>
                        <p className="text-sm text-emerald-800 dark:text-emerald-200 mt-0.5">
                          Receiving{" "}
                          <strong className="text-emerald-950 dark:text-white font-extrabold text-base mx-1 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded">
                            {quantity}
                          </strong>{" "}
                          units of{" "}
                          <strong className="text-emerald-950 dark:text-white font-bold">{selectedProduct.name}</strong>.
                        </p>
                      </div>
                      <div className="text-right shrink-0 bg-white/80 dark:bg-slate-950/60 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-500/30">
                        <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                          Total Receipt Value
                        </div>
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
                    className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold shadow-md rounded-xl h-11 px-8 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 rounded-full animate-spin" /> Processing...
                      </span>
                    ) : (
                      "Confirm Stock In"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* RECENTLY STOCKED IN PRODUCTS HISTORY TABLE                                */}
      {/* ========================================================================= */}
      <Card className="border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full mt-8">
        <div className="px-8 py-6 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-lg">
              <History className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              Recently Stocked In Products History
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live audit history of received inventory transactions
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Filter by product or supplier..."
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
                {!historyLoading &&
                  historyLogs.filter(
                    (i) =>
                      !searchFilter ||
                      (i.product_name || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
                      (i.supplier_name || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
                      (i.location_name || "").toLowerCase().includes(searchFilter.toLowerCase())
                  ).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400">No stock in transactions found.</TableCell>
                    </TableRow>
                  )}
                {!historyLoading &&
                  historyLogs
                    .filter(
                      (i) =>
                        !searchFilter ||
                        (i.product_name || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
                        (i.supplier_name || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
                        (i.location_name || "").toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .map((item) => (
                      <TableRow
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-b border-slate-200/60 dark:border-white/5 text-xs"
                      >
                        <TableCell className="pl-6 font-mono text-slate-600 dark:text-slate-400 py-3">
                          {item.created_at || item.received_at
                            ? new Date(item.created_at || item.received_at).toLocaleString()
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

      {/* Add New Supplier Modal */}
      <Dialog open={addSupplierOpen} onOpenChange={setAddSupplierOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#0F172A] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Plus className="h-5 w-5 text-teal-600 dark:text-teal-400" /> Add New Supplier
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Quickly register a new supplier into your inventory system.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Supplier Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g., Acme Supplies Ltd"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier((prev) => ({ ...prev, name: e.target.value }))}
                className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl h-11 font-medium"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Contact Name</Label>
              <Input
                placeholder="e.g., John Smith"
                value={newSupplier.contact_name}
                onChange={(e) => setNewSupplier((prev) => ({ ...prev, contact_name: e.target.value }))}
                className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl h-11 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email</Label>
                <Input
                  type="email"
                  placeholder="supplier@email.com"
                  value={newSupplier.email}
                  onChange={(e) => setNewSupplier((prev) => ({ ...prev, email: e.target.value }))}
                  className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl h-11 font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone</Label>
                <Input
                  placeholder="+44 123 456 7890"
                  value={newSupplier.phone}
                  onChange={(e) => setNewSupplier((prev) => ({ ...prev, phone: e.target.value }))}
                  className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-xl h-11 font-medium"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setAddSupplierOpen(false);
                setNewSupplier({ name: "", contact_name: "", email: "", phone: "" });
              }}
              className="rounded-xl cursor-pointer border-slate-200 dark:border-white/10"
            >
              Cancel
            </Button>
            <Button
              disabled={!newSupplier.name.trim() || isCreatingSupplier}
              onClick={async () => {
                setIsCreatingSupplier(true);
                try {
                  const created = await suppliersApi.create({
                    name: newSupplier.name.trim(),
                    contact_name: newSupplier.contact_name.trim(),
                    email: newSupplier.email.trim(),
                    phone: newSupplier.phone.trim()
                  });
                  const createdSupplier = created?.data || created;
                  const sRes = await suppliersApi.list().catch(() => []);
                  const sList = Array.isArray(sRes) ? sRes : (sRes?.results || sRes?.data || []);
                  setSuppliers(sList);
                  if (createdSupplier?.id) {
                    setRapidSupplierId(String(createdSupplier.id));
                    form.setValue("supplierId", String(createdSupplier.id));
                  }
                  toast.success(`Supplier "${createdSupplier?.name || newSupplier.name}" added successfully!`);
                  setAddSupplierOpen(false);
                  setNewSupplier({ name: "", contact_name: "", email: "", phone: "" });
                } catch (error) {
                  toast.error(error instanceof ApiError ? error.message : "Failed to create supplier");
                } finally {
                  setIsCreatingSupplier(false);
                }
              }}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold rounded-xl cursor-pointer shadow-md"
            >
              {isCreatingSupplier ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Add Supplier
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onScanSuccess={(code) => {
          if (receivingMode === "rapid") {
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
          if (receivingMode === "rapid") {
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

export default function StockInPage() {
  return (
    <ModuleGate module="stock_in" action="create">
      <StockInPageContent />
    </ModuleGate>
  );
}
