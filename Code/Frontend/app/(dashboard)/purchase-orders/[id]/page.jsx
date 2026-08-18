"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Truck,
  CheckCircle,
  XCircle,
  Send,
  PackageCheck,
  Download,
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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { PO_STATUS_COLORS } from "@/constants/status.constants";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { purchaseOrdersApi, locationsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

function PurchaseOrderDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { isSuperAdmin, hasPermission } = useRoleAccess();
  const canApprove = isSuperAdmin || hasPermission("purchase_orders", "approve");

  const [order, setOrder] = useState(null);
  const [locations, setLocations] = useState([]);
  const [receiveLocation, setReceiveLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, locs] = await Promise.all([
        purchaseOrdersApi.get(params.id),
        locationsApi.list().catch(() => []),
      ]);
      const data = res?.data || res;
      setOrder(data);
      setLocations(locs);
      if (data?.location) setReceiveLocation(String(data.location));
      else if (locs[0]) setReceiveLocation(String(locs[0].id));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to load PO");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action) => {
    setActing(true);
    try {
      if (action === "submit") await purchaseOrdersApi.submit(params.id);
      if (action === "cancel") await purchaseOrdersApi.cancel(params.id);
      if (action === "receive") {
        await purchaseOrdersApi.receive(params.id, {
          location: receiveLocation ? Number(receiveLocation) : null,
        });
      }
      toast.success("Updated");
      load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <p className="text-slate-400 p-6">Loading...</p>;
  }

  if (!order) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" onClick={() => router.push("/purchase-orders")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-slate-400">Purchase order not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/purchase-orders")} className="cursor-pointer text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{order.po_number}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{order.supplier_name}</p>
          </div>
          <Badge className={PO_STATUS_COLORS[order.status] || "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-400 font-bold"}>
            {order.status}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
            onClick={async () => {
              try {
                await purchaseOrdersApi.downloadPdf(order.id, order.po_number);
                toast.success("PDF Downloaded");
              } catch (err) {
                toast.error("Failed to download PDF");
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          {canApprove && order.status === "draft" && (
            <Button size="sm" onClick={() => run("submit")} disabled={acting} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">
              <Send className="mr-2 h-4 w-4" /> Submit
            </Button>
          )}
          {canApprove && ["sent", "partial"].includes(order.status) && (
            <Button size="sm" onClick={() => run("receive")} disabled={acting} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer">
              <PackageCheck className="mr-2 h-4 w-4" /> Receive
            </Button>
          )}
          {canApprove &&
            ["draft", "sent", "partial"].includes(order.status) && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => run("cancel")}
                disabled={acting}
                className="cursor-pointer"
              >
                <XCircle className="mr-2 h-4 w-4" /> Cancel
              </Button>
            )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass-card lg:col-span-2 border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl">
          <CardHeader className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20">
            <CardTitle className="text-slate-900 dark:text-white">Line items</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">Ordered vs received quantities</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-white/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6 font-bold text-slate-700 dark:text-slate-300">Product</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300">SKU</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Ordered</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Received</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Unit cost</TableHead>
                  <TableHead className="text-right pr-6 font-bold text-slate-700 dark:text-slate-300">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(order.lines || []).map((line) => (
                  <TableRow key={line.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-200/60 dark:border-white/5">
                    <TableCell className="pl-6 font-bold text-slate-900 dark:text-slate-200">{line.product_name}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">{line.product_sku}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">{line.quantity_ordered}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">{line.quantity_received}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      £{Number(line.unit_cost).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right pr-6 font-mono font-bold text-slate-900 dark:text-white">
                      £{Number(line.line_total || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="glass-card border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl">
            <CardHeader className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-5 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Total</span>
                <span className="font-mono font-bold text-lg text-slate-900 dark:text-white">
                  £{Number(order.total_amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Expected</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{order.expected_delivery || "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Location</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{order.location_name || "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Created by</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{order.created_by_name || "—"}</span>
              </div>
              {order.notes && (
                <p className="pt-3 text-slate-600 dark:text-slate-400 border-t border-slate-200/80 dark:border-white/5">{order.notes}</p>
              )}
            </CardContent>
          </Card>

          {canApprove && ["sent", "partial"].includes(order.status) && (
            <Card className="glass-card border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl">
              <CardHeader className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 pb-3">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Truck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Receive into
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-5">
                <div className="grid gap-2">
                  <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Location</Label>
                  <Select value={receiveLocation} onValueChange={setReceiveLocation}>
                    <SelectTrigger className="bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl rounded-xl text-slate-800 dark:text-slate-200">
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)} className="cursor-pointer">
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md cursor-pointer"
                  onClick={() => run("receive")}
                  disabled={acting || !receiveLocation}
                >
                  <CheckCircle className="mr-2 h-4 w-4" /> Receive remaining
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PurchaseOrderDetailPage() {
  return (
    <ModuleGate module="purchase_orders" action="view">
      <PurchaseOrderDetailContent />
    </ModuleGate>
  );
}
