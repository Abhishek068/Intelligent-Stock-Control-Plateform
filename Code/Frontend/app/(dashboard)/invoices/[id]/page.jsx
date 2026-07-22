"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Send,
  XCircle,
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
import { ModuleGate } from "@/components/shared/ModuleGate";
import { INVOICE_STATUS_COLORS } from "@/constants/status.constants";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { invoicesApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

function InvoiceDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { isSuperAdmin, hasPermission } = useRoleAccess();
  const canApprove = isSuperAdmin || hasPermission("invoices", "approve");

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await invoicesApi.get(params.id);
      setInvoice(res?.data || res);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to load invoice");
      setInvoice(null);
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
      if (action === "issue") await invoicesApi.issue(params.id);
      if (action === "mark_paid") await invoicesApi.markPaid(params.id);
      if (action === "cancel") await invoicesApi.cancel(params.id);
      toast.success("Updated");
      load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Action failed");
    } finally {
      setActing(false);
    }
  };

  if (loading) return <p className="p-6 text-slate-400">Loading...</p>;
  if (!invoice) {
    return (
      <div className="space-y-4 p-6">
        <Button variant="ghost" onClick={() => router.push("/invoices")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <p className="text-slate-400">Invoice not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/invoices")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{invoice.invoice_number}</h1>
            <p className="text-slate-400">{invoice.customer_name}</p>
          </div>
          <Badge className={INVOICE_STATUS_COLORS[invoice.status] || "bg-slate-400"}>
            {invoice.status}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await invoicesApi.downloadPdf(invoice.id, invoice.invoice_number);
                toast.success("PDF Downloaded");
              } catch (err) {
                toast.error("Failed to download PDF");
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" /> Download PDF
          </Button>
          {canApprove && invoice.status === "draft" && (
            <Button size="sm" onClick={() => run("issue")} disabled={acting}>
              <Send className="mr-2 h-4 w-4" /> Issue
            </Button>
          )}
          {canApprove && ["unpaid", "overdue"].includes(invoice.status) && (
            <Button size="sm" onClick={() => run("mark_paid")} disabled={acting}>
              <CheckCircle className="mr-2 h-4 w-4" /> Mark paid
            </Button>
          )}
          {canApprove &&
            ["draft", "unpaid", "overdue"].includes(invoice.status) && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => run("cancel")}
                disabled={acting}
              >
                <XCircle className="mr-2 h-4 w-4" /> Cancel
              </Button>
            )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle>Line items</CardTitle>
            <CardDescription>Products / services billed</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoice.lines || []).map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.description}</TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell className="text-right">
                      £{Number(line.unit_price).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      £{Number(line.line_total || 0).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Subtotal</span>
                <span className="font-mono">
                  £{Number(invoice.subtotal || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tax ({invoice.tax_rate}%)</span>
                <span className="font-mono">
                  £{Number(invoice.tax_amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between font-semibold border-t border-white/5 pt-2">
                <span>Total</span>
                <span className="font-mono">
                  £{Number(invoice.total_amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Issued</span>
                <span>{invoice.issue_date || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Due</span>
                <span>{invoice.due_date || "—"}</span>
              </div>
              {invoice.notes && (
                <p className="pt-2 text-slate-400 border-t border-white/5">{invoice.notes}</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-sm">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium text-slate-200">{invoice.customer_name}</p>
              <p className="text-slate-400">{invoice.customer_email || "—"}</p>
              <p className="text-slate-400">{invoice.customer_phone || "—"}</p>
              <p className="text-slate-500 text-xs whitespace-pre-wrap">
                {invoice.customer_address || ""}
              </p>
            </CardContent>
          </Card>

          {(invoice.payments || []).length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-sm">Payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {invoice.payments.map((p) => (
                  <div key={p.id} className="flex justify-between border-b border-white/5 pb-2">
                    <div>
                      <p>£{Number(p.amount).toLocaleString()}</p>
                      <p className="text-xs text-slate-500">
                        {p.method} · {p.paid_at ? new Date(p.paid_at).toLocaleString() : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvoiceDetailPage() {
  return (
    <ModuleGate module="invoices" action="view">
      <InvoiceDetailContent />
    </ModuleGate>
  );
}
