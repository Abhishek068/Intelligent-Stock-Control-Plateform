"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowLeftRight,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Layers,
  Truck,
  XCircle,
  MapPin,
  Package,
  FileText,
  Plus,
  Building2,
  Phone,
  Mail,
  User,
  Store,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { productsApi, locationsApi, stockApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const transferSchema = z
  .object({
    sourceLocationId: z.string().min(1, "Source required"),
    destinationLocationId: z.string().min(1, "Destination required"),
    productId: z.string().min(1, "Product required"),
    quantity: z.coerce.number().int().positive("Quantity must be positive"),
    notes: z.string().optional(),
  })
  .refine((data) => data.sourceLocationId !== data.destinationLocationId, {
    message: "Source and destination must differ",
    path: ["destinationLocationId"],
  });

function StatusBadge({ status }) {
  if (status === "draft") {
    return <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20 font-bold px-2.5 py-1">Draft</Badge>;
  }
  if (status === "in_transit") {
    return <Badge className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 px-2.5 py-1 font-bold animate-pulse">In Transit</Badge>;
  }
  if (status === "completed") {
    return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 font-bold px-2.5 py-1">Completed</Badge>;
  }
  if (status === "cancelled") {
    return <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 font-bold px-2.5 py-1">Cancelled</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}

function StockTransferPageContent() {
  const { isSuperAdmin, hasPermission } = useRoleAccess();
  const canCreate = isSuperAdmin || hasPermission("transfers", "create");
  const canApprove = isSuperAdmin || hasPermission("transfers", "approve");

  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanAction, setScanAction] = useState(null);
  const [scanTransfer, setScanTransfer] = useState(null);
  const [scannedCode, setScannedCode] = useState("");
  const [scanError, setScanError] = useState("");
  const [sourceStock, setSourceStock] = useState(0);
  const [destStock, setDestStock] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [step, setStep] = useState(1);
  const [createdDraft, setCreatedDraft] = useState(null);

  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [registeredStores, setRegisteredStores] = useState([
    {
      id: "store-101",
      name: "Birmingham Retail Store",
      type: "Store",
      address: "14 Corporation Street, Birmingham B2 4RN",
      manager_name: "Sarah Jenkins",
      contact_phone: "+44 121 496 0123",
      contact_email: "birmingham@store.com",
      capacity: 5000,
    },
    {
      id: "store-102",
      name: "Manchester City Branch",
      type: "Regional Branch",
      address: "88 Deansgate, Manchester M3 2ER",
      manager_name: "Marcus Vance",
      contact_phone: "+44 161 832 9400",
      contact_email: "manchester@store.com",
      capacity: 7500,
    },
    {
      id: "store-103",
      name: "London High Street Store",
      type: "Store",
      address: "210 Oxford Street, London W1D 1NB",
      manager_name: "Emily Watson",
      contact_phone: "+44 20 7946 0912",
      contact_email: "london@store.com",
      capacity: 8000,
    },
  ]);

  const [branchForm, setBranchForm] = useState({
    name: "",
    type: "store",
    address: "",
    manager_name: "",
    contact_phone: "",
    contact_email: "",
    capacity: "5000",
  });

  const form = useForm({
    resolver: zodResolver(transferSchema),
    defaultValues: { quantity: 1, notes: "" },
  });

  const loadTransfers = useCallback(() => {
    stockApi.listTransfers().then(setTransfers).catch(() => setTransfers([]));
  }, []);

  useEffect(() => {
    Promise.all([productsApi.list(), locationsApi.list()]).then(([p, l]) => {
      setProducts(p);
      setLocations(l);
      if (l.length > 0) form.setValue("sourceLocationId", String(l[0].id));
    });
    loadTransfers();
  }, [loadTransfers, form]);

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!branchForm.name.trim()) {
      toast.error("Please enter Store / Branch name.");
      return;
    }
    setCreatingBranch(true);
    try {
      let createdId = `store-${Date.now()}`;
      try {
        const res = await locationsApi.create({
          name: branchForm.name,
          location_type: branchForm.type || "store",
          address: branchForm.address,
          capacity: branchForm.capacity ? parseInt(branchForm.capacity, 10) : 5000,
          is_active: true,
        });
        if (res?.id) createdId = String(res.id);
      } catch {
        // Fallback for local UI state
      }

      const newStore = {
        id: createdId,
        name: branchForm.name,
        type: branchForm.type === "store" ? "Store" : branchForm.type === "branch" ? "Regional Branch" : "Outlet",
        address: branchForm.address || "Main City Center",
        manager_name: branchForm.manager_name || "Branch Manager",
        contact_phone: branchForm.contact_phone || "+44 20 7946 0000",
        contact_email: branchForm.contact_email || "store@branch.com",
        capacity: branchForm.capacity ? parseInt(branchForm.capacity, 10) : 5000,
      };

      setRegisteredStores((prev) => [newStore, ...prev]);
      form.setValue("destinationLocationId", String(newStore.id));
      
      toast.success(`🎉 Store/Branch '${branchForm.name}' registered successfully!`);
      setIsBranchModalOpen(false);
      setBranchForm({
        name: "",
        type: "store",
        address: "",
        manager_name: "",
        contact_phone: "",
        contact_email: "",
        capacity: "5000",
      });
    } finally {
      setCreatingBranch(false);
    }
  };

  const destinationOptions = [
    ...locations.map((l) => ({ id: String(l.id), name: l.name })),
    ...registeredStores
      .filter((s) => !locations.some((l) => String(l.id) === String(s.id)))
      .map((s) => ({ id: String(s.id), name: `${s.name} (${s.type})` })),
  ];

  const sourceId = form.watch("sourceLocationId");
  const destId = form.watch("destinationLocationId");
  const productId = form.watch("productId");
  const quantity = form.watch("quantity") || 0;
  const selectedProduct = products.find((p) => String(p.id) === productId);
  const sourceLoc = locations.find((l) => String(l.id) === sourceId);
  const destLoc = locations.find((l) => String(l.id) === destId);
  const isOverTransfer = quantity > sourceStock;

  useEffect(() => {
    if (!productId) {
      setSourceStock(0);
      setDestStock(0);
      return;
    }
    productsApi.get(productId).then((detail) => {
      const src = detail.inventory_by_location?.find((b) => String(b.location_id) === sourceId);
      const dst = detail.inventory_by_location?.find((b) => String(b.location_id) === destId);
      setSourceStock(src?.quantity_on_hand ?? 0);
      setDestStock(dst?.quantity_on_hand ?? 0);
    });
  }, [productId, sourceId, destId]);

  const goToConfirm = async () => {
    const valid = await form.trigger([
      "sourceLocationId",
      "destinationLocationId",
      "productId",
      "quantity",
    ]);
    if (valid && !isOverTransfer) setStep(2);
  };

  const handleSubmit = async () => {
    if (!canCreate) {
      toast.error("You need transfers:create permission");
      return;
    }
    const data = form.getValues();
    setIsSubmitting(true);
    try {
      const res = await stockApi.transfer({
        product: Number(data.productId),
        source_location: Number(data.sourceLocationId),
        destination_location: Number(data.destinationLocationId),
        quantity: data.quantity,
        notes: data.notes,
      });
      const draft = res?.data ?? res;
      setCreatedDraft(draft);
      toast.success("Transfer draft created");
      setStep(3);
      loadTransfers();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Transfer failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const runAction = async (id, action, code = null) => {
    if (!canApprove) {
      toast.error("You need transfers:approve permission");
      return;
    }
    setActionId(id);
    try {
      if (action === "ship") await stockApi.shipTransfer(id, code);
      if (action === "complete") await stockApi.completeTransfer(id, code);
      if (action === "cancel") await stockApi.cancelTransfer(id);
      toast.success(
        action === "ship"
          ? "Marked in transit"
          : action === "complete"
            ? "Transfer completed"
            : "Transfer cancelled"
      );
      loadTransfers();
      setScanOpen(false);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Action failed");
    } finally {
      setActionId(null);
    }
  };

  const handleActionClick = (t, act) => {
    if (act === "cancel") {
      runAction(t.id, "cancel");
      return;
    }
    setScanTransfer(t);
    setScanAction(act);
    setScannedCode("");
    setScanError("");
    setScanOpen(true);
  };

  const handleDownloadPdf = async (id) => {
    try {
      toast.info("Generating Transfer Slip PDF...");
      await stockApi.downloadTransferPdf(id);
      toast.success("Downloaded Stock Transfer Slip!");
    } catch {
      toast.error("Failed to download transfer PDF");
    }
  };

  const handleVerifyScan = (e) => {
    e.preventDefault();
    if (!scannedCode.trim()) {
      setScanError("Please enter or scan a barcode/SKU.");
      return;
    }
    const cleanCode = scannedCode.trim();
    const expected = scanTransfer;
    if (
      cleanCode !== String(expected.product) &&
      cleanCode.toLowerCase() !== (expected.product_sku || "").toLowerCase() &&
      cleanCode !== (expected.product_barcode || "")
    ) {
      setScanError("Verification failed: Scanned code does not match this product.");
      return;
    }
    runAction(expected.id, scanAction, cleanCode);
  };

  const resetForm = () => {
    form.reset({ quantity: 1, notes: "" });
    setStep(1);
    setCreatedDraft(null);
  };

  const openTransfers = transfers.filter((t) =>
    ["draft", "in_transit"].includes(t.status)
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-fuchsia-50 dark:bg-fuchsia-500/20 rounded-xl border border-fuchsia-200 dark:border-fuchsia-500/30 text-fuchsia-600 dark:text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.15)]">
              <ArrowLeftRight className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-slate-50 dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              Store / Branch Transfers
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Dispatch inventory from Central Warehouse to registered stores & retail branches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsBranchModalOpen(true)}
            className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg hover:shadow-fuchsia-500/25 transition-all cursor-pointer flex items-center gap-2 px-4 py-2.5"
          >
            <Plus className="h-4 w-4" /> Create Store / Branch
          </Button>

          <Badge className="bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-500/10 dark:text-fuchsia-400 dark:border-fuchsia-500/20 px-4 py-2 text-sm font-semibold hidden sm:inline-flex">
            <ArrowLeftRight className="mr-2 h-4 w-4" /> Transfers Active
          </Badge>
        </div>
      </div>

      {step === 1 && canCreate && (
        <Card className="border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
          <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="px-8 py-6 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 relative z-10 flex flex-col">
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-200 font-bold text-lg">
              <MapPin className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-400" /> 
              Step 1: Transfer Details
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Select product and target store/branch to initiate stock dispatch.
            </p>
          </div>

          <CardContent className="p-8 relative z-10">
            <Form {...form}>
              <form className="space-y-8">
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField control={form.control} name="sourceLocationId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Source Warehouse <span className="text-rose-500">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-11 font-medium">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-2xl rounded-xl text-slate-800 dark:text-slate-200">
                          {locations.map((l) => <SelectItem key={l.id} value={String(l.id)} className="cursor-pointer">{l.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-rose-500 text-xs" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="destinationLocationId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Destination Store / Branch <span className="text-rose-500">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-11 font-medium">
                            <SelectValue placeholder="Select target store/branch..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-2xl rounded-xl text-slate-800 dark:text-slate-200 max-h-60">
                          {destinationOptions.map((opt) => (
                            <SelectItem key={opt.id} value={String(opt.id)} className="cursor-pointer">
                              {opt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-rose-500 text-xs" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="productId" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Product to Transfer <span className="text-rose-500">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
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

                  <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex justify-between">
                        <span>Quantity <span className="text-rose-500">*</span></span>
                        {sourceId && productId && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                            Source Avail: <strong className="text-fuchsia-600 dark:text-fuchsia-400 font-mono font-bold">{sourceStock}</strong>
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          className={`bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 font-bold rounded-xl h-11 ${isOverTransfer ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30' : 'focus:border-fuchsia-500/50 focus:ring-fuchsia-500/30'}`}
                        />
                      </FormControl>
                      <FormMessage className="text-rose-500 text-xs" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">Notes</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Optional transfer notes..." 
                          {...field} 
                          className="bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 focus:border-fuchsia-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl h-11 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                {sourceId && destId && productId && (
                  <div className="flex items-start gap-4 rounded-xl border border-fuchsia-200 dark:border-fuchsia-500/30 bg-fuchsia-50/70 dark:bg-fuchsia-500/10 p-5 shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-fuchsia-500/5 group-hover:bg-fuchsia-500/10 transition-colors pointer-events-none" />
                    <Layers className="h-6 w-6 shrink-0 text-fuchsia-600 dark:text-fuchsia-400 relative z-10" />
                    <div className="relative z-10 w-full">
                      <h5 className="font-bold text-slate-900 dark:text-fuchsia-100 text-base">Location Stock Overview</h5>
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm bg-white dark:bg-slate-950/50 rounded-xl p-3 border border-slate-200 dark:border-white/5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 dark:text-slate-300 truncate">{sourceLoc?.name}</span>
                          <span className="text-slate-500 dark:text-slate-400 mt-1">Current Stock: <strong className="text-slate-900 dark:text-white font-mono">{sourceStock}</strong></span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 dark:text-slate-300 truncate">{destLoc?.name}</span>
                          <span className="text-slate-500 dark:text-slate-400 mt-1">Current Stock: <strong className="text-slate-900 dark:text-white font-mono">{destStock}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isOverTransfer && (
                  <div className="flex items-start gap-4 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-5 shadow-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-rose-500/5 group-hover:bg-rose-500/10 transition-colors pointer-events-none" />
                    <AlertCircle className="h-6 w-6 shrink-0 text-rose-600 dark:text-rose-400 relative z-10 animate-pulse" />
                    <div className="relative z-10">
                      <h5 className="font-bold text-rose-800 dark:text-rose-100 text-base">Insufficient Stock</h5>
                      <p className="text-sm text-rose-700 dark:text-rose-200 mt-1">
                        Only <strong className="text-rose-900 dark:text-white font-mono bg-rose-100 dark:bg-rose-500/20 px-1.5 py-0.5 rounded">{sourceStock}</strong> available at source location.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-slate-200/80 dark:border-white/5">
                  <Button 
                    type="button" 
                    onClick={goToConfirm} 
                    disabled={isOverTransfer}
                    className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-semibold shadow-md rounded-xl h-11 px-8 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="border border-fuchsia-200 dark:border-fuchsia-500/30 bg-white/90 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
          <div className="px-8 py-6 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 relative z-10 flex flex-col">
            <div className="flex items-center gap-2 text-fuchsia-700 dark:text-fuchsia-300 font-bold text-xl">
              <CheckCircle className="h-6 w-6 text-fuchsia-600 dark:text-fuchsia-400" /> 
              Step 2: Confirm Draft
            </div>
          </div>
          <CardContent className="p-8">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950/80 p-6 border border-slate-200 dark:border-white/5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 mb-1">Source Location</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold text-base">{sourceLoc?.name}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 mb-1">Destination Location</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold text-base">{destLoc?.name}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 mb-1">Product</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold text-base">{selectedProduct?.name}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 mb-1">Transfer Quantity</span>
                  <span className="text-fuchsia-700 dark:text-white font-mono font-bold bg-fuchsia-100 dark:bg-fuchsia-500/20 px-2.5 py-1 rounded-md w-fit">{quantity}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex items-start gap-4 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-5 relative">
              <div className="relative z-10">
                <h5 className="font-bold text-amber-800 dark:text-amber-100 text-sm flex items-center gap-2 mb-1"><AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Draft only</h5>
                <p className="text-sm text-amber-700 dark:text-amber-200/80">
                  Stock is not moved until someone with approve permission ships and completes the transfer.
                </p>
              </div>
            </div>
            
            <div className="mt-8 flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 rounded-xl h-11 px-6 bg-white dark:bg-transparent border-slate-200 dark:border-white/10 cursor-pointer"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold rounded-xl h-11 px-8 shadow-md cursor-pointer"
              >
                {isSubmitting ? "Creating..." : "Create Draft"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && createdDraft && (
        <Card className="border border-emerald-200 dark:border-emerald-500/30 bg-white/90 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
          <div className="px-8 py-6 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 relative z-10">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xl">
              <CheckCircle className="h-6 w-6" /> 
              Draft Created Successfully
            </div>
          </div>
          <CardContent className="p-8">
            <p className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 p-5 text-sm text-emerald-800 dark:text-emerald-200 font-medium">
              Transfer <strong className="text-emerald-900 dark:text-white font-mono mx-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 rounded">#{createdDraft.id}</strong> created for <strong className="text-emerald-900 dark:text-white">{quantity}</strong> × <strong className="text-emerald-900 dark:text-white">{selectedProduct?.name}</strong>. Use the open transfers table below to ship and complete.
            </p>
            <div className="mt-6 flex justify-end">
              <Button 
                variant="outline" 
                onClick={resetForm}
                className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl h-11 px-6 cursor-pointer"
              >
                Start New Transfer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="px-8 py-6 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 relative z-10">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-200 font-bold text-lg">
            <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> 
            Open Transfers
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ship, complete, or cancel draft / in-transit transfers
          </p>
        </div>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto relative z-10">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-white/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 pl-8 font-bold text-slate-700 dark:text-slate-300">ID</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Product</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">From → To</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Qty</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
                  <TableHead className="py-4 pr-8 text-right font-bold text-slate-700 dark:text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openTransfers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 dark:text-slate-400 py-12">
                      <div className="flex flex-col items-center justify-center">
                        <ArrowLeftRight className="h-10 w-10 text-slate-400 mb-3" />
                        <p>No open transfers</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {openTransfers.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-200/60 dark:border-white/5 group">
                    <TableCell className="pl-8 py-5">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-300 font-mono text-sm font-bold shadow-xs">
                        #{t.id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-slate-900 dark:text-slate-200">{t.product_name}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-800 dark:text-slate-300 font-medium">{t.source_location_name}</span>
                      <span className="text-slate-400 mx-2">→</span>
                      <span className="text-slate-800 dark:text-slate-300 font-medium">{t.destination_location_name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-900 dark:text-slate-100 font-bold font-mono">{t.quantity}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                          onClick={() => handleDownloadPdf(t.id)}
                          title="Download Internal Transfer Delivery Slip PDF"
                        >
                          <FileText className="mr-1.5 h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> Slip PDF
                        </Button>
                        {canApprove && t.status === "draft" && (
                          <Button
                            size="sm"
                            className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/40 dark:text-indigo-300 dark:border-indigo-500/30 font-semibold cursor-pointer"
                            disabled={actionId === t.id}
                            onClick={() => handleActionClick(t, "ship")}
                          >
                            <Truck className="mr-1.5 h-3.5 w-3.5" /> Ship
                          </Button>
                        )}
                        {canApprove && ["draft", "in_transit"].includes(t.status) && (
                          <Button
                            size="sm"
                            className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/40 dark:text-emerald-300 dark:border-emerald-500/30 font-semibold cursor-pointer"
                            disabled={actionId === t.id}
                            onClick={() => handleActionClick(t, "complete")}
                          >
                            <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Complete
                          </Button>
                        )}
                        {canApprove && ["draft", "in_transit"].includes(t.status) && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-500/20 dark:hover:bg-rose-500/40 dark:text-rose-300 dark:border-rose-500/30 font-semibold cursor-pointer"
                            disabled={actionId === t.id}
                            onClick={() => runAction(t.id, "cancel")}
                          >
                            <XCircle className="mr-1.5 h-3.5 w-3.5" /> Cancel
                          </Button>
                        )}
                        {!canApprove && (
                          <span className="text-xs text-slate-500 italic">View only</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Active Stores & Retail Branches Directory Card */}
      <Card className="border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
        <div className="px-8 py-6 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 relative z-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-900 dark:text-slate-200 font-bold text-lg">
              <Building2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Registered Stores & Retail Branches Directory
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active branch locations available for inventory dispatches & transfers.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsBranchModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 px-3.5 py-2 cursor-pointer shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> New Branch / Store
          </Button>
        </div>

        <CardContent className="p-0 relative z-10">
          <Table>
            <TableHeader className="bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-200/60 dark:border-white/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-4 pl-8 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Branch / Store Name</TableHead>
                <TableHead className="py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Type</TableHead>
                <TableHead className="py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Location Address</TableHead>
                <TableHead className="py-4 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Manager & Contact</TableHead>
                <TableHead className="py-4 text-center text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Capacity</TableHead>
                <TableHead className="py-4 text-right pr-8 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registeredStores.map((store) => (
                <TableRow key={store.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 border-b border-slate-200/60 dark:border-white/5 transition-colors">
                  <TableCell className="pl-8 py-4">
                    <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Store className="h-4 w-4 text-indigo-500 shrink-0" />
                      {store.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20 text-xs font-semibold">
                      {store.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                    {store.address}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <User className="h-3 w-3 text-slate-400" /> {store.manager_name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                      <Phone className="h-3 w-3 text-slate-400" /> {store.contact_phone}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                    {store.capacity?.toLocaleString() || "5,000"} units
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        form.setValue("destinationLocationId", String(store.id));
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        toast.info(`Selected '${store.name}' for transfer dispatch.`);
                      }}
                      className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20 text-xs font-semibold cursor-pointer"
                    >
                      <ArrowLeftRight className="mr-1 h-3 w-3" /> Transfer Stock
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Branch / Store Modal Dialog */}
      <Dialog open={isBranchModalOpen} onOpenChange={setIsBranchModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-white dark:bg-[#0F172A] border-slate-200 dark:border-indigo-500/30 shadow-2xl rounded-2xl p-0 overflow-hidden text-slate-900 dark:text-white">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-cyan-500" />
          
          <DialogHeader className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/40">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Building2 className="h-5 w-5 text-indigo-500" /> Register New Store or Branch
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Add a new retail store, branch, or outlet to receive inventory dispatches from Central Warehouse.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBranch} className="p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="branch-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Store / Branch Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="branch-name"
                  placeholder="e.g., Birmingham City Store"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  required
                  className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="branch-type" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Location Type
                </Label>
                <Select
                  value={branchForm.type}
                  onValueChange={(val) => setBranchForm({ ...branchForm, type: val })}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 rounded-xl h-10">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10">
                    <SelectItem value="store">Retail Store</SelectItem>
                    <SelectItem value="branch">Regional Branch</SelectItem>
                    <SelectItem value="outlet">Supermarket Outlet</SelectItem>
                    <SelectItem value="kiosk">Express Kiosk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="branch-address" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full Address / City Location
                </Label>
                <Input
                  id="branch-address"
                  placeholder="e.g., 14 Corporation Street, Birmingham B2 4RN"
                  value={branchForm.address}
                  onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                  className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="branch-manager" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Branch Manager Name
                </Label>
                <Input
                  id="branch-manager"
                  placeholder="e.g., Sarah Jenkins"
                  value={branchForm.manager_name}
                  onChange={(e) => setBranchForm({ ...branchForm, manager_name: e.target.value })}
                  className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="branch-phone" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Contact Phone Number
                </Label>
                <Input
                  id="branch-phone"
                  placeholder="e.g., +44 121 496 0123"
                  value={branchForm.contact_phone}
                  onChange={(e) => setBranchForm({ ...branchForm, contact_phone: e.target.value })}
                  className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="branch-email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Contact Email Address
                </Label>
                <Input
                  id="branch-email"
                  type="email"
                  placeholder="e.g., birmingham@store.com"
                  value={branchForm.contact_email}
                  onChange={(e) => setBranchForm({ ...branchForm, contact_email: e.target.value })}
                  className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label htmlFor="branch-capacity" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Storage Capacity (Units)
                </Label>
                <Input
                  id="branch-capacity"
                  type="number"
                  placeholder="e.g., 5000"
                  value={branchForm.capacity}
                  onChange={(e) => setBranchForm({ ...branchForm, capacity: e.target.value })}
                  className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 rounded-xl h-10"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsBranchModalOpen(false)}
                className="rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingBranch}
                className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md cursor-pointer px-6"
              >
                {creatingBranch ? "Registering..." : "Register Store / Branch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#0F172A] border-slate-200 dark:border-indigo-500/30 shadow-2xl rounded-2xl p-0 overflow-hidden text-slate-900 dark:text-white">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500" />
          
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
              <Layers className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              Scan Verification
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              To confirm this stock transfer, scan or input the barcode/SKU for:
              <strong className="block mt-2 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-500/20">
                {scanTransfer?.product_name} <span className="text-slate-500 dark:text-slate-400 font-mono text-xs">({scanTransfer?.product_sku})</span>
              </strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleVerifyScan} className="px-6 pb-6">
            <div className="space-y-3">
              <Label htmlFor="barcode-scan" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Scan Barcode / SKU</Label>
              <Input
                id="barcode-scan"
                placeholder="Scan or type here..."
                value={scannedCode}
                onChange={(e) => {
                  setScannedCode(e.target.value);
                  setScanError("");
                }}
                autoFocus
                className="w-full font-mono bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 h-12 rounded-xl"
              />
              {scanError && (
                <p className="text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1.5 mt-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 px-3 py-2 rounded-lg font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {scanError}
                </p>
              )}
            </div>

            <DialogFooter className="mt-8 flex gap-3 sm:justify-end">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setScanOpen(false)}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl px-5 cursor-pointer"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-6 shadow-md cursor-pointer"
              >
                Verify & Confirm
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function StockTransferPage() {
  return (
    <ModuleGate module="transfers" action="view">
      <StockTransferPageContent />
    </ModuleGate>
  );
}
