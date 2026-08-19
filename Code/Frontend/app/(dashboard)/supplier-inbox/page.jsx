"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { 
  Mail, 
  Search, 
  Plus, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Send, 
  Paperclip, 
  Undo2, 
  ShoppingCart, 
  ExternalLink, 
  RefreshCw,
  Building2,
  Package,
  MessageSquare,
  BadgeAlert,
  Inbox
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { suppliersApi, productsApi } from "@/lib/api";

const INITIAL_EMAILS = [
  {
    id: "MSG-1001",
    supplier_name: "Fresh Foods Ltd",
    sender_email: "orders@freshfoods.co.uk",
    subject: "Quality Alert: Batch #LOT-20260810 Temperature Variance Notice",
    product_name: "Organic Whole Milk 2L",
    product_sku: "DAI-001",
    category: "Product Defect",
    priority: "high",
    status: "unread",
    received_at: "2026-08-19 14:15",
    message: "Hi Central Warehouse Team,\n\nPlease note during transport for PO-2026-0810, refrigeration unit 4 experienced a brief temperature deviation. We advise inspecting batch LOT-20260810 before stock issuance. We can issue a credit note or supplier return slip immediately if required.\n\nBest regards,\nFresh Foods Quality Assurance"
  },
  {
    id: "MSG-1002",
    supplier_name: "Global Beverages Co",
    sender_email: "dispatch@globalbev.com",
    subject: "Shipment Delay Notice for PO-2026-0812 (Sparkling Water 500ml)",
    product_name: "Sparkling Mineral Water 500ml",
    product_sku: "BEV-002",
    category: "Delivery Delay",
    priority: "medium",
    status: "unread",
    received_at: "2026-08-19 11:30",
    message: "Dear Purchasing Manager,\n\nDue to port customs clearance delays, shipment PO-2026-0812 containing 500 cases of Sparkling Water has been rescheduled to arrive Friday morning (Aug 22). Apologies for any inconvenience.\n\nRegards,\nGlobal Logistics Dept"
  },
  {
    id: "MSG-1003",
    supplier_name: "Bakery Supplies Co",
    sender_email: "accounts@bakerysupplies.com",
    subject: "Unit Price Update & Credit Note Confirmation",
    product_name: "Wholemeal Loaf 800g",
    product_sku: "BAK-003",
    category: "Price Dispute",
    priority: "low",
    status: "read",
    received_at: "2026-08-18 16:45",
    message: "Hello Stock Operations,\n\nWe have applied a 5% promotional discount on your recent order for Wholemeal Loaves. Please find attached updated invoice reference PO-2026-0798 reflecting the £0.15 cost reduction per unit.\n\nThank you,\nBakery Supplies Accounts Team"
  },
  {
    id: "MSG-1004",
    supplier_name: "Packaging Solutions Hub",
    sender_email: "support@packagingsolutions.co.uk",
    subject: "Damaged Box Packaging Reported on Arrival",
    product_name: "Cardboard Shipping Box Large",
    product_sku: "PKG-005",
    category: "Product Defect",
    priority: "high",
    status: "read",
    received_at: "2026-08-17 09:20",
    message: "Hi Warehouse Manager,\n\nWe received your note regarding damaged outer cartons on dispatch #REC-4481. Replacement heavy-duty boxes are being dispatched free of charge today under tracking #TRK-99201.\n\nKind regards,\nCustomer Operations"
  }
];

