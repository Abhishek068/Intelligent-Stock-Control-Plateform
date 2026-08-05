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
    return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 shadow-inner px-2.5 py-1">Draft</Badge>;
  }
  if (status === "in_transit") {
    return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)] px-2.5 py-1 animate-pulse">In Transit</Badge>;
  }
  if (status === "completed") {
    return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-inner px-2.5 py-1">Completed</Badge>;
  }
  if (status === "cancelled") {
    return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-inner px-2.5 py-1">Cancelled</Badge>;
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
    });
    loadTransfers();
  }, [loadTransfers]);

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
            <div className="p-2.5 bg-fuchsia-500/20 rounded-xl border border-fuchsia-500/30 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.2)]">
              <ArrowLeftRight className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Stock Transfer
            </h1>
          </div>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Draft → ship → complete between locations securely.
          </p>
        </div>

        <Badge className="bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20 shadow-[0_0_15px_rgba(217,70,239,0.2)] px-4 py-1.5 text-sm">
          <ArrowLeftRight className="mr-2 h-4 w-4" /> Transfers Active
        </Badge>
      </div>

      {step === 1 && canCreate && (
        <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
          <div className="absolute top-0 right-0 w-96 h-96 bg-fuchsia-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="px-8 py-6 border-b border-white/5 bg-slate-950/20 relative z-10 flex flex-col">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-lg">
              <MapPin className="h-5 w-5 text-fuchsia-400" /> 
              Step 1: Transfer Details
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Creates a draft; stock moves only when completed and verified.
            </p>
          </div>

          <CardContent className="p-8 relative z-10">
            <Form {...form}>
              <form className="space-y-8">
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField control={form.control} name="sourceLocationId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-300">Source Location <span className="text-rose-400">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-950/50 border-white/10 focus:border-fuchsia-500/50 text-slate-200 rounded-xl h-11 font-medium">
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-900 border-white/10 shadow-2xl rounded-xl text-slate-200">
                          {locations.map((l) => <SelectItem key={l.id} value={String(l.id)} className="focus:bg-fuchsia-500/20 focus:text-fuchsia-200 cursor-pointer">{l.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-rose-400 text-xs" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="destinationLocationId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-300">Destination Location <span className="text-rose-400">*</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-slate-950/50 border-white/10 focus:border-fuchsia-500/50 text-slate-200 rounded-xl h-11 font-medium">
                            <SelectValue placeholder="Select destination" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-slate-900 border-white/10 shadow-2xl rounded-xl text-slate-200">
                          {locations.map((l) => <SelectItem key={l.id} value={String(l.id)} className="focus:bg-fuchsia-500/20 focus:text-fuchsia-200 cursor-pointer">{l.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-rose-400 text-xs" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="productId" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-sm font-semibold text-slate-300">Product <span className="text-rose-400">*</span></FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-between bg-slate-950/50 border-white/10 hover:bg-white/5 text-slate-200 rounded-xl h-11 font-medium">
                            {field.value ? products.find((p) => String(p.id) === field.value)?.name : "Select product..."}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0 bg-slate-900 border-white/10 shadow-2xl rounded-xl">
                          <Command className="bg-transparent text-slate-200">
                            <CommandInput placeholder="Search products..." className="border-b border-white/10 h-11" />
                            <CommandEmpty className="py-6 text-center text-sm text-slate-400">No product found.</CommandEmpty>
                            <CommandGroup className="max-h-[300px] overflow-auto">
                              {products.map((p) => (
                                <CommandItem 
                                  key={p.id} 
                                  value={String(p.id)} 
                                  onSelect={() => field.onChange(String(p.id))}
                                  className="aria-selected:bg-fuchsia-500/20 aria-selected:text-fuchsia-200 cursor-pointer text-slate-300 py-3"
                                >
                                  {p.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage className="text-rose-400 text-xs" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-slate-300 flex justify-between">
                        <span>Quantity <span className="text-rose-400">*</span></span>
                        {sourceId && productId && (
                          <span className="text-xs text-slate-400 font-normal">
                            Source Avail: <strong className="text-fuchsia-400 font-mono">{sourceStock}</strong>
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          className={`bg-slate-950/80 border-white/10 focus:ring-1 text-slate-100 font-bold rounded-xl h-11 ${isOverTransfer ? 'border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/30' : 'focus:border-fuchsia-500/50 focus:ring-fuchsia-500/30'}`}
                        />
                      </FormControl>
                      <FormMessage className="text-rose-400 text-xs" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-sm font-semibold text-slate-300">Notes</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Optional transfer notes..." 
                          {...field} 
                          className="bg-slate-950/80 border-white/10 focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/30 text-slate-100 font-medium rounded-xl h-11 placeholder:text-slate-500"
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                {sourceId && destId && productId && (
                  <div className="flex items-start gap-4 rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-5 shadow-[0_0_20px_rgba(217,70,239,0.1)] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-fuchsia-500/5 group-hover:bg-fuchsia-500/10 transition-colors" />
                    <Layers className="h-6 w-6 shrink-0 text-fuchsia-400 relative z-10" />
                    <div className="relative z-10 w-full">
                      <h5 className="font-bold text-fuchsia-100 text-base">Location Stock Overview</h5>
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm bg-slate-950/50 rounded-lg p-3 border border-white/5">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-300 truncate">{sourceLoc?.name}</span>
                          <span className="text-slate-400 mt-1">Current Stock: <strong className="text-white font-mono">{sourceStock}</strong></span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-300 truncate">{destLoc?.name}</span>
                          <span className="text-slate-400 mt-1">Current Stock: <strong className="text-white font-mono">{destStock}</strong></span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isOverTransfer && (
                  <div className="flex items-start gap-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-5 shadow-[0_0_20px_rgba(244,63,94,0.1)] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-rose-500/5 group-hover:bg-rose-500/10 transition-colors" />
                    <AlertCircle className="h-6 w-6 shrink-0 text-rose-400 relative z-10 animate-pulse" />
                    <div className="relative z-10">
                      <h5 className="font-bold text-rose-100 text-base">Insufficient Stock</h5>
                      <p className="text-sm text-rose-200 mt-1">
                        Only <strong className="text-white font-mono bg-rose-500/20 px-1.5 py-0.5 rounded">{sourceStock}</strong> available at source location.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-white/5">
                  <Button 
                    type="button" 
                    onClick={goToConfirm} 
                    disabled={isOverTransfer}
                    className="bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-fuchsia-500/20 rounded-xl h-11 px-8 border border-fuchsia-500/50 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
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
        <Card className="border border-fuchsia-500/30 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
          <div className="px-8 py-6 border-b border-white/5 bg-slate-950/20 relative z-10 flex flex-col">
            <div className="flex items-center gap-2 text-fuchsia-300 font-bold text-xl">
              <CheckCircle className="h-6 w-6 text-fuchsia-400" /> 
              Step 2: Confirm Draft
            </div>
          </div>
          <CardContent className="p-8">
            <div className="rounded-xl bg-slate-950/80 p-6 border border-white/5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div className="flex flex-col">
                  <span className="font-medium text-slate-400 mb-1">Source Location</span>
                  <span className="text-slate-100 font-semibold text-base">{sourceLoc?.name}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-slate-400 mb-1">Destination Location</span>
                  <span className="text-slate-100 font-semibold text-base">{destLoc?.name}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-slate-400 mb-1">Product</span>
                  <span className="text-slate-100 font-semibold text-base">{selectedProduct?.name}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-slate-400 mb-1">Transfer Quantity</span>
                  <span className="text-white font-mono bg-fuchsia-500/20 px-2 py-1 rounded w-fit">{quantity}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex items-start gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 relative">
              <div className="relative z-10">
                <h5 className="font-bold text-amber-100 text-sm flex items-center gap-2 mb-1"><AlertCircle className="h-4 w-4 text-amber-400" /> Draft only</h5>
                <p className="text-sm text-amber-200/80">
                  Stock is not moved until someone with approve permission ships and completes the transfer.
                </p>
              </div>
            </div>
            
            <div className="mt-8 flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setStep(1)}
                className="hover:bg-white/5 text-slate-300 hover:text-white rounded-xl h-11 px-6 bg-transparent border-white/10"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold rounded-xl h-11 px-8 shadow-lg shadow-fuchsia-500/20"
              >
                {isSubmitting ? "Creating..." : "Create Draft"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && createdDraft && (
        <Card className="border border-emerald-500/30 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
          <div className="px-8 py-6 border-b border-white/5 bg-slate-950/20 relative z-10">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xl">
              <CheckCircle className="h-6 w-6" /> 
              Draft Created Successfully
            </div>
          </div>
          <CardContent className="p-8">
            <p className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-5 text-sm text-emerald-200">
              Transfer <strong className="text-white font-mono mx-1 px-1 bg-emerald-500/20 rounded">#{createdDraft.id}</strong> created for <strong className="text-white">{quantity}</strong> × <strong className="text-white">{selectedProduct?.name}</strong>. Use the open transfers table below to ship and complete.
            </p>
            <div className="mt-6 flex justify-end">
              <Button 
                variant="outline" 
                onClick={resetForm}
                className="bg-slate-950/50 border-white/10 text-slate-200 hover:bg-white/10 hover:text-white rounded-xl h-11 px-6"
              >
                Start New Transfer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
        <div className="absolute -top-10 -right-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="px-8 py-6 border-b border-white/5 bg-slate-950/20 relative z-10">
          <div className="flex items-center gap-2 text-slate-200 font-semibold text-lg">
            <Package className="h-5 w-5 text-indigo-400" /> 
            Open Transfers
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Ship, complete, or cancel draft / in-transit transfers
          </p>
        </div>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto relative z-10">
            <Table>
              <TableHeader className="bg-slate-950/40 border-b border-white/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 pl-8 font-semibold text-slate-300">ID</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Product</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">From → To</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Qty</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Status</TableHead>
                  <TableHead className="py-4 pr-8 text-right font-semibold text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openTransfers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400 py-12">
                      <div className="flex flex-col items-center justify-center">
                        <ArrowLeftRight className="h-10 w-10 text-slate-600 mb-3" />
                        <p>No open transfers</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {openTransfers.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-800/40 transition-colors border-b border-white/5 group">
                    <TableCell className="pl-8 py-5">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-sm font-semibold shadow-inner">
                        #{t.id}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-200">{t.product_name}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-300">{t.source_location_name}</span>
                      <span className="text-slate-500 mx-2">→</span>
                      <span className="text-slate-300">{t.destination_location_name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-slate-100 font-bold">{t.quantity}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={t.status} />
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {canApprove && t.status === "draft" && (
                          <Button
                            size="sm"
                            className="bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 border border-indigo-500/30"
                            disabled={actionId === t.id}
                            onClick={() => handleActionClick(t, "ship")}
                          >
                            <Truck className="mr-1.5 h-3.5 w-3.5" /> Ship
                          </Button>
                        )}
                        {canApprove && ["draft", "in_transit"].includes(t.status) && (
                          <Button
                            size="sm"
                            className="bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-500/30"
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
                            className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/30"
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

      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#0F172A] border border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.15)] rounded-2xl p-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-fuchsia-500" />
          
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
              <Layers className="h-6 w-6 text-indigo-400" />
              Scan Verification
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-sm mt-2">
              To confirm this stock transfer, scan or input the barcode/SKU for:
              <strong className="block mt-2 text-indigo-300 bg-indigo-500/10 px-3 py-2 rounded-lg border border-indigo-500/20">
                {scanTransfer?.product_name} <span className="text-slate-400 font-mono text-xs">({scanTransfer?.product_sku})</span>
              </strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleVerifyScan} className="px-6 pb-6">
            <div className="space-y-3">
              <Label htmlFor="barcode-scan" className="text-sm font-semibold text-slate-300">Scan Barcode / SKU</Label>
              <Input
                id="barcode-scan"
                placeholder="Scan or type here..."
                value={scannedCode}
                onChange={(e) => {
                  setScannedCode(e.target.value);
                  setScanError("");
                }}
                autoFocus
                className="w-full font-mono bg-slate-900 border-white/10 text-white placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 h-12 rounded-xl"
              />
              {scanError && (
                <p className="text-xs text-rose-400 flex items-center gap-1.5 mt-2 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg">
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
                className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl px-5"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl px-6 shadow-lg shadow-indigo-500/25"
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
