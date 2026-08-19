"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Ship, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { stockApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

function pickReturn(res) {
  if (!res) return null;
  if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) return res.data;
  return res;
}

function SupplierReturnDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const [ret, setRet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await stockApi.getSupplierReturn(id);
      setRet(pickReturn(res));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to load return");
      router.push("/supplier-returns");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (fn, label) => {
    setActing(true);
    try {
      const res = await fn(id);
      setRet(pickReturn(res));
      toast.success(label);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : `Failed to ${label.toLowerCase()}`);
    } finally {
      setActing(false);
    }
  };

  if (loading || !ret) {
    return <p className="text-slate-400 p-6">Loading...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/supplier-returns")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-100">
              Return #{ret.id}
            </h1>
            <p className="text-slate-400">
              {ret.supplier_name} · {ret.location_name}
            </p>
          </div>
          <Badge className="ml-2 capitalize">{ret.status}</Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="cursor-pointer border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
            onClick={() => stockApi.downloadSupplierReturnSlip(ret)}
          >
            <FileText className="mr-2 h-4 w-4 text-rose-500" /> Print Return Slip
          </Button>
          {ret.status === "draft" && (
            <>
              <Button
                variant="outline"
                disabled={acting}
                onClick={() => runAction(stockApi.cancelSupplierReturn, "Return cancelled")}
              >
                <XCircle className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button
                disabled={acting}
                onClick={() => runAction(stockApi.shipSupplierReturn, "Return shipped")}
              >
                <Ship className="mr-2 h-4 w-4" /> Ship
              </Button>
            </>
          )}
          {ret.status === "shipped" && (
            <Button
              disabled={acting}
              onClick={() => runAction(stockApi.completeSupplierReturn, "Return completed")}
            >
              <CheckCircle className="mr-2 h-4 w-4" /> Complete
            </Button>
          )}
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-300">
          <p>
            <span className="text-slate-500">Reason:</span> {ret.reason}
          </p>
          <p>
            <span className="text-slate-500">Created by:</span> {ret.created_by_name || "—"}
          </p>
          <p>
            <span className="text-slate-500">Shipped at:</span>{" "}
            {ret.shipped_at ? new Date(ret.shipped_at).toLocaleString() : "—"}
          </p>
          <p>
            <span className="text-slate-500">Completed at:</span>{" "}
            {ret.completed_at ? new Date(ret.completed_at).toLocaleString() : "—"}
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Lines</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ret.lines || []).map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <div>{line.product_name}</div>
                    <div className="text-xs text-slate-400">{line.product_sku}</div>
                  </TableCell>
                  <TableCell>{line.batch_number || "—"}</TableCell>
                  <TableCell className="text-right">{line.quantity}</TableCell>
                  <TableCell className="text-right">
                    £{Number(line.unit_cost || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SupplierReturnDetailPage() {
  return (
    <ModuleGate module="stock_out" action="view">
      <SupplierReturnDetailContent />
    </ModuleGate>
  );
}
