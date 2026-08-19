"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { 
  Layers, 
  RefreshCw, 
  Search, 
  Archive, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Zap, 
  Sparkles,
  DollarSign,
  Building2,
  PackageCheck,
  Star,
  Info,
  X
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { stockApi, locationsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";

function expiryBadge(days, status) {
  if (days === null || days === undefined) {
    return (
      <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20 px-3 py-1 text-xs font-semibold">
        No expiry
      </Badge>
    );
  }
  if (days < 0) {
    return (
      <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/40 px-3 py-1 text-xs font-bold animate-pulse">
        Expired {-days}d ago
      </Badge>
    );
  }
  if (days <= 7) {
    return (
      <Badge className="bg-red-50 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/40 px-3 py-1 text-xs font-bold animate-pulse">
        ⚠️ {days}d left (≤7d)
      </Badge>
    );
  }
  if (days <= 15) {
    return (
      <Badge className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 px-3 py-1 text-xs font-bold">
        ⚡ {days}d left (≤15d)
      </Badge>
    );
  }
  if (days <= 30) {
    return (
      <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 px-3 py-1 text-xs font-semibold">
        ⏳ {days}d left (≤30d)
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 px-3 py-1 text-xs font-semibold">
      ✓ {days}d left
    </Badge>
  );
}

function BatchesPageContent() {
  const [batches, setBatches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedBatch, setSelectedBatch] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { active_only: true };
      if (locationFilter !== "all") params.location = locationFilter;

      const [rows, locs, sumRes] = await Promise.all([
        stockApi.listBatches(params),
        locationsApi.list().catch(() => []),
        stockApi.getExpirySummary().catch(() => null),
      ]);

      setBatches(rows);
      setLocations(locs);
      if (sumRes?.data) {
        setSummary(sumRes.data);
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to load batch data");
    } finally {
      setLoading(false);
    }
  }, [locationFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTriggerScan = async () => {
    setScanning(true);
    try {
      const res = await stockApi.triggerExpiryScan();
      const count = res?.data?.alerts || 0;
      toast.success(res?.message || `Expiry scan completed. ${count} alert(s) evaluated.`);
      await loadData();
    } catch (error) {
      toast.error("Failed to run expiry scan.");
    } finally {
      setScanning(false);
    }
  };

  const counts = useMemo(() => {
    let expired = summary?.expired_count;
    let critical = summary?.critical_count;
    let warning = summary?.warning_count;
    let attention = summary?.attention_count;
    let healthy = summary?.healthy_count;
    let total = summary?.total_batches ?? batches.length;
    let value = summary?.total_value;

    if (expired == null && batches.length > 0) {
      expired = batches.filter((b) => b.days_to_expiry !== null && b.days_to_expiry !== undefined && b.days_to_expiry < 0).length;
    }
    if (critical == null && batches.length > 0) {
      critical = batches.filter((b) => b.days_to_expiry !== null && b.days_to_expiry !== undefined && b.days_to_expiry >= 0 && b.days_to_expiry <= 7).length;
    }
    if (warning == null && batches.length > 0) {
      warning = batches.filter((b) => b.days_to_expiry !== null && b.days_to_expiry !== undefined && b.days_to_expiry > 7 && b.days_to_expiry <= 15).length;
    }
    if (attention == null && batches.length > 0) {
      attention = batches.filter((b) => b.days_to_expiry !== null && b.days_to_expiry !== undefined && b.days_to_expiry > 15 && b.days_to_expiry <= 30).length;
    }
    if (healthy == null && batches.length > 0) {
      healthy = batches.filter((b) => b.days_to_expiry === null || b.days_to_expiry === undefined || b.days_to_expiry > 30).length;
    }
    if (value == null && batches.length > 0) {
      value = batches.reduce((s, b) => s + (Number(b.unit_cost || 0) * Number(b.quantity_on_hand || 0)), 0);
    }

    return {
      total: total || 0,
      expired: expired || 0,
      critical: critical || 0,
      warning: warning || 0,
      attention: attention || 0,
      healthy: healthy || 0,
      value: value || 0,
    };
  }, [summary, batches]);

  const filtered = batches.filter((b) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchSearch =
        (b.batch_number || "").toLowerCase().includes(q) ||
        (b.product_name || "").toLowerCase().includes(q) ||
        (b.product_sku || "").toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    if (statusTab === "all") return true;

    if (b.expiry_status) {
      if (statusTab === "expired") return b.expiry_status === "expired";
      if (statusTab === "critical") return b.expiry_status === "critical";
      if (statusTab === "warning") return b.expiry_status === "warning";
      if (statusTab === "attention") return b.expiry_status === "attention";
      if (statusTab === "healthy") return b.expiry_status === "healthy" || b.expiry_status === "no_expiry";
    }

    const days = b.days_to_expiry;
    if (statusTab === "expired") return days !== null && days !== undefined && days < 0;
    if (statusTab === "critical") return days !== null && days !== undefined && days >= 0 && days <= 7;
    if (statusTab === "warning") return days !== null && days !== undefined && days > 7 && days <= 15;
    if (statusTab === "attention") return days !== null && days !== undefined && days > 15 && days <= 30;
    if (statusTab === "healthy") return days === null || days === undefined || days > 30;

    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
   
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-72 h-72 bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-indigo-50 dark:bg-gradient-to-br dark:from-indigo-500/30 dark:to-purple-500/30 rounded-2xl border border-indigo-200 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
              <Archive className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-slate-50 dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                  Batches & Expiry Tracking
                </h1>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/40 text-xs px-2.5 py-0.5 font-bold">
                  FIFO / FEFO Enforced
                </Badge>
              </div>
              <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-sm leading-relaxed mt-1">
                Monitor stock lot expiry windows, enforce FIFO/FEFO dispatch rules, and trigger automated alerts at 30, 15, and 7 days.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            onClick={handleTriggerScan}
            disabled={scanning}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl px-5 h-11 shadow-md border border-amber-400/30 transition-all cursor-pointer"
          >
            <Zap className={`mr-2 h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning Expiry..." : "Run Expiry Scan"}
          </Button>

          <Button 
            variant="outline"
            onClick={loadData} 
            disabled={loading}
            className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 rounded-xl transition-all shadow-sm h-11 cursor-pointer"
          >
            <RefreshCw className={`mr-2 h-4 w-4 text-indigo-600 dark:text-indigo-400 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

   
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Lots Card */}
        <Card
          onClick={() => {
            setStatusTab("all");
            toast.info("Showing all stock lots");
          }}
          className={`border bg-white/90 dark:bg-slate-900/50 backdrop-blur-xl p-4 rounded-2xl shadow-sm relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all duration-200 ${
            statusTab === "all"
              ? "ring-2 ring-indigo-500 border-indigo-500 shadow-indigo-500/10"
              : "border-slate-200/80 dark:border-white/10 hover:border-indigo-300 dark:hover:border-indigo-500/40"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">
            <span>Total Lots</span>
            <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{counts.total.toLocaleString()}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Valued at £{Number(counts.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </Card>

        {/* Expired Card */}
        <Card
          onClick={() => {
            setStatusTab("expired");
            toast.warning("Filtered to Expired lots (Blocked from issuance)");
          }}
          className={`border bg-rose-50 dark:bg-rose-500/10 backdrop-blur-xl p-4 rounded-2xl shadow-sm relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all duration-200 ${
            statusTab === "expired"
              ? "ring-2 ring-rose-500 border-rose-500 shadow-rose-500/20"
              : "border-rose-200 dark:border-rose-500/30 hover:border-rose-400"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 font-bold mb-1">
            <span>Expired</span>
            <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-rose-900 dark:text-rose-200">{counts.expired.toLocaleString()}</div>
          <div className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-1 font-semibold">Blocked from issuance</div>
        </Card>

        {/* Critical ≤7d Card */}
        <Card
          onClick={() => {
            setStatusTab("critical");
            toast.warning("Filtered to Critical lots (≤7 days expiry)");
          }}
          className={`border bg-red-50 dark:bg-red-500/10 backdrop-blur-xl p-4 rounded-2xl shadow-sm relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all duration-200 ${
            statusTab === "critical"
              ? "ring-2 ring-red-500 border-red-500 shadow-red-500/20"
              : "border-red-200 dark:border-red-500/30 hover:border-red-400"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-red-700 dark:text-red-300 font-bold mb-1">
            <span>Critical ≤7d</span>
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-900 dark:text-red-200">{counts.critical.toLocaleString()}</div>
          <div className="text-[11px] text-red-700/80 dark:text-red-400/80 mt-1 font-semibold">Priority dispatch</div>
        </Card>

        {/* Warning ≤15d Card */}
        <Card
          onClick={() => {
            setStatusTab("warning");
            toast.info("Filtered to Warning lots (≤15 days expiry)");
          }}
          className={`border bg-amber-50 dark:bg-amber-500/10 backdrop-blur-xl p-4 rounded-2xl shadow-sm relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all duration-200 ${
            statusTab === "warning"
              ? "ring-2 ring-amber-500 border-amber-500 shadow-amber-500/20"
              : "border-amber-200 dark:border-amber-500/30 hover:border-amber-400"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300 font-bold mb-1">
            <span>Warning ≤15d</span>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-900 dark:text-amber-200">{counts.warning.toLocaleString()}</div>
          <div className="text-[11px] text-amber-800/80 dark:text-amber-400/80 mt-1 font-semibold">High priority</div>
        </Card>

        {/* Attention ≤30d Card */}
        <Card
          onClick={() => {
            setStatusTab("attention");
            toast.info("Filtered to Attention lots (≤30 days expiry)");
          }}
          className={`border bg-blue-50 dark:bg-blue-500/10 backdrop-blur-xl p-4 rounded-2xl shadow-sm relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all duration-200 ${
            statusTab === "attention"
              ? "ring-2 ring-blue-500 border-blue-500 shadow-blue-500/20"
              : "border-blue-200 dark:border-blue-500/30 hover:border-blue-400"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-bold mb-1">
            <span>Attention ≤30d</span>
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-900 dark:text-blue-200">{counts.attention.toLocaleString()}</div>
          <div className="text-[11px] text-blue-700/80 dark:text-blue-400/80 mt-1 font-semibold">Monitor window</div>
        </Card>

        {/* Healthy (>30d) Card */}
        <Card
          onClick={() => {
            setStatusTab("healthy");
            toast.success("Filtered to Healthy lots (>30 days expiry)");
          }}
          className={`border bg-emerald-50 dark:bg-emerald-500/10 backdrop-blur-xl p-4 rounded-2xl shadow-sm relative overflow-hidden group cursor-pointer hover:scale-[1.02] transition-all duration-200 ${
            statusTab === "healthy"
              ? "ring-2 ring-emerald-500 border-emerald-500 shadow-emerald-500/20"
              : "border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-400"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 font-bold mb-1">
            <span>Healthy (&gt;30d)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-900 dark:text-emerald-200">{counts.healthy.toLocaleString()}</div>
          <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1 font-semibold">Normal shelf life</div>
        </Card>
      </div>

    
      <Card className="border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-2xl overflow-hidden rounded-2xl relative w-full">
        <CardContent className="p-0">
      
          <div className="px-6 py-5 border-b border-slate-200/80 dark:border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 dark:bg-slate-950/40 relative z-10">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-slate-200 font-bold text-lg">
              <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" /> 
              Active Stock Batches
              <Badge variant="outline" className="ml-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10">
                {filtered.length} visible
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 text-xs font-medium bg-amber-50 dark:bg-slate-950/60 px-4 py-2 rounded-xl border border-amber-200 dark:border-white/10 shadow-xs">
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span className="text-amber-800 dark:text-amber-300 font-bold">FEFO Pick</span>
                <span className="text-slate-500">= Recommended Issue Batch</span>
              </div>
            </div>
          </div>

         
          <div className="p-6 border-b border-slate-200/80 dark:border-white/10 flex flex-col lg:flex-row gap-4 items-center justify-between relative z-10 bg-slate-50/30 dark:bg-slate-900/20">
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
             
              <div className="relative w-full sm:w-80 group">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors" />
                <Input
                  placeholder="Search batch #, SKU, or product..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-white dark:bg-slate-950/60 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl h-10 w-full"
                />
              </div>
            </div>

           
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-950/60 p-1.5 rounded-xl border border-slate-200 dark:border-white/10 w-full lg:w-auto">
              {[
                { key: "all", label: "All" },
                { key: "expired", label: "Expired" },
                { key: "critical", label: "≤7d" },
                { key: "warning", label: "≤15d" },
                { key: "attention", label: "≤30d" },
                { key: "healthy", label: "Healthy" },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  size="sm"
                  variant={statusTab === tab.key ? "default" : "ghost"}
                  onClick={() => setStatusTab(tab.key)}
                  className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusTab === tab.key
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

      
          <div className="overflow-x-auto relative z-10">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-white/10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 pl-6 font-bold text-slate-700 dark:text-slate-300">Batch Number</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Product / SKU</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Qty on Hand</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Expiry Date</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Status & Priority</TableHead>
                  <TableHead className="py-4 text-center font-bold text-slate-700 dark:text-slate-300 pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 dark:text-slate-400 py-16">
                      <div className="animate-pulse flex items-center justify-center gap-3">
                        <RefreshCw className="h-5 w-5 animate-spin text-indigo-500 dark:text-indigo-400" />
                        <span className="font-bold">Loading batch inventory...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 dark:text-slate-400 py-16">
                      <div className="flex flex-col items-center justify-center">
                        <Archive className="h-12 w-12 text-slate-400 mb-3" />
                        <p className="text-base font-bold text-slate-700 dark:text-slate-300">No matching batches found.</p>
                        <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or receive new stock with batch details.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((b) => (
                    <TableRow 
                      key={b.id} 
                      onClick={() => setSelectedBatch(b)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200/60 dark:border-white/5 cursor-pointer group"
                    >
                     
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-500/15 dark:border-indigo-500/30 dark:text-indigo-300 font-mono text-sm font-bold shadow-xs">
                            {b.batch_number}
                          </div>
                          {b.is_fifo_recommended && (
                            <Badge className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 text-[10px] px-1.5 py-0.5 font-bold flex items-center gap-1">
                              <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> FEFO Pick
                            </Badge>
                          )}
                        </div>
                      </TableCell>
 
                      <TableCell>
                        <div className="font-bold text-slate-900 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">{b.product_name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium mt-0.5">{b.product_sku}</div>
                      </TableCell>

                      <TableCell className="font-bold text-slate-900 dark:text-slate-100 font-mono text-base">
                        {b.quantity_on_hand?.toLocaleString()}
                      </TableCell>
 
                      <TableCell className="whitespace-nowrap">
                        <span className="text-slate-800 dark:text-slate-300 flex items-center gap-1.5 text-sm font-medium whitespace-nowrap">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          {b.expiry_date || "No Expiry"}
                        </span>
                      </TableCell>
 
                      <TableCell>
                        {expiryBadge(b.days_to_expiry, b.expiry_status)}
                      </TableCell>
 
                      <TableCell className="text-center pr-6">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBatch(b);
                          }}
                          className="h-8 px-3 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-slate-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold cursor-pointer"
                        >
                          View Lot
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
 
      {selectedBatch && (
        <Dialog open={!!selectedBatch} onOpenChange={() => setSelectedBatch(null)}>
          <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 backdrop-blur-2xl shadow-2xl rounded-2xl max-w-lg">
            <DialogHeader className="border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-500/20 rounded-xl border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                    <Archive className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">Lot Details</DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      Batch #{selectedBatch.batch_number}
                    </DialogDescription>
                  </div>
                </div>
                {expiryBadge(selectedBatch.days_to_expiry, selectedBatch.expiry_status)}
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-white/10 text-sm">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Product</span>
                  <p className="font-bold text-slate-900 dark:text-slate-200 mt-0.5">{selectedBatch.product_name}</p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 font-semibold">{selectedBatch.product_sku}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Supplier</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">{selectedBatch.supplier_name || "N/A"}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Quantity On Hand</span>
                  <p className="font-bold text-indigo-600 dark:text-indigo-300 text-base mt-0.5 font-mono">{selectedBatch.quantity_on_hand} units</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Unit Cost</span>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">£{Number(selectedBatch.unit_cost || 0).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Value</span>
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">£{(Number(selectedBatch.unit_cost || 0) * (selectedBatch.quantity_on_hand || 0)).toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-white/10 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Expiry Date:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-200">{selectedBatch.expiry_date || "No Expiry Date"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Days Remaining:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-300 font-mono">
                    {selectedBatch.days_to_expiry !== null ? `${selectedBatch.days_to_expiry} day(s)` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">FEFO Rank Priority:</span>
                  <span>
                    {selectedBatch.is_fifo_recommended ? (
                      <Badge className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40 text-xs font-bold">
                        ⭐ FEFO Top Recommendation
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Standard Queue</span>
                    )}
                  </span>
                </div>
              </div>

              {selectedBatch.days_to_expiry !== null && selectedBatch.days_to_expiry < 0 && (
                <div className="p-3 bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 rounded-xl text-rose-800 dark:text-rose-200 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <div>
                    <strong className="font-bold block">Expired Batch Notice</strong>
                    This batch expired {Math.abs(selectedBatch.days_to_expiry)} days ago. Standard stock issuance is blocked for this lot.
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function BatchesPage() {
  return (
    <ModuleGate module="stock_in" action="view">
      <BatchesPageContent />
    </ModuleGate>
  );
}
