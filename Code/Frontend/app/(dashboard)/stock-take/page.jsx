"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { useUserStore } from "@/lib/store";

const mockSchedules = [
  {
    id: "st-1",
    location: "Warehouse A - Main",
    locationId: "wh-1",
    scheduledDate: "2026-07-15",
    assignedUser: "Staff01",
    status: "scheduled",
    expectedItems: 45,
    countedItems: 0,
  },
  {
    id: "st-2",
    location: "Warehouse B - North",
    locationId: "wh-2",
    scheduledDate: "2026-07-10",
    assignedUser: "Staff02",
    status: "in_progress",
    expectedItems: 28,
    countedItems: 15,
  },
  {
    id: "st-3",
    location: "Store Room 1",
    locationId: "wh-3",
    scheduledDate: "2026-06-28",
    assignedUser: "Staff01",
    status: "completed",
    expectedItems: 12,
    countedItems: 12,
  },
];

const mockLocations = [
  { id: "wh-1", name: "Warehouse A - Main" },
  { id: "wh-2", name: "Warehouse B - North" },
  { id: "wh-3", name: "Store Room 1" },
];

const mockUsers = ["Staff01", "Staff02", "Staff03"];

const statusColors = {
  scheduled: "bg-blue-500",
  in_progress: "bg-amber-500",
  completed: "bg-green-500",
};

const statusIcons = {
  scheduled: <Clock className="mr-1 h-3 w-3" />,
  in_progress: <AlertTriangle className="mr-1 h-3 w-3" />,
  completed: <CheckCircle className="mr-1 h-3 w-3" />,
};

export default function StockTakePage() {
  const { role } = useUserStore();
  const canEdit = role === "admin" || role === "manager";

  const [schedules, setSchedules] = useState(mockSchedules);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    locationId: "",
    scheduledDate: "",
    assignedUserId: "",
  });

  const filtered = schedules.filter((s) => {
    const matchesSearch =
      s.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.assignedUser.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = () => {
    if (!formData.locationId || !formData.scheduledDate || !formData.assignedUserId) {
      toast.error("Please fill in all required fields");
      return;
    }
    const location = mockLocations.find((l) => l.id === formData.locationId);
    const newSchedule = {
      id: `st-${Date.now()}`,
      location: location?.name || "Unknown",
      locationId: formData.locationId,
      scheduledDate: formData.scheduledDate,
      assignedUser: formData.assignedUserId,
      status: "scheduled",
      expectedItems: 0,
      countedItems: 0,
    };
    setSchedules([newSchedule, ...schedules]);
    setIsDialogOpen(false);
    setFormData({ locationId: "", scheduledDate: "", assignedUserId: "" });
    toast.success("Stock-take scheduled");
  };

  const handleDelete = (id) => {
    setSchedules(schedules.filter((s) => s.id !== id));
    toast.success("Schedule deleted");
  };

  const handleStatusUpdate = (id, newStatus) => {
    setSchedules(
      schedules.map((s) =>
        s.id === id ? { ...s, status: newStatus } : s
      )
    );
    toast.success(`Status updated to ${newStatus}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Stock-take Scheduling
          </h1>
          <p className="text-slate-500">Plan and track physical inventory counts (R8)</p>
        </div>
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="mr-2 h-4 w-4" /> Schedule Stock-take
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Stock-take</DialogTitle>
                <DialogDescription>
                  Assign a team member to count inventory at a location.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Location *</Label>
                  <Select
                    value={formData.locationId}
                    onValueChange={(v) =>
                      setFormData({ ...formData, locationId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockLocations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) =>
                      setFormData({ ...formData, scheduledDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Assigned Staff *</Label>
                  <Select
                    value={formData.assignedUserId}
                    onValueChange={(v) =>
                      setFormData({ ...formData, assignedUserId: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockUsers.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
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
                <Button onClick={handleSubmit} className="bg-teal-600">
                  Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search location or staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-auto text-sm text-slate-400">
            {filtered.length} schedules
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Location</TableHead>
                <TableHead>Assigned Staff</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead className="text-center">Expected Items</TableHead>
                <TableHead className="text-center">Counted</TableHead>
                <TableHead className="text-center">Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => {
                const progress = s.expectedItems > 0
                  ? Math.round((s.countedItems / s.expectedItems) * 100)
                  : 0;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {s.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" />
                        {s.assignedUser}
                      </div>
                    </TableCell>
                    <TableCell>{s.scheduledDate}</TableCell>
                    <TableCell className="text-center font-mono">
                      {s.expectedItems}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {s.countedItems}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-slate-200">
                          <div
                            className="h-1.5 rounded-full bg-teal-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono">{progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[s.status]}>
                        {statusIcons[s.status]}
                        {s.status === "in_progress"
                          ? "In Progress"
                          : s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {canEdit && s.status !== "completed" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleStatusUpdate(s.id, "in_progress")}
                              >
                                <AlertTriangle className="mr-2 h-3 w-3" /> Start Count
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleStatusUpdate(s.id, "completed")}
                              >
                                <CheckCircle className="mr-2 h-3 w-3" /> Complete
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem>
                            <Pencil className="mr-2 h-3 w-3" /> Edit
                          </DropdownMenuItem>
                          {canEdit && (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(s.id)}
                            >
                              <Trash2 className="mr-2 h-3 w-3" /> Delete
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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Scheduled</p>
            <p className="text-2xl font-bold">{schedules.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Pending</p>
            <p className="text-2xl font-bold text-blue-600">
              {schedules.filter((s) => s.status === "scheduled").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">In Progress</p>
            <p className="text-2xl font-bold text-amber-600">
              {schedules.filter((s) => s.status === "in_progress").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Completed</p>
            <p className="text-2xl font-bold text-green-600">
              {schedules.filter((s) => s.status === "completed").length}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}