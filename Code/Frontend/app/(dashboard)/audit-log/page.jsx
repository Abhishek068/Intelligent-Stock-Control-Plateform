"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  User,
  FileText,
  Shield,
  ShieldAlert,
  Eye,
  Download,
  Calendar,
  AlertTriangle, 
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const mockAuditLog = [
  {
    id: "1",
    timestamp: "2026-07-03 10:32:15",
    user: "Admin",
    userRole: "admin",
    action: "Stock In",
    entityType: "Product",
    entityId: "1",
    entityName: "Wireless Mouse",
    before: "12",
    after: "32",
    details: "Received 20 units",
    ipAddress: "192.168.1.100",
    isAnomaly: false,
  },
  {
    id: "2",
    timestamp: "2026-07-03 09:45:22",
    user: "Staff01",
    userRole: "staff",
    action: "Stock Out",
    entityType: "Product",
    entityId: "4",
    entityName: "Keyboard Wired",
    before: "8",
    after: "3",
    details: "Issued 5 units",
    ipAddress: "192.168.1.101",
    isAnomaly: false,
  },
  {
    id: "3",
    timestamp: "2026-07-02 16:20:08",
    user: "Admin",
    userRole: "admin",
    action: "Adjustment",
    entityType: "Product",
    entityId: "2",
    entityName: "USB-C Cable",
    before: "15",
    after: "5",
    details: "Physical count discrepancy",
    ipAddress: "192.168.1.100",
    isAnomaly: true,
    anomalyScore: 78,
  },
];

const actionColors = {
  "Stock In": "text-green-600 bg-green-50 border-green-200",
  "Stock Out": "text-blue-600 bg-blue-50 border-blue-200",
  Adjustment: "text-amber-600 bg-amber-50 border-amber-200",
};

export default function AuditLogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [anomalyFilter, setAnomalyFilter] = useState("all");
  const [selectedEntry, setSelectedEntry] = useState(null);

  const users = useMemo(
    () => ["all", ...new Set(mockAuditLog.map((e) => e.user))],
    []
  );
  const actions = useMemo(
    () => ["all", ...new Set(mockAuditLog.map((e) => e.action))],
    []
  );

  const filtered = useMemo(() => {
    let filtered = mockAuditLog;
    if (searchQuery) {
      filtered = filtered.filter(
        (e) =>
          e.user.includes(searchQuery) ||
          e.entityName.includes(searchQuery) ||
          e.action.includes(searchQuery)
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

  const exportToExcel = () => {
    const data = filtered.map((e) => ({
      Timestamp: e.timestamp,
      User: e.user,
      Action: e.action,
      Entity: e.entityName,
      Before: e.before,
      After: e.after,
      Anomaly: e.isAnomaly ? " Yes" : " No",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AuditLog");
    XLSX.writeFile(
      wb,
      `audit-log-${new Date().toISOString().split("T")[0]}.xlsx`
    );
    toast.success("Exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Log</h1>
          <p className="text-slate-500">Immutable record of all activities</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Badge variant="secondary">
            <Shield className="mr-1 h-3 w-3" /> Immutable
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-[130px]">
                <User className="mr-2 h-3 w-3" />
                <SelectValue placeholder="User" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u === "all" ? "All" : u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[140px]">
                <FileText className="mr-2 h-3 w-3" />
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                {actions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a === "all" ? "All" : a}
                  </SelectItem>
                ))}
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
            <span className="ml-auto text-sm text-slate-400">
              {filtered.length} entries
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
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
              {filtered.map((entry) => (
                <TableRow
                  key={entry.id}
                  className={entry.isAnomaly ? "bg-red-50/30" : ""}
                >
                  <TableCell className="text-xs font-mono">
                    {entry.timestamp}
                  </TableCell>
                  <TableCell>{entry.user}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        actionColors[entry.action] || "bg-slate-50 border"
                      }
                    >
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
                    {entry.isAnomaly ? (
                      <Badge variant="destructive">
                        <AlertTriangle className="mr-1 h-3 w-3" /> Anomaly
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600">
                        Normal
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedEntry(entry)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="right">
                        <SheetHeader>
                          <SheetTitle>Audit Details</SheetTitle>
                        </SheetHeader>
                        {selectedEntry && (
                          <div className="mt-6 space-y-4">
                            <div className="rounded-lg bg-slate-50 p-4">
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
                            {selectedEntry.isAnomaly && (
                              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                                <p className="flex items-center gap-2 font-medium text-red-700">
                                  <AlertTriangle className="h-4 w-4" /> Anomaly
                                  Detected
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </SheetContent>
                    </Sheet>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Alert className="border-slate-200 bg-slate-50">
        <Shield className="h-4 w-4 text-teal-600" />
        <AlertTitle> Immutable Audit Trail</AlertTitle>
        <AlertDescription>
          This log is append‑only and cannot be edited or deleted.
        </AlertDescription>
      </Alert>
    </div>
  );
}