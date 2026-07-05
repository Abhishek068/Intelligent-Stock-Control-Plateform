"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeftRight, CheckCircle, Clock, Truck, AlertCircle, ChevronRight, ChevronLeft, Layers, AlertTriangle } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { useUserStore } from "@/lib/store";

const mockLocations = [
  { id: "loc-1", name: "Warehouse A - Main" },
  { id: "loc-2", name: "Warehouse B - North" },
  { id: "loc-3", name: "Warehouse C - South" },
];

const mockProducts = [
  { id: "1", sku: "SKU-001", name: "Wireless Mouse", stock: 12, batches: [{ batch: "B2024-01", qty: 8 }, { batch: "B2024-04", qty: 4 }] },
  { id: "2", sku: "SKU-002", name: "USB-C Cable (2m)", stock: 5, batches: [{ batch: "B2024-02", qty: 5 }] },
];

const locationStock = {
  "loc-1": { "1": 8, "2": 3 },
  "loc-2": { "1": 4, "2": 2 },
  "loc-3": { "1": 0, "2": 0 },
};

const transferSchema = z.object({
  sourceLocationId: z.string().min(1, "Source required"),
  destinationLocationId: z.string().min(1, "Destination required"),
  productId: z.string().min(1, "Product required"),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  batchCode: z.string().optional(),
}).refine((data) => data.sourceLocationId !== data.destinationLocationId, { message: "Source and destination must differ", path: ["destinationLocationId"] });

