"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/shared/SearchInput";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, Layers, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export function AbcStochasticPanel({ data = [], className = "" }) {
  const [search, setSearch] = useState("");
  const [abcFilter, setAbcFilter] = useState("all");

  const filteredData = useMemo(() => {
    return (data || []).filter((p) => {
      const pName = (p.name || "").toLowerCase();
      const pSku = (p.sku || "").toLowerCase();
      const cat = (p.category_name || p.category?.name || "").toLowerCase();
      const q = search.toLowerCase();

      const matchesSearch = pName.includes(q) || pSku.includes(q) || cat.includes(q);
      
      const cls = (p.abc_xyz_class || "AX").toUpperCase();
      let matchesAbc = true;
      if (abcFilter === "A") matchesAbc = cls.startsWith("A");
      else if (abcFilter === "B") matchesAbc = cls.startsWith("B");
      else if (abcFilter === "C") matchesAbc = cls.startsWith("C");

      return matchesSearch && matchesAbc;
    });
  }, [data, search, abcFilter]);

  return (
    <Card className={`border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl rounded-2xl relative w-full max-w-full overflow-hidden ${className}`}>
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />

      <CardHeader className="p-6 border-b border-slate-200/80 dark:border-white/5 pb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                ABC/XYZ Matrix & Stochastic Buffer Intelligence
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Financial inventory classification, safety stock buffers, and dynamic ROP targets
              </CardDescription>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="w-full sm:w-64">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Filter matrix by product or SKU..."
              />
            </div>
            <Select value={abcFilter} onValueChange={setAbcFilter}>
              <SelectTrigger className="w-[160px] bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-10">
                <SelectValue placeholder="ABC Class" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200">
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="A">Class A (High Value)</SelectItem>
                <SelectItem value="B">Class B (Moderate Value)</SelectItem>
                <SelectItem value="C">Class C (Low Value)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto w-full max-w-full">
          <Table className="w-full min-w-[850px]">
            <TableHeader className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800">
              <TableRow className="hover:bg-transparent border-slate-200/80 dark:border-slate-800">
                <TableHead className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">Product Info</TableHead>
                <TableHead className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">Category</TableHead>
                <TableHead className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider text-center">ABC/XYZ Matrix</TableHead>
                <TableHead className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider text-center">Stochastic SS / ROP</TableHead>
                <TableHead className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider text-center">Service Level</TableHead>
                <TableHead className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider text-right">Buffer Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? (
                filteredData.map((p) => {
                  const cls = (p.abc_xyz_class || "AX").toUpperCase();
                  const policy = (p.automated_reorder_policy || "automated").replace("_", " ");
                  const minLvl = Number(p.minimum_level) || 10;
                  const reorderLvl = Number(p.reorder_level) || 20;
                  const stock = Number(p.stock) || 0;
                  const ss = p.stochastic_safety_stock ? p.stochastic_safety_stock : Math.max(3, Math.round(minLvl * 0.45));
                  const rop = p.dynamic_reorder_point ? p.dynamic_reorder_point : Math.max(5, reorderLvl);
                  const sl = p.target_service_level || 98;

                  let bufferBadge = (
                    <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30 text-[11px] gap-1 font-semibold">
                      <CheckCircle2 className="h-3 w-3" /> Healthy Buffer
                    </Badge>
                  );
                  if (stock <= 0) {
                    bufferBadge = (
                      <Badge variant="outline" className="bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30 text-[11px] gap-1 font-semibold">
                        <XCircle className="h-3 w-3" /> Depleted Buffer
                      </Badge>
                    );
                  } else if (stock <= rop) {
                    bufferBadge = (
                      <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 text-[11px] gap-1 font-semibold">
                        <AlertTriangle className="h-3 w-3" /> Reorder Triggered
                      </Badge>
                    );
                  }

                  return (
                    <TableRow key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-200/60 dark:border-slate-800/60">
                      <TableCell className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-200 text-xs">{p.name}</div>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{p.sku}</div>
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                        {p.category_name || p.category?.name || "General"}
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <span
                            className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold font-mono tracking-wider w-10 ${
                              cls.startsWith("A")
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
                                : cls.startsWith("B")
                                ? "bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30"
                                : "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30"
                            }`}
                          >
                            {cls}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">{policy}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-center font-mono text-xs">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-purple-700 dark:text-purple-400 font-semibold bg-purple-50 dark:bg-purple-500/10 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-500/20">
                            SS: {ss}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            ROP: {rop}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-center">
                        <Badge variant="outline" className="bg-cyan-50 border-cyan-200 text-cyan-800 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30 font-mono text-xs font-semibold">
                          <ShieldCheck className="h-3 w-3 mr-1 text-cyan-600 dark:text-cyan-400" /> {sl}% Target SL
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 px-4 text-right">
                        {bufferBadge}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-slate-500 dark:text-slate-400">
                    No matching matrix records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
