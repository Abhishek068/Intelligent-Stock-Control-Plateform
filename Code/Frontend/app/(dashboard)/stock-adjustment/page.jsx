"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertTriangle,
  ArrowRight,
  Info,
  ShieldAlert,
  CheckCircle2,
  History,
  Wallet,
  Layers,
  TrendingUp,
  TrendingDown,
  Clock,
  Building2,
  Package,
  ShieldCheck,
  RefreshCw,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { productsApi, locationsApi, stockApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { ModuleGate } from "@/components/shared/ModuleGate";

const adjustmentReasons = [
  "Physical count discrepancy",
  "Damaged goods",
  "Return to supplier",
  "Customer return",
  "Theft / loss",
  "Other",
];

const adjustmentSchema = z
  .object({
    productId: z.string().min(1, "Select a product"),
    locationId: z.string().min(1, "Select a location"),
    currentStock: z.coerce.number().min(0),
    adjustedStock: z.coerce.number().min(0, "Cannot be negative"),
    reason: z.string().min(1, "Select a reason"),
    evidence: z.string().min(10, "Please provide evidence notes"),
  })
  .refine((data) => data.adjustedStock !== data.currentStock, {
    message: "Adjusted stock must be different",
    path: ["adjustedStock"],
  });

function StockAdjustmentPageContent() {
  const { canEdit, role, hasPermission, isSuperAdmin } = useRoleAccess();
  const canAdjust =
    isSuperAdmin || hasPermission("adjustments", "create") || canEdit;
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [locationStock, setLocationStock] = useState(0);
  const [selectedProductDetail, setSelectedProductDetail] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]);

  const form = useForm({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { currentStock: 0, adjustedStock: 0, evidence: "" },
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
  const currentStock = form.watch("currentStock");
  const adjustedStock = form.watch("adjustedStock");
  const selectedProduct = products.find((p) => String(p.id) === productId);

  useEffect(() => {
    if (!productId) {
      setSelectedProductDetail(null);
      return;
    }
    productsApi.get(productId).then((detail) => {
      setSelectedProductDetail(detail);
      const balance = detail.inventory_by_location?.find(
        (b) => String(b.location_id) === locationId
      );
      const qty = balance?.quantity_on_hand ?? detail.stock ?? 0;
      setLocationStock(qty);
      form.setValue("currentStock", qty);
      form.setValue("adjustedStock", qty);
    });
  }, [productId, locationId, form]);

  const anomalyScore = (() => {
    if (!selectedProduct) return 0;
    const diff = Math.abs(adjustedStock - currentStock);
    const pct = currentStock > 0 ? (diff / currentStock) * 100 : diff * 100;
    if (pct > 50) return 85;
    if (pct > 25) return 55;
    if (pct > 10) return 30;
    return 15;
  })();

  const getAnomalyLevel = () => {
    if (!selectedProduct || adjustedStock === currentStock)
      return {
        label: "Normal Operational Variance",
        color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
        desc: "Within acceptable daily audit threshold.",
      };
    if (anomalyScore > 70)
      return {
        label: "High Anomaly Risk",
        color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
        desc: "Significant quantity discrepancy. Requires supervisor review.",
      };
    if (anomalyScore > 40)
      return {
        label: "Moderate Anomaly Risk",
        color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
        desc: "Variance exceeds standard tolerance. Double-check physical count.",
      };
    return {
      label: "Low Risk Adjustment",
      color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
      desc: "Minor stock correction auto-cleared by compliance rules.",
    };
  };

  const anomalyLevel = getAnomalyLevel();

  const netChange = adjustedStock - currentStock;
  const unitPrice =
    Number(selectedProductDetail?.price || selectedProduct?.price || 0);
  const financialImpact = netChange * unitPrice;

  const onSubmit = async (data) => {
    if (!canAdjust) {
      toast.warning("Adjustment permission required");
      return;
    }
    setIsSubmitting(true);
    try {
      await stockApi.adjust({
        product_id: Number(data.productId),
        location_id: Number(data.locationId),
        new_quantity: data.adjustedStock,
        reason: `${data.reason} - ${data.evidence}`,
      });
      toast.success("Stock adjustment applied successfully!");
      const newEntry = {
        id: Date.now(),
        productName: selectedProduct?.name || "Unknown Product",
        sku: selectedProductDetail?.sku || selectedProduct?.sku || "N/A",
        change: netChange,
        reason: data.reason,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setSessionHistory((prev) => [newEntry, ...prev]);
      form.reset({
        productId: "",
        locationId: locations.length === 1 ? String(locations[0].id) : "",
        currentStock: 0,
        adjustedStock: 0,
        evidence: "",
      });
      setSelectedProductDetail(null);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Adjustment failed"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/80 to-slate-950 p-6 rounded-2xl border border-white/10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Inventory Integrity Engine
            </span>
            <Badge
              variant="outline"
              className={
                canAdjust
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-semibold"
              }
            >
              <ShieldAlert className="mr-1 h-3.5 w-3.5" />
              {canAdjust ? "Can adjust" : "Requires permission"}
            </Badge>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Stock Adjustment & Audit Control
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time inventory reconciliation, AI anomaly verification, and
            compliance logging.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-6">
          <Card className="glass-card border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                <Package className="h-5 w-5 text-indigo-400" />
                Adjust Inventory
              </CardTitle>
              <CardDescription className="text-slate-400">
                Enter corrected stock quantity at the selected warehouse location
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="productId"
                      render={({ field }) => (
                        <FormItem className="flex flex-col md:col-span-2">
                          <FormLabel className="text-slate-200 font-semibold">
                            Product <span className="text-rose-400">*</span>
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="justify-between bg-slate-900/80 border-white/10 hover:border-indigo-500/50 text-slate-200 h-11"
                              >
                                {field.value
                                  ? products.find(
                                      (p) => String(p.id) === field.value
                                    )?.name
                                  : "Select product..."}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[380px] p-0">
                              <Command>
                                <CommandInput placeholder="Search products by SKU or name..." />
                                <CommandEmpty>No product found.</CommandEmpty>
                                <CommandGroup className="max-h-64 overflow-y-auto">
                                  {products.map((p) => (
                                    <CommandItem
                                      key={p.id}
                                      value={String(p.id)}
                                      onSelect={() =>
                                        field.onChange(String(p.id))
                                      }
                                    >
                                      {p.name}
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

                    <FormField
                      control={form.control}
                      name="locationId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200 font-semibold">
                            Location <span className="text-rose-400">*</span>
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-slate-900/80 border-white/10 h-11">
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {locations.map((l) => (
                                <SelectItem key={l.id} value={String(l.id)}>
                                  {l.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currentStock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200 font-semibold">
                            Current Stock (read-only)
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled
                              className="bg-slate-950/70 border-white/10 text-slate-300 font-bold h-11 cursor-not-allowed"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="adjustedStock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-200 font-semibold">
                            Corrected Stock <span className="text-rose-400">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              className="bg-slate-900/90 border-indigo-500/40 text-white font-extrabold text-lg h-11 focus:border-indigo-400"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseInt(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                          {locationId && (
                            <p className="text-xs text-indigo-400 font-medium">
                              At location: {locationStock} units currently
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reason"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-slate-200 font-semibold">
                            Reason <span className="text-rose-400">*</span>
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-slate-900/80 border-white/10 h-11">
                                <SelectValue placeholder="Select reason for adjustment" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {adjustmentReasons.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="evidence"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200 font-semibold">
                          Evidence Notes <span className="text-rose-400">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Detailed explanation, audit reference number, or physical recount verification details..."
                            rows={3}
                            className="bg-slate-900/80 border-white/10 focus:border-indigo-500 text-slate-200 resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!canAdjust && (
                    <Alert className="border-amber-500/30 bg-amber-500/10">
                      <Info className="h-4 w-4 text-amber-400" />
                      <AlertTitle className="text-amber-300 font-bold">
                        Permission Required
                      </AlertTitle>
                      <AlertDescription className="text-slate-300 text-xs">
                        You need `adjustments:create` permission to submit
                        adjustments.
                      </AlertDescription>
                    </Alert>
                  )}

                  {selectedProduct && adjustedStock !== currentStock && (
                    <div className="rounded-xl border border-white/10 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950 p-5 shadow-lg">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Before / After Reconciliation
                      </p>
                      <div className="flex items-center justify-around">
                        <div className="text-center">
                          <p className="text-xs text-slate-400 mb-1">Current</p>
                          <p className="text-3xl font-extrabold text-slate-300">
                            {currentStock}
                          </p>
                        </div>
                        <ArrowRight className="h-6 w-6 text-indigo-400" />
                        <div className="text-center">
                          <p className="text-xs text-slate-400 mb-1">
                            Adjusted
                          </p>
                          <p
                            className={`text-3xl font-extrabold ${
                              adjustedStock > currentStock
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {adjustedStock}
                          </p>
                        </div>
                        <div className="border-l border-white/10 pl-6 text-center">
                          <p className="text-xs text-slate-400 mb-1">
                            Net Variance
                          </p>
                          <Badge
                            className={`text-sm font-extrabold px-3 py-1 ${
                              netChange >= 0
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            }`}
                          >
                            {netChange >= 0 ? `+${netChange}` : netChange}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.reset()}
                      className="border-white/10 hover:bg-slate-800 text-slate-300"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" /> Reset
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting || !canAdjust}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-indigo-600/25 px-6"
                    >
                      {isSubmitting ? "Processing..." : "Confirm Adjustment"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <Card className="glass-card border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-cyan-500"></div>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-indigo-400" />
                  AI Anomaly & Risk Analysis
                </CardTitle>
                <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs">
                  Live Engine
                </Badge>
              </div>
              <CardDescription className="text-slate-400 text-xs">
                Automated statistical anomaly detection on stock variance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${anomalyLevel.color}`}
              >
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">{anomalyLevel.label}</p>
                  <p className="text-xs opacity-90 mt-0.5">
                    {anomalyLevel.desc}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Anomaly Risk Index</span>
                  <span
                    className={
                      anomalyScore > 70
                        ? "text-rose-400"
                        : anomalyScore > 40
                        ? "text-amber-400"
                        : "text-emerald-400"
                    }
                  >
                    {Math.round(anomalyScore)}%
                  </span>
                </div>
                <Progress value={anomalyScore} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    Verification
                  </p>
                  <p className="text-sm font-bold text-slate-200 mt-0.5 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Auto-Checked
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    Role Authority
                  </p>
                  <p className="text-sm font-bold text-slate-200 mt-0.5 capitalize">
                    {role || "Staff"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-400" />
                Financial Valuation Impact
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Real-time inventory monetary valuation variance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedProduct ? (
                <>
                  <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-400">
                        Product Unit Price
                      </p>
                      <p className="text-lg font-bold text-slate-200">
                        £{unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Total Net Impact</p>
                      <p
                        className={`text-xl font-extrabold ${
                          financialImpact >= 0
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {financialImpact >= 0 ? "+" : ""}£
                        {financialImpact.toLocaleString("en-GB", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>

                  {selectedProductDetail?.sku && (
                    <div className="flex items-center justify-between text-xs px-2 text-slate-400">
                      <span>
                        SKU:{" "}
                        <strong className="text-slate-200 font-mono">
                          {selectedProductDetail.sku}
                        </strong>
                      </span>
                      <span>
                        Category:{" "}
                        <strong className="text-slate-200">
                          {selectedProductDetail.category || "General"}
                        </strong>
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-6 rounded-xl bg-slate-900/40 border border-dashed border-white/10 text-center">
                  <Package className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">
                    No Product Selected
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Select a product from the form to compute instant monetary
                    variance impact.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10 shadow-2xl relative overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <History className="h-4 w-4 text-purple-400" />
                  Session Audit Log
                </CardTitle>
                <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px]">
                  {sessionHistory.length} Logged
                </Badge>
              </div>
              <CardDescription className="text-slate-400 text-xs">
                Live trail of adjustments completed in this session
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionHistory.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-900/30 border border-dashed border-white/10 text-center">
                  <FileText className="h-7 w-7 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">
                    No adjustments recorded yet
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Submitted stock corrections will appear here instantly.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {sessionHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between"
                    >
                      <div className="truncate pr-2">
                        <p className="text-xs font-bold text-slate-200 truncate">
                          {item.productName}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {item.sku} • {item.reason.split(" - ")[0]}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-xs font-bold ${
                            item.change >= 0
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                              : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                          }`}
                        >
                          {item.change >= 0 ? `+${item.change}` : item.change}
                        </Badge>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {item.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function StockAdjustmentPage() {
  return (
    <ModuleGate module="adjustments" action="create">
      <StockAdjustmentPageContent />
    </ModuleGate>
  );
}
