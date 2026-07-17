"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Play,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

import { PageHeader } from "@/components/shared/PageHeader";
import { StatsGrid } from "@/components/shared/StatsGrid";
import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput } from "@/components/shared/SearchInput";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { stockApi, locationsApi, usersApi } from "@/lib/api";
import { ApiError, unwrapList } from "@/lib/api/client";

const statusColors = {
  scheduled: "bg-blue-500",
  in_progress: "bg-amber-500",
  completed: "bg-green-500",
  cancelled: "bg-slate-500",
};

const statusIcons = {
  scheduled: Clock,
  in_progress: AlertTriangle,
  completed: CheckCircle,
  cancelled: XCircle,
};

function StockTakePageContent() {
  const { isSuperAdmin, hasPermission } = useRoleAccess();
  const canCreate = isSuperAdmin || hasPermission("stock_take", "create");
  const canEdit = isSuperAdmin || hasPermission("stock_take", "edit");
  const canApprove = isSuperAdmin || hasPermission("stock_take", "approve");
  const canDelete = isSuperAdmin || hasPermission("stock_take", "delete");

  const [schedules, setSchedules] = useState([]);
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTake, setActiveTake] = useState(null);
  const [countDraft, setCountDraft] = useState({});
  const [formData, setFormData] = useState({
    locationId: "",
    scheduledDate: "",
    assignedUserId: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [takes, locs, userRes] = await Promise.all([
        stockApi.listStockTakes(),
        locationsApi.list().catch(() => []),
        usersApi.list().catch(() => ({ results: [] })),
      ]);
      setSchedules(takes);
      setLocations(locs);
      setUsers(unwrapList(userRes));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to load stock-takes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = schedules.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      String(s.location_name || "").toLowerCase().includes(q) ||
      String(s.assigned_to_name || "").toLowerCase().includes(q) ||
      String(s.id).includes(q);
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: schedules.length,
    scheduled: schedules.filter((s) => s.status === "scheduled").length,
    in_progress: schedules.filter((s) => s.status === "in_progress").length,
    completed: schedules.filter((s) => s.status === "completed").length,
  };

  const handleSubmit = async () => {
    if (!formData.locationId || !formData.scheduledDate) {
      toast.error("Location and scheduled date are required");
      return;
    }
    setSaving(true);
    try {
      await stockApi.createStockTake({
        location: Number(formData.locationId),
        scheduled_date: formData.scheduledDate,
        assigned_to: formData.assignedUserId
          ? Number(formData.assignedUserId)
          : null,
      });
      toast.success("Stock-take scheduled");
      setIsDialogOpen(false);
      setFormData({ locationId: "", scheduledDate: "", assignedUserId: "" });
      load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const openTake = async (id) => {
    try {
      const res = await stockApi.getStockTake(id);
      const data = res?.data || res;
      setActiveTake(data);
      const draft = {};
      (data.lines || []).forEach((line) => {
        draft[line.id] =
          line.counted_qty != null ? String(line.counted_qty) : String(line.system_qty);
      });
      setCountDraft(draft);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Failed to load take");
    }
  };

  const runAction = async (id, action) => {
    try {
      if (action === "start") await stockApi.startStockTake(id);
      if (action === "cancel") await stockApi.cancelStockTake(id);
      if (action === "delete") await stockApi.deleteStockTake(id);
      if (action === "complete") await stockApi.completeStockTake(id, true);
      toast.success("Updated");
      await load();
      if (action !== "delete" && activeTake?.id === id) {
        await openTake(id);
      } else if (action === "delete") {
        setActiveTake(null);
      }
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Action failed");
    }
  };

  const saveCounts = async () => {
    if (!activeTake) return;
    const counts = Object.entries(countDraft).map(([lineId, qty]) => ({
      line_id: Number(lineId),
      counted_qty: parseInt(qty, 10) || 0,
    }));
    try {
      const res = await stockApi.recordStockTakeCounts(activeTake.id, counts);
      const data = res?.data || res;
      setActiveTake(data);
      toast.success("Counts saved");
      load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Save failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock-take"
        description="Schedule counts, record variances, and post adjustments"
        actions={
          canCreate && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Schedule
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Schedule stock-take</DialogTitle>
                  <DialogDescription>
                    Creates a scheduled count for one location. Start it to snapshot system qty.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="grid gap-2">
                    <Label>Location *</Label>
                    <Select
                      value={formData.locationId}
                      onValueChange={(v) =>
                        setFormData((s) => ({ ...s, locationId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={String(l.id)}>
                            {l.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Scheduled date *</Label>
                    <Input
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) =>
                        setFormData((s) => ({
                          ...s,
                          scheduledDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Assigned to</Label>
                    <Select
                      value={formData.assignedUserId}
                      onValueChange={(v) =>
                        setFormData((s) => ({ ...s, assignedUserId: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.full_name || u.email || u.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving ? "Saving..." : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <StatsGrid
        stats={[
          { label: "Total", value: stats.total, color: "blue" },
          { label: "Scheduled", value: stats.scheduled, color: "slate" },
          { label: "In progress", value: stats.in_progress, color: "amber" },
          { label: "Completed", value: stats.completed, color: "green" },
        ]}
      />

      <Card className="glass-card">
        <CardContent className="p-4 space-y-4">
          <FilterBar>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search location or assignee..."
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400">
                    Loading...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-400">
                    No stock-takes yet
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((s) => {
                const Icon = statusIcons[s.status] || Clock;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">#{s.id}</TableCell>
                    <TableCell>{s.location_name}</TableCell>
                    <TableCell>{s.scheduled_date}</TableCell>
                    <TableCell>{s.assigned_to_name || "—"}</TableCell>
                    <TableCell className="text-sm text-slate-400">
                      {s.counted_items ?? 0}/{s.expected_items ?? 0}
                      {s.variance_items ? (
                        <span className="ml-2 text-amber-500">
                          {s.variance_items} var
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[s.status] || "bg-slate-500"}>
                        <Icon className="mr-1 h-3 w-3" />
                        {String(s.status).replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openTake(s.id)}>
                            Open / count
                          </DropdownMenuItem>
                          {canEdit && s.status === "scheduled" && (
                            <DropdownMenuItem onClick={() => runAction(s.id, "start")}>
                              <Play className="mr-2 h-4 w-4" /> Start
                            </DropdownMenuItem>
                          )}
                          {canApprove && s.status === "in_progress" && (
                            <DropdownMenuItem
                              onClick={() => runAction(s.id, "complete")}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" /> Complete
                            </DropdownMenuItem>
                          )}
                          {canApprove &&
                            ["scheduled", "in_progress"].includes(s.status) && (
                              <DropdownMenuItem
                                onClick={() => runAction(s.id, "cancel")}
                              >
                                <XCircle className="mr-2 h-4 w-4" /> Cancel
                              </DropdownMenuItem>
                            )}
                          {canDelete && s.status === "scheduled" && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => runAction(s.id, "delete")}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {activeTake && (
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>
                Count · {activeTake.location_name} (#{activeTake.id})
              </CardTitle>
              <CardDescription>
                System qty was snapped when started. Completing posts adjustments for
                variances.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {canEdit && activeTake.status === "scheduled" && (
                <Button size="sm" onClick={() => runAction(activeTake.id, "start")}>
                  <Play className="mr-2 h-4 w-4" /> Start
                </Button>
              )}
              {canEdit && activeTake.status === "in_progress" && (
                <Button size="sm" variant="outline" onClick={saveCounts}>
                  <Save className="mr-2 h-4 w-4" /> Save counts
                </Button>
              )}
              {canApprove && activeTake.status === "in_progress" && (
                <Button size="sm" onClick={() => runAction(activeTake.id, "complete")}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Complete & adjust
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setActiveTake(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(!activeTake.lines || activeTake.lines.length === 0) && (
              <p className="text-sm text-slate-400">
                {activeTake.status === "scheduled"
                  ? "Start this stock-take to load product lines."
                  : "No lines."}
              </p>
            )}
            {activeTake.lines?.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">System</TableHead>
                    <TableHead className="text-right">Counted</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTake.lines.map((line) => {
                    const counted =
                      countDraft[line.id] != null
                        ? parseInt(countDraft[line.id], 10) || 0
                        : line.counted_qty;
                    const variance =
                      counted != null && !Number.isNaN(counted)
                        ? counted - line.system_qty
                        : line.variance;
                    return (
                      <TableRow key={line.id}>
                        <TableCell>{line.product_name}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {line.product_sku}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {line.system_qty}
                        </TableCell>
                        <TableCell className="text-right">
                          {activeTake.status === "in_progress" && canEdit ? (
                            <Input
                              className="ml-auto h-8 w-24 text-right"
                              type="number"
                              min="0"
                              value={countDraft[line.id] ?? ""}
                              onChange={(e) =>
                                setCountDraft((d) => ({
                                  ...d,
                                  [line.id]: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            <span className="font-mono">
                              {line.counted_qty ?? "—"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${
                            variance
                              ? variance > 0
                                ? "text-green-500"
                                : "text-red-500"
                              : "text-slate-400"
                          }`}
                        >
                          {variance == null ? "—" : variance > 0 ? `+${variance}` : variance}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function StockTakePage() {
  return (
    <ModuleGate module="stock_take" action="view">
      <StockTakePageContent />
    </ModuleGate>
  );
}
