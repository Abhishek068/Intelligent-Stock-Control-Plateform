"use client";

import { useCallback, useEffect, useState } from "react";
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
      <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 px-3 py-1 text-xs font-semibold">
        No expiry
      </Badge>
    );
  }
  if (days < 0) {
    return (
      <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)] px-3 py-1 text-xs font-bold animate-pulse">
        Expired {-days}d ago
      </Badge>
    );
  }
  if (days <= 7) {
    return (
      <Badge className="bg-red-500/20 text-red-300 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.3)] px-3 py-1 text-xs font-bold animate-pulse">
        ⚠️ {days}d left (≤7d)
      </Badge>
    );
  }
  if (days <= 15) {
    return (
      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 px-3 py-1 text-xs font-semibold">
        ⚡ {days}d left (≤15d)
      </Badge>
    );
  }
  if (days <= 30) {
    return (
      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 px-3 py-1 text-xs font-medium">
        ⏳ {days}d left (≤30d)
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-3 py-1 text-xs font-medium">
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

  const filtered = batches.filter((b) => {
    
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchSearch =
        (b.batch_number || "").toLowerCase().includes(q) ||
        (b.product_name || "").toLowerCase().includes(q) ||
        (b.product_sku || "").toLowerCase().includes(q);
      if (!matchSearch) return false;
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
            <div className="p-3 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 rounded-2xl border border-indigo-500/40 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.25)]">
              <Archive className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Batches & Expiry Tracking (R5)
                </h1>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/40 text-xs px-2.5 py-0.5">
                  FIFO / FEFO Enforced
                </Badge>
              </div>
              <p className="text-slate-400 max-w-2xl text-sm leading-relaxed mt-1">
                Monitor stock lot expiry windows, enforce FIFO/FEFO dispatch rules, and trigger automated alerts at 30, 15, and 7 days.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            onClick={handleTriggerScan}
            disabled={scanning}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl px-5 h-11 shadow-lg shadow-amber-500/25 border border-amber-400/30 transition-all hover:scale-[1.02]"
          >
            <Zap className={`mr-2 h-4 w-4 ${scanning ? "animate-spin" : "animate-bounce"}`} />
            {scanning ? "Scanning Expiry..." : "Run Expiry Scan"}
          </Button>

          <Button 
            variant="outline"
            onClick={loadData} 
            disabled={loading}
            className="bg-slate-900/60 border-white/10 hover:bg-white/10 text-slate-200 hover:text-white backdrop-blur-xl rounded-xl transition-all shadow-lg h-11"
          >
            <RefreshCw className={`mr-2 h-4 w-4 text-indigo-400 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

   
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      
        <Card className="border border-white/10 bg-slate-900/50 backdrop-blur-xl p-4 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all" />
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Total Lots</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-slate-100">{summary?.total_batches ?? batches.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Valued at ${summary?.total_value?.toLocaleString() ?? "0"}</div>
        </Card>

        
        <Card className="border border-rose-500/30 bg-rose-500/10 backdrop-blur-xl p-4 rounded-2xl shadow-[0_0_15px_rgba(244,63,94,0.1)] relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-rose-300 font-semibold mb-1">
            <span>Expired</span>
            <ShieldAlert className="h-4 w-4 text-rose-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-rose-200">{summary?.expired_count ?? 0}</div>
          <div className="text-[11px] text-rose-400/80 mt-1">Blocked from issuance</div>
        </Card>

      
        <Card className="border border-red-500/30 bg-red-500/10 backdrop-blur-xl p-4 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-red-300 font-semibold mb-1">
            <span>Critical ≤7d</span>
            <AlertTriangle className="h-4 w-4 text-red-400 animate-bounce" />
          </div>
          <div className="text-2xl font-black text-red-200">{summary?.critical_count ?? 0}</div>
          <div className="text-[11px] text-red-400/80 mt-1">Priority dispatch</div>
        </Card>

       
        <Card className="border border-amber-500/30 bg-amber-500/10 backdrop-blur-xl p-4 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-amber-300 font-semibold mb-1">
            <span>Warning ≤15d</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-200">{summary?.warning_count ?? 0}</div>
          <div className="text-[11px] text-amber-400/80 mt-1">High priority</div>
        </Card>

       
        <Card className="border border-blue-500/30 bg-blue-500/10 backdrop-blur-xl p-4 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-blue-300 font-semibold mb-1">
            <span>Attention ≤30d</span>
            <Info className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-200">{summary?.attention_count ?? 0}</div>
          <div className="text-[11px] text-blue-400/80 mt-1">Monitor window</div>
        </Card>

      
        <Card className="border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl p-4 rounded-2xl shadow-lg relative overflow-hidden group">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold mb-1">
            <span>Healthy (&gt;30d)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-200">{summary?.healthy_count ?? 0}</div>
          <div className="text-[11px] text-emerald-400/80 mt-1">Normal shelf life</div>
        </Card>
      </div>

    
      <Card className="border border-white/10 bg-slate-900/40 backdrop-blur-2xl shadow-2xl overflow-hidden rounded-2xl relative w-full">
        <CardContent className="p-0">
      
          <div className="px-6 py-5 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950/40 relative z-10">
            <div className="flex items-center gap-2.5 text-slate-200 font-bold text-lg">
              <Layers className="h-5 w-5 text-indigo-400" /> 
              Active Stock Batches
              <Badge variant="outline" className="ml-2 bg-slate-800 text-slate-300 border-white/10">
                {filtered.length} visible
              </Badge>
            </div>
            
            <div className="flex items-center gap-3 text-xs font-medium bg-slate-950/60 px-4 py-2 rounded-xl border border-white/10 shadow-inner">
              <div className="flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <span className="text-amber-300 font-bold">FEFO Pick</span>
                <span className="text-slate-500">= Recommended Issue Batch</span>
              </div>
            </div>
          </div>

         
          <div className="p-6 border-b border-white/10 flex flex-col lg:flex-row gap-4 items-center justify-between relative z-10 bg-slate-900/20">
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
             
              <div className="relative w-full sm:w-80 group">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
                <Input
                  placeholder="Search batch #, SKU, or product..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-slate-950/60 border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all rounded-xl h-10 w-full"
                />
              </div>

              
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-full sm:w-[200px] bg-slate-950/60 border-white/10 focus:border-indigo-500/50 text-slate-200 rounded-xl h-10">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 shadow-2xl rounded-xl text-slate-200">
                  <SelectItem value="all" className="focus:bg-indigo-500/20 focus:text-indigo-300">All Locations</SelectItem>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)} className="focus:bg-indigo-500/20 focus:text-indigo-300">
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

           
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950/60 p-1.5 rounded-xl border border-white/10 w-full lg:w-auto">
              {[
                { key: "all", label: "All" },
                { key: "expired", label: "Expired", badgeBg: "bg-rose-500/20 text-rose-300" },
                { key: "critical", label: "≤7d", badgeBg: "bg-red-500/20 text-red-300" },
                { key: "warning", label: "≤15d", badgeBg: "bg-amber-500/20 text-amber-300" },
                { key: "attention", label: "≤30d", badgeBg: "bg-blue-500/20 text-blue-300" },
                { key: "healthy", label: "Healthy" },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  size="sm"
                  variant={statusTab === tab.key ? "default" : "ghost"}
                  onClick={() => setStatusTab(tab.key)}
                  className={`h-8 rounded-lg text-xs font-semibold transition-all ${
                    statusTab === tab.key
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

      
          <div className="overflow-x-auto relative z-10">
            <Table>
              <TableHeader className="bg-slate-950/60 border-b border-white/10">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 pl-6 font-bold text-slate-300">Batch Number</TableHead>
                  <TableHead className="py-4 font-bold text-slate-300">Product / SKU</TableHead>
                  <TableHead className="py-4 font-bold text-slate-300">Location</TableHead>
                  <TableHead className="py-4 text-right font-bold text-slate-300 pr-6">Qty on Hand</TableHead>
                  <TableHead className="py-4 font-bold text-slate-300">Expiry Date</TableHead>
                  <TableHead className="py-4 font-bold text-slate-300">Status & Priority</TableHead>
                  <TableHead className="py-4 text-center font-bold text-slate-300 pr-6">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-400 py-16">
                      <div className="animate-pulse flex items-center justify-center gap-3">
                        <RefreshCw className="h-5 w-5 animate-spin text-indigo-400" />
                        <span className="font-semibold">Loading batch inventory...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-slate-400 py-16">
                      <div className="flex flex-col items-center justify-center">
                        <Archive className="h-12 w-12 text-slate-600 mb-3" />
                        <p className="text-base font-semibold text-slate-300">No matching batches found.</p>
                        <p className="text-sm text-slate-500 mt-1">Try adjusting your filters or receive new stock with batch details.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((b) => (
                    <TableRow 
                      key={b.id} 
                      onClick={() => setSelectedBatch(b)}
                      className="hover:bg-slate-800/50 transition-colors border-b border-white/5 cursor-pointer group"
                    >
                     
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-sm font-bold shadow-inner">
                            {b.batch_number}
                          </div>
                          {b.is_fifo_recommended && (
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px] px-1.5 py-0.5 font-bold flex items-center gap-1">
                              <Star className="h-3 w-3 fill-amber-300" /> FEFO Pick
                            </Badge>
                          )}
                        </div>
                      </TableCell>

                     
                      <TableCell>
                        <div className="font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors">{b.product_name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">{b.product_sku}</div>
                      </TableCell>

                    
                      <TableCell>
                        <span className="text-slate-300 flex items-center gap-1.5 text-sm">
                          <Building2 className="h-3.5 w-3.5 text-slate-500" />
                          {b.location_name}
                        </span>
                      </TableCell>

                  
                      <TableCell className="text-right pr-6">
                        <span className="text-lg font-black text-slate-100 font-mono">
                          {b.quantity_on_hand?.toLocaleString()}
                        </span>
                      </TableCell>

                    
                      <TableCell>
                        <span className="text-slate-300 flex items-center gap-1.5 text-sm">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
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
                          className="h-8 px-3 rounded-lg hover:bg-indigo-500/20 hover:text-indigo-300 text-slate-400"
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
          <DialogContent className="bg-slate-900/95 border-white/10 text-slate-100 backdrop-blur-2xl shadow-2xl rounded-2xl max-w-lg">
            <DialogHeader className="border-b border-white/10 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
                    <Archive className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-bold">Lot Details</DialogTitle>
                    <DialogDescription className="text-xs text-slate-400 font-mono mt-0.5">
                      Batch #{selectedBatch.batch_number}
                    </DialogDescription>
                  </div>
                </div>
                {expiryBadge(selectedBatch.days_to_expiry, selectedBatch.expiry_status)}
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-white/10 text-sm">
                <div>
                  <span className="text-xs text-slate-400">Product</span>
                  <p className="font-bold text-slate-200 mt-0.5">{selectedBatch.product_name}</p>
                  <p className="text-xs font-mono text-slate-400">{selectedBatch.product_sku}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Location</span>
                  <p className="font-semibold text-slate-200 mt-0.5">{selectedBatch.location_name}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Supplier</span>
                  <p className="font-semibold text-slate-200 mt-0.5">{selectedBatch.supplier_name || "N/A"}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Quantity On Hand</span>
                  <p className="font-bold text-indigo-300 text-base mt-0.5 font-mono">{selectedBatch.quantity_on_hand} units</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Unit Cost</span>
                  <p className="font-semibold text-slate-200 mt-0.5">${Number(selectedBatch.unit_cost || 0).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Total Value</span>
                  <p className="font-bold text-emerald-400 mt-0.5">${(Number(selectedBatch.unit_cost || 0) * (selectedBatch.quantity_on_hand || 0)).toFixed(2)}</p>
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-white/10 space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs">Expiry Date:</span>
                  <span className="font-bold text-slate-200">{selectedBatch.expiry_date || "No Expiry Date"}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs">Days Remaining:</span>
                  <span className="font-bold text-indigo-300 font-mono">
                    {selectedBatch.days_to_expiry !== null ? `${selectedBatch.days_to_expiry} day(s)` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs">FEFO Rank Priority:</span>
                  <span>
                    {selectedBatch.is_fifo_recommended ? (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs font-bold">
                        ⭐ FEFO Top Recommendation
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">Standard Queue</span>
                    )}
                  </span>
                </div>
              </div>

              {selectedBatch.days_to_expiry !== null && selectedBatch.days_to_expiry < 0 && (
                <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
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
