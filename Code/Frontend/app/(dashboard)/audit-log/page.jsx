"use client";

import { useEffect, useState, useMemo } from "react";
import {
  User,
  FileText,
  Shield,
  ShieldAlert,
  Eye,
  Download,
  AlertTriangle,
  ShieldCheck,
  Search,
  Lock
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

import { auditApi } from "@/lib/api";
import { useExcelExport } from "@/hooks/useExcelExport";

export default function AuditLogPage() {
  const [entries, setEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [anomalyFilter, setAnomalyFilter] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  const { exportToExcel } = useExcelExport();

  useEffect(() => {
    setLoading(true);
    auditApi.list().then((logs) => {
      setEntries(
        logs.map((e) => ({
          id: String(e.id),
          timestamp: new Date(e.created_at).toLocaleString(),
          user: e.user_name,
          userRole: e.user_role,
          action: e.action,
          entityType: e.entity_type,
          entityId: e.entity_id,
          entityName: e.entity_name,
          before: e.before_json ? JSON.stringify(e.before_json) : "",
          after: e.after_json ? JSON.stringify(e.after_json) : "",
          details: e.details,
          ipAddress: e.ip_address,
          isAnomaly: e.action === "Adjustment",
        }))
      );
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const users = useMemo(
    () => ["all", ...new Set(entries.map((e) => e.user))],
    [entries]
  );
  const actions = useMemo(
    () => ["all", ...new Set(entries.map((e) => e.action))],
    [entries]
  );

  const filtered = useMemo(() => {
    let filtered = entries;
    if (searchQuery) {
      filtered = filtered.filter(
        (e) =>
          e.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.entityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          e.action.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (userFilter !== "all") {
      filtered = filtered.filter((e) => e.user === userFilter);
    }
    if (actionFilter !== "all") {
      filtered = filtered.filter((e) => e.action === actionFilter);
    }
    if (anomalyFilter !== "all") {
      filtered = filtered.filter((e) =>
        anomalyFilter === "anomaly" ? e.isAnomaly : !e.isAnomaly
      );
    }
    return filtered.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [entries, searchQuery, userFilter, actionFilter, anomalyFilter]);

  const handleExport = () => {
    const data = filtered.map((e) => ({
      Timestamp: e.timestamp,
      User: e.user,
      Action: e.action,
      Entity: e.entityName,
      Before: e.before,
      After: e.after,
      Anomaly: e.isAnomaly ? "Yes" : "No",
    }));
    exportToExcel(data, `audit-log-${new Date().toISOString().split("T")[0]}`);
  };

  const getActionBadge = (action) => {
    switch (action) {
      case "Stock In":
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 font-bold px-2 py-0.5">Stock In</Badge>;
      case "Stock Out":
        return <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20 font-bold px-2 py-0.5">Stock Out</Badge>;
      case "Adjustment":
        return <Badge className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 font-bold px-2 py-0.5">Adjustment</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20 font-bold px-2 py-0.5">{action}</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-teal-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-teal-50 dark:bg-teal-500/20 rounded-xl border border-teal-200 dark:border-teal-500/30 text-teal-600 dark:text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.15)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-slate-50 dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              Audit Log
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Immutable record of all system activities and data mutations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold">
            <Lock className="h-3.5 w-3.5" /> Immutable
          </Badge>
          <Button 
            onClick={handleExport}
            className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold rounded-xl h-11 px-6 shadow-md border border-teal-500/50 cursor-pointer"
          >
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Card className="border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-[80px] pointer-events-none" />

        {/* Filters Area */}
        <div className="px-8 py-5 border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20 relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="relative w-full lg:max-w-xs group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-600 dark:group-focus-within:text-teal-400 transition-colors" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white dark:bg-slate-950/80 border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl h-10 w-full"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[140px] bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-10">
                <User className="mr-2 h-3.5 w-3.5 text-slate-500" />
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl rounded-xl text-slate-800 dark:text-slate-200">
                {users.map((u) => (
                  <SelectItem key={u} value={u} className="cursor-pointer">
                    {u === "all" ? "All Users" : u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[140px] bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-10">
                <FileText className="mr-2 h-3.5 w-3.5 text-slate-500" />
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl rounded-xl text-slate-800 dark:text-slate-200">
                {actions.map((a) => (
                  <SelectItem key={a} value={a} className="cursor-pointer">
                    {a === "all" ? "All Actions" : a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={anomalyFilter} onValueChange={setAnomalyFilter}>
              <SelectTrigger className="w-[140px] bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-10">
                <ShieldAlert className="mr-2 h-3.5 w-3.5 text-slate-500" />
                <SelectValue placeholder="Anomaly" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl rounded-xl text-slate-800 dark:text-slate-200">
                <SelectItem value="all" className="cursor-pointer">All Statuses</SelectItem>
                <SelectItem value="anomaly" className="text-rose-600 dark:text-rose-400 font-bold cursor-pointer">Anomalies</SelectItem>
                <SelectItem value="normal" className="text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer">Normal</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5 ml-auto">
              {filtered.length} entries
            </span>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto relative z-10">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-white/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 pl-8 font-bold text-slate-700 dark:text-slate-300 w-48">Timestamp</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">User</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Action</TableHead>
                  <TableHead className="py-4 font-bold text-slate-700 dark:text-slate-300">Entity</TableHead>
                  <TableHead className="py-4 text-center font-bold text-slate-700 dark:text-slate-300">Before</TableHead>
                  <TableHead className="py-4 text-center font-bold text-slate-700 dark:text-slate-300">After</TableHead>
                  <TableHead className="py-4 text-center font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
                  <TableHead className="py-4 pr-8 text-right font-bold text-slate-700 dark:text-slate-300">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500 dark:text-slate-400 py-12">
                      <div className="animate-pulse flex items-center justify-center gap-2">
                        <div className="h-4 w-4 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                        Loading audit logs...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500 dark:text-slate-400 py-12">
                      <div className="flex flex-col items-center justify-center">
                        <Shield className="h-10 w-10 text-slate-400 mb-3" />
                        <p className="font-semibold">No audit logs found matching criteria.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className={`transition-colors border-b border-slate-200/60 dark:border-white/5 group ${
                        entry.isAnomaly 
                          ? "bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-500/5 dark:hover:bg-rose-500/10" 
                          : "hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <TableCell className="pl-8 py-3 text-xs font-mono text-slate-600 dark:text-slate-400 font-medium">
                        {entry.timestamp}
                      </TableCell>
                      <TableCell className="text-slate-900 dark:text-slate-200 font-bold">
                        {entry.user}
                      </TableCell>
                      <TableCell>
                        {getActionBadge(entry.action)}
                      </TableCell>
                      <TableCell className="text-slate-800 dark:text-slate-300 text-sm font-medium">
                        {entry.entityName}
                      </TableCell>
                      <TableCell className="text-center text-xs font-mono text-slate-500">
                        {entry.before ? (
                          <div className="max-w-[120px] truncate mx-auto font-medium" title={entry.before}>{entry.before}</div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-center text-xs font-mono text-slate-800 dark:text-slate-300 font-medium">
                        {entry.after ? (
                          <div className="max-w-[120px] truncate mx-auto" title={entry.after}>{entry.after}</div>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.isAnomaly ? (
                          <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 px-2 py-0.5 font-bold">
                            <AlertTriangle className="mr-1 h-3 w-3" /> Anomaly
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-white/5 px-2 py-0.5 font-bold">
                            Normal
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-pointer"
                              onClick={() => setSelectedEntry(entry)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </SheetTrigger>
                          <SheetContent side="right" className="bg-white dark:bg-[#0F172A] border-l border-slate-200 dark:border-teal-500/30 w-full sm:max-w-md p-0 flex flex-col shadow-2xl">
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-500 to-emerald-500" />
                            
                            <SheetHeader className="p-6 border-b border-slate-200 dark:border-white/5 shrink-0">
                              <SheetTitle className="text-teal-700 dark:text-teal-400 flex items-center gap-2 text-xl font-bold">
                                <FileText className="h-5 w-5" />
                                Audit Entry Details
                              </SheetTitle>
                            </SheetHeader>
                            
                            <div className="p-6 overflow-y-auto flex-1">
                              {selectedEntry && (
                                <div className="space-y-6">
                                  {selectedEntry.isAnomaly && (
                                    <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-4 shadow-sm">
                                      <p className="flex items-center gap-2 font-bold text-rose-700 dark:text-rose-400">
                                        <AlertTriangle className="h-5 w-5" /> Anomaly Detected
                                      </p>
                                      <p className="text-sm text-rose-800 dark:text-rose-300 mt-1 font-medium">
                                        This entry represents a manual adjustment which requires attention.
                                      </p>
                                    </div>
                                  )}
                                  
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/80 dark:border-white/5">
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Time</span>
                                      <span className="text-sm font-mono text-slate-800 dark:text-slate-300 font-semibold">{selectedEntry.timestamp}</span>
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/80 dark:border-white/5">
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">User</span>
                                      <span className="text-sm text-slate-900 dark:text-slate-200 font-bold">{selectedEntry.user}</span>
                                    </div>
                                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/80 dark:border-white/5">
                                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Action</span>
                                      <div>{getActionBadge(selectedEntry.action)}</div>
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Before</span>
                                    <pre className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-white/5 text-xs font-mono text-slate-800 dark:text-slate-400 overflow-x-auto whitespace-pre-wrap font-medium">
                                      {selectedEntry.before ? JSON.stringify(JSON.parse(selectedEntry.before), null, 2) : "No previous state"}
                                    </pre>
                                  </div>

                                  <div className="space-y-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">After</span>
                                    <pre className="p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-teal-200 dark:border-teal-500/20 text-xs font-mono text-teal-800 dark:text-teal-300 overflow-x-auto whitespace-pre-wrap font-medium shadow-xs">
                                      {selectedEntry.after ? JSON.stringify(JSON.parse(selectedEntry.after), null, 2) : "No new state"}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          </SheetContent>
                        </Sheet>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Alert className="border-teal-200 dark:border-teal-500/20 bg-teal-50 dark:bg-teal-500/5 backdrop-blur-xl rounded-xl shadow-sm">
        <Shield className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        <AlertTitle className="text-teal-900 dark:text-teal-400 font-bold tracking-wide">Immutable Audit Trail</AlertTitle>
        <AlertDescription className="text-slate-600 dark:text-slate-400 font-medium">
          This log is append-only. It cannot be edited, deleted, or tampered with by any system user.
        </AlertDescription>
      </Alert>
    </div>
  );
}
