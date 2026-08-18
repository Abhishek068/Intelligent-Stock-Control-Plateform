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
          <Button variant="ghost" size="icon" onClick={() => router.push("/invoices")} className="cursor-pointer text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{invoice.invoice_number}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">{invoice.customer_name}</p>
          </div>
          <Badge className={INVOICE_STATUS_COLORS[invoice.status] || "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-400 font-bold"}>
            {invoice.status}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="cursor-pointer border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
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
            <Button size="sm" onClick={() => run("issue")} disabled={acting} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer">
              <Send className="mr-2 h-4 w-4" /> Issue
            </Button>
          )}
          {canApprove && ["unpaid", "overdue"].includes(invoice.status) && (
            <Button size="sm" onClick={() => run("mark_paid")} disabled={acting} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer">
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
            <CardDescription className="text-slate-500 dark:text-slate-400">Products / services billed</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-white/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-6 font-bold text-slate-700 dark:text-slate-300">Description</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Qty</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Unit</TableHead>
                  <TableHead className="text-right pr-6 font-bold text-slate-700 dark:text-slate-300">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invoice.lines || []).map((line) => (
                  <TableRow key={line.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-200/60 dark:border-white/5">
                    <TableCell className="pl-6 font-bold text-slate-900 dark:text-slate-200">{line.description}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">{line.quantity}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      £{Number(line.unit_price).toLocaleString()}
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
                <span className="font-semibold text-slate-500 dark:text-slate-400">Subtotal</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  £{Number(invoice.subtotal || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Tax ({invoice.tax_rate}%)</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  £{Number(invoice.tax_amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center font-bold border-t border-slate-200/80 dark:border-white/5 pt-3">
                <span className="text-slate-900 dark:text-white">Total</span>
                <span className="font-mono text-lg text-indigo-700 dark:text-indigo-400">
                  £{Number(invoice.total_amount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Issued</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{invoice.issue_date || "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Due</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{invoice.due_date || "—"}</span>
              </div>
              {invoice.notes && (
                <p className="pt-3 text-slate-600 dark:text-slate-400 border-t border-slate-200/80 dark:border-white/5">{invoice.notes}</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl">
            <CardHeader className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 pb-3">
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 p-5 text-sm">
              <p className="font-bold text-slate-900 dark:text-slate-100 text-base">{invoice.customer_name}</p>
              <p className="text-slate-600 dark:text-slate-400 font-medium">{invoice.customer_email || "—"}</p>
              <p className="text-slate-600 dark:text-slate-400 font-medium">{invoice.customer_phone || "—"}</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs whitespace-pre-wrap pt-1">
                {invoice.customer_address || ""}
              </p>
            </CardContent>
          </Card>

          {(invoice.payments || []).length > 0 && (
            <Card className="glass-card border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl">
              <CardHeader className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 pb-3">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Payments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5 text-sm">
                {invoice.payments.map((p) => (
                  <div key={p.id} className="flex justify-between border-b border-slate-200/60 dark:border-white/5 pb-2">
                    <div>
                      <p className="font-mono font-bold text-slate-900 dark:text-white">£{Number(p.amount).toLocaleString()}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
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
