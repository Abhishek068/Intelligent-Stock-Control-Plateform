"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Warehouse,
  Package,
  MapPin,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useUserStore } from "@/lib/store";

const mockWarehouses = [
  { id: "wh-1", name: "Warehouse A - Main", type: "warehouse", address: "123 Main St, London", capacity: 10000, used: 7200, active: true },
  { id: "wh-2", name: "Warehouse B - North", type: "warehouse", address: "456 Industrial Park, Manchester", capacity: 8000, used: 4500, active: true },
  { id: "wh-3", name: "Store Room 1", type: "store", address: "Building 2, London", capacity: 2000, used: 1800, active: true },
  { id: "wh-4", name: "Warehouse C - South", type: "warehouse", address: "789 Business Park, Birmingham", capacity: 12000, used: 3000, active: false },
];

export default function WarehousesPage() {
  const { role } = useUserStore();
  const canEdit = role === "admin" || role === "manager";

  const [warehouses, setWarehouses] = useState(mockWarehouses);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({ name: "", type: "warehouse", address: "", capacity: "" });

  const filtered = warehouses.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id) => {
    setWarehouses(warehouses.filter((w) => w.id !== id));
    toast.success("Warehouse deleted");
  };

  const handleToggle = (id) => {
    setWarehouses(
      warehouses.map((w) =>
        w.id === id ? { ...w, active: !w.active } : w
      )
    );
    toast.success("Status updated");
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.capacity) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (editingWarehouse) {
      setWarehouses(
        warehouses.map((w) =>
          w.id === editingWarehouse.id
            ? { ...w, ...formData, capacity: parseInt(formData.capacity) }
            : w
        )
      );
      toast.success("Warehouse updated");
    } else {
      const newWh = {
        id: `wh-${Date.now()}`,
        ...formData,
        capacity: parseInt(formData.capacity),
        used: 0,
        active: true,
      };
      setWarehouses([...warehouses, newWh]);
      toast.success("Warehouse added");
    }
    setIsDialogOpen(false);
    setEditingWarehouse(null);
    setFormData({ name: "", type: "warehouse", address: "", capacity: "" });
  };

  const openEditDialog = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      type: warehouse.type,
      address: warehouse.address || "",
      capacity: warehouse.capacity.toString(),
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Warehouse Management
          </h1>
          <p className="text-slate-500">Manage storage locations and capacity</p>
        </div>
        {canEdit && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="mr-2 h-4 w-4" /> Add Warehouse
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingWarehouse ? "Edit Warehouse" : "Add Warehouse"}
                </DialogTitle>
                <DialogDescription>
                  {editingWarehouse
                    ? "Update warehouse details"
                    : "Enter warehouse details"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Warehouse D"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="store">Store Room</SelectItem>
                      <SelectItem value="retail">Retail Location</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Full address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Capacity (sq ft / units) *</Label>
                  <Input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({ ...formData, capacity: e.target.value })
                    }
                    placeholder="e.g., 10000"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="bg-teal-600">
                  {editingWarehouse ? "Update" : "Create"}
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
              placeholder="Search warehouses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="ml-auto text-sm text-slate-400">
            {filtered.length} locations
          </span>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-center">Capacity</TableHead>
                <TableHead className="text-center">Used</TableHead>
                <TableHead className="text-center">Utilization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((wh) => {
                const utilization = Math.round((wh.used / wh.capacity) * 100);
                const color =
                  utilization > 90
                    ? "bg-red-500"
                    : utilization > 75
                    ? "bg-amber-500"
                    : "bg-green-500";
                return (
                  <TableRow key={wh.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-slate-400" />
                        {wh.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {wh.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {wh.address || "—"}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {wh.capacity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center font-mono">
                      {wh.used.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-slate-200">
                          <div
                            className={`h-1.5 rounded-full ${color}`}
                            style={{ width: `${Math.min(utilization, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono">{utilization}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={wh.active ? "bg-green-500" : "bg-slate-400"}
                      >
                        {wh.active ? "Active" : "Inactive"}
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
                          {canEdit && (
                            <>
                              <DropdownMenuItem onClick={() => openEditDialog(wh)}>
                                <Pencil className="mr-2 h-3 w-3" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggle(wh.id)}>
                                {wh.active ? "🔴 Deactivate" : "🟢 Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDelete(wh.id)}
                              >
                                <Trash2 className="mr-2 h-3 w-3" /> Delete
                              </DropdownMenuItem>
                            </>
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Warehouses</p>
            <p className="text-2xl font-bold">{warehouses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {warehouses.filter((w) => w.active).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">Total Capacity</p>
            <p className="text-2xl font-bold text-teal-600">
              {warehouses.reduce((s, w) => s + w.capacity, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}