export default function StockTransferPage() {
  const { role } = useUserStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [transferStatus, setTransferStatus] = useState("draft");
  const [submittedData, setSubmittedData] = useState(null);

  const form = useForm({ resolver: zodResolver(transferSchema), defaultValues: { quantity: 1 } });

  const sourceId = form.watch("sourceLocationId");
  const destId = form.watch("destinationLocationId");
  const productId = form.watch("productId");
  const quantity = form.watch("quantity") || 0;
  const selectedProduct = mockProducts.find(p => p.id === productId);
  const sourceLoc = mockLocations.find(l => l.id === sourceId);
  const destLoc = mockLocations.find(l => l.id === destId);
  const sourceStock = sourceId && productId ? (locationStock[sourceId]?.[productId] || 0) : 0;
  const isOverTransfer = quantity > sourceStock;

  const nextStep = () => {
    if (step === 1) { const isValid = form.trigger(["sourceLocationId", "destinationLocationId", "productId", "quantity"]); if (isValid) setStep(2); } 
    else if (step === 2) handleSubmit();
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const data = form.getValues();
      setSubmittedData(data);
      setTransferStatus("approved");
      setStep(3);
      toast.success(`Transfer initiated`);
      setIsSubmitting(false);
      setTimeout(() => setTransferStatus("transit"), 1500);
      setTimeout(() => setTransferStatus("received"), 3000);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Stock Transfer</h1><p className="text-slate-500">Move inventory between locations</p></div>
        <Badge variant="outline" className="text-purple-600"><ArrowLeftRight className="mr-1 h-3 w-3" /> Transfer</Badge>
      </div>

      <Card><CardContent className="p-4">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="text-sm font-medium text-slate-500">Status:</span><Badge className={transferStatus === "draft" ? "bg-slate-400" : transferStatus === "approved" ? "bg-blue-500" : transferStatus === "transit" ? "bg-amber-500" : "bg-green-500"}>{transferStatus.charAt(0).toUpperCase() + transferStatus.slice(1)}</Badge></div></div>
        <div className="mt-3 flex items-center gap-2"><div className="flex-1"><Progress value={transferStatus === "draft" ? 0 : transferStatus === "approved" ? 33 : transferStatus === "transit" ? 66 : 100} className="h-1.5" /></div><div className="flex items-center gap-1 text-xs"><Badge variant="outline">Draft</Badge><ChevronRight className="h-3 w-3 text-slate-300" /><Badge variant="outline">Approved</Badge><ChevronRight className="h-3 w-3 text-slate-300" /><Badge variant="outline">Transit</Badge><ChevronRight className="h-3 w-3 text-slate-300" /><Badge variant="outline">Received</Badge></div></div>
      </CardContent></Card>

      {step === 1 && (
        <Card><CardHeader><CardTitle>Step 1: Transfer Details</CardTitle></CardHeader>
          <CardContent><Form {...form}><form className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <FormField control={form.control} name="sourceLocationId" render={({ field }) => (<FormItem><FormLabel>Source *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent>{mockLocations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="destinationLocationId" render={({ field }) => (<FormItem><FormLabel>Destination *</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl><SelectContent>{mockLocations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="productId" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Product *</FormLabel><Popover><PopoverTrigger asChild><Button variant="outline" className="justify-between">{field.value ? mockProducts.find(p => p.id === field.value)?.name : "Select..."}</Button></PopoverTrigger><PopoverContent className="w-[300px] p-0"><Command><CommandInput placeholder="Search..." /><CommandEmpty>No product.</CommandEmpty><CommandGroup>{mockProducts.map(p => <CommandItem key={p.id} value={p.id} onSelect={() => field.onChange(p.id)}>{p.name}</CommandItem>)}</CommandGroup></Command></PopoverContent></Popover><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Quantity *</FormLabel><FormControl><Input type="number" min="1" max={sourceStock} {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} /></FormControl>{sourceId && productId && <p className="text-xs text-slate-500">Available: <strong>{sourceStock}</strong></p>}<FormMessage /></FormItem>)} />
              {selectedProduct && selectedProduct.batches.length > 0 && (
                <FormField control={form.control} name="batchCode" render={({ field }) => (<FormItem><FormLabel>Batch <Badge variant="outline" className="text-[10px]">R4</Badge></FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select batch (optional)" /></SelectTrigger></FormControl><SelectContent>{selectedProduct.batches.map(b => <SelectItem key={b.batch} value={b.batch}>{b.batch} (Qty: {b.qty})</SelectItem>)}</SelectContent></Select></FormItem>)} />
              )}
            </div>
            {sourceId && destId && productId && (
              <Alert className="border-blue-200 bg-blue-50"><Layers className="h-4 w-4 text-blue-600" /><AlertTitle>Location Stock Overview</AlertTitle><AlertDescription><div className="mt-1 grid grid-cols-2 gap-4 text-sm"><div><p className="font-medium text-blue-800">{sourceLoc?.name}</p><p>Stock: <strong>{sourceStock}</strong></p></div><div><p className="font-medium text-blue-800">{destLoc?.name}</p><p>Stock: <strong>{locationStock[destId]?.[productId] || 0}</strong></p></div></div></AlertDescription></Alert>
            )}
            {isOverTransfer && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Insufficient Stock</AlertTitle></Alert>}
            <div className="flex justify-end"><Button type="button" onClick={nextStep} disabled={isOverTransfer}>Next <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
          </form></Form></CardContent></Card>
      )}

      {step === 2 && (
        <Card className="border-purple-200"><CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-purple-600" /> Step 2: Confirm</CardTitle></CardHeader>
          <CardContent><div className="rounded-lg bg-slate-50 p-4"><div className="grid grid-cols-2 gap-1 text-sm"><span className="font-medium">Source:</span><span>{sourceLoc?.name}</span><span className="font-medium">Destination:</span><span>{destLoc?.name}</span><span className="font-medium">Product:</span><span>{selectedProduct?.name}</span><span className="font-medium">Quantity:</span><span>{quantity}</span></div></div>
            <Alert className="border-amber-200 bg-amber-50 mt-4"><AlertTriangle className="h-4 w-4 text-amber-600" /><AlertTitle>Atomic Transfer</AlertTitle><AlertDescription>Deducts from source and adds to destination in a single transaction.</AlertDescription></Alert>
            <div className="flex justify-between mt-4"><Button variant="outline" onClick={() => setStep(1)}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button><Button onClick={nextStep} disabled={isSubmitting}>{isSubmitting ? "Processing..." : "Confirm Transfer"}</Button></div>
          </CardContent></Card>
      )}

      {step === 3 && submittedData && (
        <Card className="border-green-200"><CardHeader><CardTitle className="flex items-center gap-2 text-green-700"><CheckCircle className="h-5 w-5" /> Transfer {transferStatus === "received" ? "Completed" : "In Progress"}</CardTitle></CardHeader>
          <CardContent><div className="rounded-lg bg-green-50 p-4 text-center"><p className="text-sm text-green-800">{transferStatus === "received" ? "✅ Successfully received at destination." : transferStatus === "transit" ? "In transit..." : "Approved and queued."}</p></div>
            <div className="flex justify-end mt-4"><Button variant="outline" onClick={() => { form.reset(); setStep(1); setTransferStatus("draft"); setSubmittedData(null); }}>New Transfer</Button></div>
          </CardContent></Card>
      )}
    </div>
  );
}