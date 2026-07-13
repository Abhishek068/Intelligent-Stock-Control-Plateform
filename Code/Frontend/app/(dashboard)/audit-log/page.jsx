"use client";

import { useEffect, useState, useMemo } from "react";
import {
  User,
  FileText,
  Shield,
  ShieldAlert,
  Eye,
  Download,
  AlertTriangle } from
"lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent } from
"@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger } from
"@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput } from "@/components/shared/SearchInput";

import { auditApi } from "@/lib/api";
import { useExcelExport } from "@/hooks/useExcelExport";

const actionColors = {
  "Stock In": "text-green-600 bg-green-50 border-green-200",
  "Stock Out": "text-blue-600 bg-blue-50 border-blue-200",
  Adjustment: "text-amber-600 bg-amber-50 border-amber-200"
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [anomalyFilter, setAnomalyFilter] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState(null);

  const { exportToExcel } = useExcelExport();

  useEffect(() => {
    auditApi.list().then((logs) =>
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
        isAnomaly: e.action === "Adjustment"
      }))
    )
    );
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
  }, [searchQuery, userFilter, actionFilter, anomalyFilter]);

  const handleExport = () => {
    const data = filtered.map((e) => ({
      Timestamp: e.timestamp,
      User: e.user,
      Action: e.action,
      Entity: e.entityName,
      Before: e.before,
      After: e.after,
      Anomaly: e.isAnomaly ? "Yes" : "No"
    }));
    exportToExcel(data, `audit-log-${new Date().toISOString().split("T")[0]}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Immutable record of all activities"
        actions={
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
            <Badge variant="secondary">
              <Shield className="mr-1 h-3 w-3" /> Immutable
            </Badge>
          </div>
        } />
      

      <FilterBar resultCount={filtered.length} resultLabel="entries">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search logs..." />
        
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-[130px]">
            <User className="mr-2 h-3 w-3" />
            <SelectValue placeholder="User" />
          </SelectTrigger>
          <SelectContent>
            {users.map((u) =>
            <SelectItem key={u} value={u}>
                {u === "all" ? "All" : u}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[140px]">
            <FileText className="mr-2 h-3 w-3" />
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            {actions.map((a) =>
            <SelectItem key={a} value={a}>
                {a === "all" ? "All" : a}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <Select value={anomalyFilter} onValueChange={setAnomalyFilter}>
          <SelectTrigger className="w-[130px]">
            <ShieldAlert className="mr-2 h-3 w-3" />
            <SelectValue placeholder="Anomaly" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="anomaly">Anomalies</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>

      <Card className="glass-card">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="text-center">Before</TableHead>
                <TableHead className="text-center">After</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) =>
              <TableRow
                key={entry.id}
                className={entry.isAnomaly ? "bg-red-50/30" : ""}>
                
                  <TableCell className="text-xs font-mono">
                    {entry.timestamp}
                  </TableCell>
                  <TableCell>{entry.user}</TableCell>
                  <TableCell>
                    <Badge
                    className={
                    actionColors[entry.action] || "bg-slate-900/50 border"
                    }>
                    
                      {entry.action}
                    </Badge>
                  </TableCell>
                  <TableCell>{entry.entityName}</TableCell>
                  <TableCell className="text-center font-mono">
                    {entry.before || "—"}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {entry.after || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {entry.isAnomaly ?
                  <Badge variant="destructive">
                        <AlertTriangle className="mr-1 h-3 w-3" /> Anomaly
                      </Badge> :

                  <Badge variant="outline" className="text-green-600">
                        Normal
                      </Badge>
                  }
                  </TableCell>
                  <TableCell>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedEntry(entry)}>
                        
                          <Eye className="h-4 w-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="right">
                        <SheetHeader>
                          <SheetTitle>Audit Details</SheetTitle>
                        </SheetHeader>
                        {selectedEntry &&
                      <div className="mt-6 space-y-4">
                            <div className="rounded-lg bg-slate-900/50 p-4">
                              <div className="grid grid-cols-2 gap-1 text-sm">
                                <span className="font-medium">Timestamp:</span>
                                <span>{selectedEntry.timestamp}</span>
                                <span className="font-medium">User:</span>
                                <span>{selectedEntry.user}</span>
                                <span className="font-medium">Action:</span>
                                <span>{selectedEntry.action}</span>
                                <span className="font-medium">Before:</span>
                                <span>{selectedEntry.before}</span>
                                <span className="font-medium">After:</span>
                                <span>{selectedEntry.after}</span>
                              </div>
                            </div>
                            {selectedEntry.isAnomaly &&
                        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                                <p className="flex items-center gap-2 font-medium text-red-700">
                                  <AlertTriangle className="h-4 w-4" /> Anomaly
                                  Detected
                                </p>
                              </div>
                        }
                          </div>
                      }
                      </SheetContent>
                    </Sheet>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Alert className="border-white/10 bg-slate-900/50">
        <Shield className="h-4 w-4 text-teal-600" />
        <AlertTitle> Immutable Audit Trail</AlertTitle>
        <AlertDescription>
          This log is append‑only and cannot be edited or deleted.
        </AlertDescription>
      </Alert>
    </div>);

}
