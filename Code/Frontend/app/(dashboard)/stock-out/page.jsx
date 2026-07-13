"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowUpFromLine, Barcode, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { productsApi, locationsApi, stockApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth.store";

const stockOutSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  locationId: z.string().min(1, "Select a location"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  issuedTo: z.string().min(1, "Select destination"),
  reference: z.string().optional(),
  notes: z.string().optional()
});

const DESTINATIONS = [
{ value: "Department A", label: "Department A" },
{ value: "Department B", label: "Department B" },
{ value: "Customer", label: "Customer" },
{ value: "Internal use", label: "Internal use" }];


export default function StockOutPage() {
  const user = useAuthStore((s) => s.user);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");

  const form = useForm({
    resolver: zodResolver(stockOutSchema),
    defaultValues: { quantity: 1, reference: "", notes: "" }
  });

  useEffect(() => {
    Promise.all([productsApi.list(), locationsApi.list()]).then(([p, l]) => {
      setProducts(p);
      setLocations(l);
      if (l.length === 1) form.setValue("locationId", String(l[0].id));
    });
  }, [form]);

  const productId = form.watch("productId");
  const quantity = form.watch("quantity") || 0;
  const selectedProduct = products.find((p) => String(p.id) === productId);
  const availableStock = selectedProduct?.stock ?? 0;
  const isOverIssuing = quantity > availableStock;

  useEffect(() => {
    if (selectedProduct) form.setValue("quantity", 1);
  }, [productId, form, selectedProduct]);

  const onSubmit = async (data) => {
    if (isOverIssuing) {
      toast.error("Quantity exceeds available stock");
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
        issued_at: new Date().toISOString()
      });
      toast.success(`Issued ${data.quantity} × ${selectedProduct?.name}`);
      const refreshed = await productsApi.list();
      setProducts(refreshed);
      form.reset({ quantity: 1, reference: "", notes: "" });
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Stock out failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBarcodeScan = async (value) => {
    try {
      const res = await productsApi.lookupBySku(value);
      if (res.success && res.data) {
        form.setValue("productId", String(res.data.id));
        setBarcodeInput("");
        toast.success(`Found: ${res.data.name}`);
      }
    } catch {
      toast.error("Product not found");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Stock Out</h1>
          <p className="text-slate-400">Issue stock to departments or customers</p>
        </div>
        <Badge variant="outline" className="text-blue-600">
          <ArrowUpFromLine className="mr-1 h-3 w-3" /> Issuing
        </Badge>
      </div>

      <Card className="border-blue-100 bg-blue-50/50">
        <CardContent className="flex flex-col items-center gap-3 p-4 sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 text-blue-600">
              <Barcode className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-blue-900">Barcode Quick-Scan</p>
          </div>
          <div className="flex w-full max-w-sm items-center gap-2">
            <Input
              placeholder="Enter SKU"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan(barcodeInput.trim())} />
            
            <Button variant="outline" onClick={() => handleBarcodeScan(barcodeInput.trim())}>
              Scan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Issue Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
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
                                  <span className="ml-auto text-xs text-slate-400">Stock: {p.stock}</span>
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
                  name="quantity"
                  render={({ field }) =>
                  <FormItem>
                      <FormLabel>Quantity *</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" {...field} />
                      </FormControl>
                      {selectedProduct &&
                    <p className="text-xs text-slate-400">
                          Available: <strong>{availableStock}</strong>
                        </p>
                    }
                      <FormMessage />
                    </FormItem>
                  } />
                

                <FormField
                  control={form.control}
                  name="issuedTo"
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
                          {DESTINATIONS.map((d) =>
                        <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                        )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  } />
                

                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) =>
                  <FormItem>
                      <FormLabel>Reference</FormLabel>
                      <FormControl>
                        <Input placeholder="SO-2024-042" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  } />
                
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) =>
                <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                } />
              

              {isOverIssuing &&
              <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Insufficient Stock</AlertTitle>
                  <AlertDescription>Only {availableStock} units available.</AlertDescription>
                </Alert>
              }

              {selectedProduct && !isOverIssuing && quantity > 0 &&
              <Alert className="border-blue-200 bg-blue-50">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <AlertTitle>Issue Summary</AlertTitle>
                  <AlertDescription>
                    Issuing <strong>{quantity}</strong> × <strong>{selectedProduct.name}</strong> as{" "}
                    {user?.role}.
                  </AlertDescription>
                </Alert>
              }

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  Reset
                </Button>
                <Button type="submit" disabled={isSubmitting || isOverIssuing}>
                  {isSubmitting ? "Processing..." : "Confirm Stock Out"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>);

}
