"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  ArrowLeftRight,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Layers } from
"lucide-react";
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
import { productsApi, locationsApi, stockApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

const transferSchema = z.
object({
  sourceLocationId: z.string().min(1, "Source required"),
  destinationLocationId: z.string().min(1, "Destination required"),
  productId: z.string().min(1, "Product required"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  notes: z.string().optional()
}).
refine((data) => data.sourceLocationId !== data.destinationLocationId, {
  message: "Source and destination must differ",
  path: ["destinationLocationId"]
});

export default function StockTransferPage() {
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [sourceStock, setSourceStock] = useState(0);
  const [destStock, setDestStock] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState(false);

  const form = useForm({
    resolver: zodResolver(transferSchema),
    defaultValues: { quantity: 1, notes: "" }
  });

  useEffect(() => {
    Promise.all([productsApi.list(), locationsApi.list()]).then(([p, l]) => {
      setProducts(p);
      setLocations(l);
    });
  }, []);

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
    "quantity"]
    );
    if (valid && !isOverTransfer) setStep(2);
  };

  const handleSubmit = async () => {
    const data = form.getValues();
    setIsSubmitting(true);
    try {
      await stockApi.transfer({
        product: Number(data.productId),
        source_location: Number(data.sourceLocationId),
        destination_location: Number(data.destinationLocationId),
        quantity: data.quantity,
        notes: data.notes
      });
      toast.success("Transfer completed");
      setCompleted(true);
      setStep(3);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Transfer failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    form.reset({ quantity: 1, notes: "" });
    setStep(1);
    setCompleted(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Stock Transfer</h1>
          <p className="text-slate-400">Move inventory between locations</p>
        </div>
        <Badge variant="outline" className="text-purple-600">
          <ArrowLeftRight className="mr-1 h-3 w-3" /> Transfer
        </Badge>
      </div>

      {step === 1 &&
      <Card className="glass-card">
          <CardHeader>
            <CardTitle>Step 1: Transfer Details</CardTitle>
            <CardDescription>Atomic transfer via API with audit logging</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <FormField
                  control={form.control}
                  name="sourceLocationId"
                  render={({ field }) =>
                  <FormItem>
                        <FormLabel>Source *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select source" />
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
                  name="destinationLocationId"
                  render={({ field }) =>
                  <FormItem>
                        <FormLabel>Destination *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select destination" />
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
                  name="productId"
                  render={({ field }) =>
                  <FormItem className="flex flex-col">
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
                  name="quantity"
                  render={({ field }) =>
                  <FormItem>
                        <FormLabel>Quantity *</FormLabel>
                        <FormControl>
                          <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} />
                      
                        </FormControl>
                        {sourceId && productId &&
                    <p className="text-xs text-slate-400">
                            Available at source: <strong>{sourceStock}</strong>
                          </p>
                    }
                        <FormMessage />
                      </FormItem>
                  } />
                
                  <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) =>
                  <FormItem className="md:col-span-2">
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Input placeholder="Optional transfer notes" {...field} />
                        </FormControl>
                      </FormItem>
                  } />
                
                </div>

                {sourceId && destId && productId &&
              <Alert className="border-blue-200 bg-blue-50">
                    <Layers className="h-4 w-4 text-blue-600" />
                    <AlertTitle>Location Stock Overview</AlertTitle>
                    <AlertDescription>
                      <div className="mt-1 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-blue-800">{sourceLoc?.name}</p>
                          <p>
                            Stock: <strong>{sourceStock}</strong>
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-blue-800">{destLoc?.name}</p>
                          <p>
                            Stock: <strong>{destStock}</strong>
                          </p>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
              }

                {isOverTransfer &&
              <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Insufficient Stock</AlertTitle>
                    <AlertDescription>Only {sourceStock} available at source.</AlertDescription>
                  </Alert>
              }

                <div className="flex justify-end">
                  <Button type="button" onClick={goToConfirm} disabled={isOverTransfer}>
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      }

      {step === 2 &&
      <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-purple-600" /> Step 2: Confirm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-slate-900/50 p-4">
              <div className="grid grid-cols-2 gap-1 text-sm">
                <span className="font-medium">Source:</span>
                <span>{sourceLoc?.name}</span>
                <span className="font-medium">Destination:</span>
                <span>{destLoc?.name}</span>
                <span className="font-medium">Product:</span>
                <span>{selectedProduct?.name}</span>
                <span className="font-medium">Quantity:</span>
                <span>{quantity}</span>
              </div>
            </div>
            <Alert className="mt-4 border-amber-200 bg-amber-50">
              <AlertTitle>Atomic Transfer</AlertTitle>
              <AlertDescription>
                Deducts from source and adds to destination in a single transaction.
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Confirm Transfer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      }

      {step === 3 && completed &&
      <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" /> Transfer Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
              Successfully moved {quantity} × {selectedProduct?.name} from {sourceLoc?.name} to{" "}
              {destLoc?.name}.
            </p>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={resetForm}>
                New Transfer
              </Button>
            </div>
          </CardContent>
        </Card>
      }
    </div>);

}