export default function SupplierInboxPage() {
  const router = useRouter();
  const [emails, setEmails] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selectedEmail, setSelectedEmail] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const [logForm, setLogForm] = useState({
    supplier_name: "",
    sender_email: "",
    subject: "",
    product_name: "",
    category: "Product Defect",
    priority: "high",
    message: ""
  });

  useEffect(() => {
    let saved = [];
    try {
      const stored = localStorage.getItem("supplier_inbox_emails");
      if (stored) saved = JSON.parse(stored);
    } catch {}

    if (!saved || saved.length === 0) {
      saved = INITIAL_EMAILS;
      try { localStorage.setItem("supplier_inbox_emails", JSON.stringify(saved)); } catch {}
    }
    setEmails(saved);

    // Load Suppliers & Products from API
    Promise.all([
      suppliersApi.list().catch(() => []),
      productsApi.list().catch(() => [])
    ]).then(([sRes, pRes]) => {
      setSuppliers(Array.isArray(sRes) ? sRes : (sRes?.results || []));
      setProducts(Array.isArray(pRes) ? pRes : (pRes?.results || []));
    });
  }, []);

  const saveEmailsState = (newList) => {
    setEmails(newList);
    try {
      localStorage.setItem("supplier_inbox_emails", JSON.stringify(newList));
    } catch {}
  };

  const filteredEmails = useMemo(() => {
    return emails.filter((e) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          (e.supplier_name || "").toLowerCase().includes(q) ||
          (e.subject || "").toLowerCase().includes(q) ||
          (e.product_name || "").toLowerCase().includes(q) ||
          (e.sender_email || "").toLowerCase().includes(q);
        if (!match) return false;
      }
      if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      return true;
    });
  }, [emails, search, categoryFilter, statusFilter]);

  const counts = useMemo(() => {
    return {
      total: emails.length,
      unread: emails.filter((e) => e.status === "unread").length,
      defects: emails.filter((e) => e.category === "Product Defect").length,
      delays: emails.filter((e) => e.category === "Delivery Delay" || e.category === "Price Dispute").length,
      resolved: emails.filter((e) => e.status === "resolved" || e.status === "read").length,
    };
  }, [emails]);

  const handleOpenEmail = (email) => {
    setSelectedEmail(email);
    if (email.status === "unread") {
      const updated = emails.map((item) =>
        item.id === email.id ? { ...item, status: "read" } : item
      );
      saveEmailsState(updated);
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim()) {
      toast.error("Please enter a reply message");
      return;
    }
    const updated = emails.map((item) =>
      item.id === selectedEmail.id ? { ...item, status: "resolved" } : item
    );
    saveEmailsState(updated);
    toast.success(`Reply sent to ${selectedEmail.sender_email} & ticket resolved`);
    setReplyText("");
    setSelectedEmail(null);
  };

  const handleLogNewIssue = () => {
    if (!logForm.supplier_name || !logForm.subject || !logForm.message) {
      toast.error("Supplier name, subject, and message are required");
      return;
    }

    const newEntry = {
      id: `MSG-${Date.now().toString().slice(-4)}`,
      supplier_name: logForm.supplier_name,
      sender_email: logForm.sender_email || `${logForm.supplier_name.toLowerCase().replace(/[^a-z0-9]/g, "")}@supplier.com`,
      subject: logForm.subject,
      product_name: logForm.product_name || "General Product Inquiry",
      product_sku: "PRD-GENERAL",
      category: logForm.category,
      priority: logForm.priority,
      status: "unread",
      received_at: new Date().toISOString().slice(0, 16).replace("T", " "),
      message: logForm.message
    };

    const updated = [newEntry, ...emails];
    saveEmailsState(updated);
    toast.success("Supplier email / issue ticket recorded");
    setIsLogModalOpen(false);
    setLogForm({
      supplier_name: "",
      sender_email: "",
      subject: "",
      product_name: "",
      category: "Product Defect",
      priority: "high",
      message: ""
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-indigo-50 dark:bg-gradient-to-br dark:from-indigo-500/30 dark:to-purple-500/30 rounded-2xl border border-indigo-200 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
              <Mail className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-slate-50 dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                  Supplier Inbox & Product Issues
                </h1>
                {counts.unread > 0 && (
                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 text-xs px-2.5 py-0.5 font-bold animate-pulse">
                    {counts.unread} New
                  </Badge>
                )}
              </div>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-sm leading-relaxed mt-1">
                Centralized hub for supplier correspondence, product defect alerts, price variance notices, and delivery delays.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => setIsLogModalOpen(true)}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl px-5 h-11 shadow-md border border-indigo-400/30 transition-all cursor-pointer"
        >
          <Plus className="mr-2 h-4 w-4" /> Log Supplier Email / Issue
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Unread */}
        <Card
          onClick={() => {
            setStatusFilter("unread");
            toast.info("Filtered to unread supplier messages");
          }}
          className={`border bg-white/90 dark:bg-slate-900/50 backdrop-blur-xl p-5 rounded-2xl shadow-sm relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all ${
            statusFilter === "unread" ? "ring-2 ring-rose-500 border-rose-500" : "border-slate-200/80 dark:border-white/10"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-bold mb-1">
            <span>UNREAD MESSAGES</span>
            <Inbox className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{counts.unread}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Requires staff review</div>
        </Card>

        {/* Product Defects */}
        <Card
          onClick={() => {
            setCategoryFilter("Product Defect");
            toast.warning("Filtered to Product Defect notices");
          }}
          className={`border bg-white/90 dark:bg-slate-900/50 backdrop-blur-xl p-5 rounded-2xl shadow-sm relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all ${
            categoryFilter === "Product Defect" ? "ring-2 ring-amber-500 border-amber-500" : "border-slate-200/80 dark:border-white/10"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-bold mb-1">
            <span>PRODUCT DEFECTS</span>
            <BadgeAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-900 dark:text-amber-200">{counts.defects}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Damaged or quality alerts</div>
        </Card>

        {/* Delivery & Price Notices */}
        <Card
          onClick={() => {
            setCategoryFilter("Delivery Delay");
            toast.info("Filtered to Delivery Delays");
          }}
          className={`border bg-white/90 dark:bg-slate-900/50 backdrop-blur-xl p-5 rounded-2xl shadow-sm relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all ${
            categoryFilter === "Delivery Delay" ? "ring-2 ring-blue-500 border-blue-500" : "border-slate-200/80 dark:border-white/10"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-bold mb-1">
            <span>DELIVERY & PRICE NOTICES</span>
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-black text-blue-900 dark:text-blue-200">{counts.delays}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Schedule & cost updates</div>
        </Card>

        {/* Total Resolved */}
        <Card
          onClick={() => {
            setStatusFilter("all");
            setCategoryFilter("all");
            toast.success("Showing all communications");
          }}
          className={`border bg-white/90 dark:bg-slate-900/50 backdrop-blur-xl p-5 rounded-2xl shadow-sm relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all ${
            statusFilter === "all" && categoryFilter === "all" ? "ring-2 ring-indigo-500 border-indigo-500" : "border-slate-200/80 dark:border-white/10"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-bold mb-1">
            <span>TOTAL COMMUNICATIONS</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-900 dark:text-emerald-200">{counts.total}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">All logged messages</div>
        </Card>
      </div>

      {/* Main Table Container */}
      <Card className="border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-2xl overflow-hidden rounded-2xl relative w-full">
        {/* Table Filters Header */}
        <div className="p-6 border-b border-slate-200/80 dark:border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50/50 dark:bg-slate-950/40 relative z-10">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search supplier, email, or product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white dark:bg-slate-950/60 border-slate-200 dark:border-white/10 rounded-xl h-10 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44 bg-white dark:bg-slate-950/60 border-slate-200 dark:border-white/10 rounded-xl h-10 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-xs">
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Product Defect">⚠️ Product Defect</SelectItem>
                <SelectItem value="Delivery Delay">🚚 Delivery Delay</SelectItem>
                <SelectItem value="Price Dispute">💷 Price Dispute</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 bg-white dark:bg-slate-950/60 border-slate-200 dark:border-white/10 rounded-xl h-10 text-xs">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-xs">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="unread">🔴 Unread</SelectItem>
                <SelectItem value="read">🔵 Read</SelectItem>
                <SelectItem value="resolved">🟢 Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-100/50 dark:bg-slate-950/50 border-b border-slate-200/80 dark:border-white/10">
              <TableRow>
                <TableHead className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300">Supplier / Sender</TableHead>
                <TableHead className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300">Subject & Product Affected</TableHead>
                <TableHead className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300">Category</TableHead>
                <TableHead className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300">Status</TableHead>
                <TableHead className="font-bold text-xs uppercase text-slate-700 dark:text-slate-300">Date Received</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase text-slate-700 dark:text-slate-300">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmails.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Inbox className="h-10 w-10 mx-auto mb-2 text-slate-400" />
                    No supplier communications match your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmails.map((msg) => (
                  <TableRow
                    key={msg.id}
                    className={`cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      msg.status === "unread" ? "bg-indigo-50/30 dark:bg-indigo-500/5 font-semibold" : ""
                    }`}
                    onClick={() => handleOpenEmail(msg)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0">
                          {msg.supplier_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
                            {msg.supplier_name}
                            {msg.status === "unread" && (
                              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{msg.sender_email}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="max-w-md">
                      <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate" title={msg.subject}>
                        {msg.subject}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Package className="h-3 w-3 text-slate-400" />
                        <span>{msg.product_name}</span>
                        {msg.product_sku && <span className="font-mono text-[10px] text-slate-400">({msg.product_sku})</span>}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-lg ${
                          msg.category === "Product Defect"
                            ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20"
                            : msg.category === "Delivery Delay"
                            ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20"
                            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20"
                        }`}
                      >
                        {msg.category}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {msg.status === "unread" && (
                        <Badge className="bg-rose-500 text-white font-bold text-xs">Unread</Badge>
                      )}
                      {msg.status === "read" && (
                        <Badge variant="outline" className="border-slate-300 text-slate-700 dark:text-slate-300 text-xs">Read</Badge>
                      )}
                      {msg.status === "resolved" && (
                        <Badge className="bg-emerald-500 text-white font-bold text-xs">Resolved</Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {msg.received_at}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEmail(msg);
                        }}
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/20"
                      >
                        View & Reply
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Email Reader & Resolution Modal */}
      {selectedEmail && (
        <Dialog open={!!selectedEmail} onOpenChange={() => setSelectedEmail(null)}>
          <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl">
            <DialogHeader className="border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-200">
                  {selectedEmail.id} • {selectedEmail.category}
                </Badge>
                <span className="text-xs text-slate-500 font-mono">{selectedEmail.received_at}</span>
              </div>
              <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
                {selectedEmail.subject}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedEmail.supplier_name}</span> ({selectedEmail.sender_email})
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              {/* Product Context Banner */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">
                  Product Affected: <strong className="text-slate-900 dark:text-slate-100">{selectedEmail.product_name}</strong> ({selectedEmail.product_sku})
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedEmail(null);
                      router.push("/supplier-returns");
                    }}
                    className="h-7 text-[11px] font-bold text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-500/20 cursor-pointer"
                  >
                    <Undo2 className="mr-1 h-3 w-3" /> Supplier Return
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedEmail(null);
                      router.push("/purchase-orders");
                    }}
                    className="h-7 text-[11px] font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 cursor-pointer"
                  >
                    <ShoppingCart className="mr-1 h-3 w-3" /> Purchase Order
                  </Button>
                </div>
              </div>

              {/* Message Body */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-950/40 rounded-xl border border-slate-200/80 dark:border-white/10 text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-800 dark:text-slate-200">
                {selectedEmail.message}
              </div>

              {/* Reply Box */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  Reply / Resolution Notes:
                </label>
                <Textarea
                  rows={3}
                  placeholder="Type your response to the supplier or internal resolution notes..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-xl text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 border-t border-slate-200 dark:border-white/10 pt-4">
              <Button variant="ghost" onClick={() => setSelectedEmail(null)}>
                Close
              </Button>
              <Button
                onClick={handleSendReply}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl cursor-pointer"
              >
                <Send className="mr-2 h-4 w-4" /> Send Reply & Resolve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Log New Supplier Issue Modal */}
      <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Log Supplier Email / Issue Ticket
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Record incoming supplier email notices or product defect correspondence.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 text-xs">
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Supplier Name *</label>
              <Select
                value={logForm.supplier_name}
                onValueChange={(val) => {
                  const found = suppliers.find((s) => s.name === val);
                  setLogForm((prev) => ({
                    ...prev,
                    supplier_name: val,
                    sender_email: found?.email || prev.sender_email
                  }));
                }}
              >
                <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-xl h-10">
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-xs">
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                  <SelectItem value="Fresh Foods Ltd">Fresh Foods Ltd</SelectItem>
                  <SelectItem value="Global Beverages Co">Global Beverages Co</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Product Affected (optional)</label>
              <Select
                value={logForm.product_name}
                onValueChange={(val) => setLogForm((prev) => ({ ...prev, product_name: val }))}
              >
                <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-xl h-10">
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-xs">
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.name}>{p.name} ({p.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Category</label>
                <Select
                  value={logForm.category}
                  onValueChange={(val) => setLogForm((prev) => ({ ...prev, category: val }))}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 text-xs">
                    <SelectItem value="Product Defect">⚠️ Product Defect</SelectItem>
                    <SelectItem value="Delivery Delay">🚚 Delivery Delay</SelectItem>
                    <SelectItem value="Price Dispute">💷 Price Dispute</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Priority</label>
                <Select
                  value={logForm.priority}
                  onValueChange={(val) => setLogForm((prev) => ({ ...prev, priority: val }))}
                >
                  <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 text-xs">
                    <SelectItem value="high">🔴 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">🟢 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Subject / Email Title *</label>
              <Input
                placeholder="e.g., Damaged Carton Notice on PO-1029"
                value={logForm.subject}
                onChange={(e) => setLogForm((prev) => ({ ...prev, subject: e.target.value }))}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-xl h-10"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Email Message / Issue Details *</label>
              <Textarea
                rows={4}
                placeholder="Paste the email message body or write issue details..."
                value={logForm.message}
                onChange={(e) => setLogForm((prev) => ({ ...prev, message: e.target.value }))}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-xl resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsLogModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleLogNewIssue}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl cursor-pointer"
            >
              Record Email / Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
