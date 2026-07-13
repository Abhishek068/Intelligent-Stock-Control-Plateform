"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertTriangle, ArrowRight, Info, ShieldAlert } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { productsApi, locationsApi, stockApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const adjustmentReasons = [
"Physical count discrepancy",
"Damaged goods",
"Return to supplier",
"Customer return",
"Theft / loss",
"Other"];


const adjustmentSchema = z.
object({
  productId: z.string().min(1, "Select a product"),
  locationId: z.string().min(1, "Select a location"),
  currentStock: z.coerce.number().min(0),
  adjustedStock: z.coerce.number().min(0, "Cannot be negative"),
  reason: z.string().min(1, "Select a reason"),
  evidence: z.string().min(10, "Please provide evidence notes")
}).
refine((data) => data.adjustedStock !== data.currentStock, {
  message: "Adjusted stock must be different",
  path: ["adjustedStock"]
});

export default function StockAdjustmentPage() {
  const { canEdit, role } = useRoleAccess();
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [locationStock, setLocationStock] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { currentStock: 0, adjustedStock: 0, evidence: "" }
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
    if (!productId) return;
    productsApi.get(productId).then((detail) => {
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
    const pct = currentStock > 0 ? diff / currentStock * 100 : diff * 100;
    if (pct > 50) return 85;
    if (pct > 25) return 55;
    return 20;
  })();

  const onSubmit = async (data) => {
    if (!canEdit) {
      toast.warning("Admin or Manager role required");
      return;
    }
    setIsSubmitting(true);
    try {
      await stockApi.adjust({
        product: Number(data.productId),
        location: Number(data.locationId),
        adjusted_qty: data.adjustedStock,
        reason: `${data.reason}: ${data.evidence}`
      });
      toast.success(`Stock adjusted for ${selectedProduct?.name}`);
      const refreshed = await productsApi.list();
      setProducts(refreshed);
      form.reset({ currentStock: 0, adjustedStock: 0, evidence: "" });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Adjustment failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Stock Adjustment</h1>
          <p className="text-slate-400">Correct inventory discrepancies</p>
        </div>
        <Badge variant="outline" className="text-amber-600">
          <ShieldAlert className="mr-1 h-3 w-3" /> {canEdit ? "Can approve" : "Requires approval"}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Adjust Inventory</CardTitle>
              <CardDescription>Enter corrected stock quantity at the selected location</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="productId"
                      render={({ field }) =>
                      <FormItem className="flex flex-col md:col-span-2">
                          <FormLabel>Product *</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="justify-between">
                                {field.value ?
                              products.find((p) => String(p.id) === field.value)?.name :
                              "Select product..."}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                              <Command>
                                <CommandInput placeholder="Search..." />
                                <CommandEmpty>No product.</CommandEmpty>
                                <CommandGroup>
                                  {products.map((p) =>
                                <CommandItem
                                  key={p.id}
                                  value={String(p.id)}
                                  onSelect={() => field.onChange(String(p.id))}>
                                  
                                      {p.name}
                                    </CommandItem>
                                )}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      } />
                    

                    <FormField
                      control={form.control}
                      name="locationId"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel>Location *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select location" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {locations.map((l) =>
                            <SelectItem key={l.id} value={String(l.id)}>
                                  {l.name}
                                </SelectItem>
                            )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      } />
                    

                    <FormField
                      control={form.control}
                      name="currentStock"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel>Current Stock (read-only)</FormLabel>
                          <FormControl>
                            <Input {...field} disabled className="bg-slate-900/50" />
                          </FormControl>
                        </FormItem>
                      } />
                    

                    <FormField
                      control={form.control}
                      name="adjustedStock"
                      render={({ field }) =>
                      <FormItem>
                          <FormLabel>Corrected Stock *</FormLabel>
                          <FormControl>
                            <Input
                            type="number"
                            min="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                          
                          </FormControl>
                          {locationId &&
                        <p className="text-xs text-slate-400">At location: {locationStock} units</p>
                        }
                          <FormMessage />
                        </FormItem>
                      } />
                    

                    <FormField
                      control={form.control}
                      name="reason"
                      render={({ field }) =>
                      <FormItem className="md:col-span-2">
                          <FormLabel>Reason *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select reason" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {adjustmentReasons.map((r) =>
                            <SelectItem key={r} value={r}>
                                  {r}
                                </SelectItem>
                            )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      } />
                    
                  </div>

                  <FormField
                    control={form.control}
                    name="evidence"
                    render={({ field }) =>
                    <FormItem>
                        <FormLabel>
                          Evidence Notes <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea placeholder="Detailed evidence..." rows={3} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    } />
                  

                  {!canEdit &&
                  <Alert className="border-amber-200 bg-amber-50">
                      <Info className="h-4 w-4 text-amber-600" />
                      <AlertTitle>Approval Required</AlertTitle>
                      <AlertDescription>Only Admin or Manager can submit adjustments.</AlertDescription>
                    </Alert>
                  }

                  {selectedProduct && adjustedStock !== currentStock &&
                  <div className="rounded-lg border bg-slate-900/50 p-4">
                      <p className="mb-2 text-sm font-medium">Before / After</p>
                      <div className="flex items-center justify-around">
                        <div className="text-center">
                          <p className="text-xs text-slate-400">Current</p>
                          <p className="text-2xl font-bold">{currentStock}</p>
                        </div>
                        <ArrowRight className="h-6 w-6 text-slate-400" />
                        <div className="text-center">
                          <p className="text-xs text-slate-400">Adjusted</p>
                          <p
                          className={`text-2xl font-bold ${
                          adjustedStock > currentStock ? "text-green-600" : "text-red-600"}`
                          }>
                          
                            {adjustedStock}
                          </p>
                        </div>
                      </div>
                    </div>
                  }

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => form.reset()}>
                      Reset
                    </Button>
                    <Button type="submit" disabled={isSubmitting || !canEdit}>
                      {isSubmitting ? "Processing..." : "Confirm Adjustment"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {selectedProduct && adjustedStock !== currentStock &&
        <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> Anomaly Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between">
                <span className="text-sm">Score</span>
                <Badge
                className={
                anomalyScore > 70 ? "bg-red-500" : anomalyScore > 40 ? "bg-amber-500" : "bg-green-500"
                }>
                
                  {Math.round(anomalyScore)}%
                </Badge>
              </div>
              <Progress value={anomalyScore} className="mt-2 h-1.5" />
              <p className="mt-2 text-xs text-slate-400">Submitted as {role}</p>
            </CardContent>
          </Card>
        }
      </div>
    </div>);

}
