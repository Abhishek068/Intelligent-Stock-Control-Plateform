"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, Warehouse } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatsGrid } from "@/components/shared/StatsGrid";
import { locationsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRoleAccess } from "@/hooks/useRoleAccess";

export default function WarehousesPage() {
  const { canEdit, isSuperAdmin, hasPermission } = useRoleAccess();
  const canManage =
    isSuperAdmin ||
    hasPermission("products", "create") ||
    hasPermission("products", "edit") ||
    canEdit;

  const [warehouses, setWarehouses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "warehouse",
    address: "",
    capacity: "",
  });

  const mapLocation = (l) => ({
    id: String(l.id),
    name: l.name,
    capacity: l.capacity ?? 0,
    status: l.is_active ? "active" : "inactive",
    type: l.location_type,
    address: l.address || "",
    is_active: l.is_active,
  });

  const load = useCallback(async () => {
    try {
      const locations = await locationsApi.list();
      setWarehouses(locations.map(mapLocation));
    } catch {
      setWarehouses([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = warehouses.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id) => {
    try {
      await locationsApi.delete(id);
      toast.success("Location deleted");
      load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Delete failed");
    }
  };

  const handleToggle = async (wh) => {
    try {
      await locationsApi.update(wh.id, { is_active: !wh.is_active });
      toast.success("Status updated");
      load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Update failed");
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const payload = {
      name: formData.name,
      location_type: formData.type === "retail" ? "store" : formData.type,
      address: formData.address,
      capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
      is_active: true,
    };
    try {
      if (editingWarehouse) {
        await locationsApi.update(editingWarehouse.id, payload);
        toast.success("Location updated");
      } else {
        await locationsApi.create(payload);
        toast.success("Location added");
      }
      setIsDialogOpen(false);
      setEditingWarehouse(null);
      setFormData({ name: "", type: "warehouse", address: "", capacity: "" });
      load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      name: warehouse.name,
      type: warehouse.type || "warehouse",
      address: warehouse.address || "",
      capacity: warehouse.capacity ? String(warehouse.capacity) : "",
    });
    setIsDialogOpen(true);
  };

  const stats = {
    total: warehouses.length,
    active: warehouses.filter((w) => w.is_active).length,
    capacity: warehouses.reduce((s, w) => s + (Number(w.capacity) || 0), 0),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Management"
        description="Manage storage locations and capacity"
        actions={
          canManage && (
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                  setEditingWarehouse(null);
                  setFormData({
                    name: "",
                    type: "warehouse",
                    address: "",
                    capacity: "",
                  });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Plus className="mr-2 h-4 w-4" /> Add Location
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingWarehouse ? "Edit Location" : "Add Location"}
                  </DialogTitle>
                  <DialogDescription>
                    Locations are used for stock in, out, transfers, and PO receive.
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
                        <SelectItem value="store">Store</SelectItem>
                        <SelectItem value="office">Office</SelectItem>
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
                    <Label>Capacity (units)</Label>
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
                  <Button onClick={handleSubmit} disabled={saving}>
                    {saving ? "Saving..." : editingWarehouse ? "Update" : "Create"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <StatsGrid
        stats={[
          { label: "Locations", value: stats.total, color: "blue" },
          { label: "Active", value: stats.active, color: "green" },
          { label: "Total capacity", value: stats.capacity, color: "amber" },
        ]}
      />

      <Card className="glass-card">
        <CardContent className="p-4 space-y-4">
          <FilterBar>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search locations..."
            />
          </FilterBar>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 5 : 4}
                    className="text-center text-slate-400"
                  >
                    No locations yet
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((wh) => (
                <TableRow key={wh.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Warehouse className="h-4 w-4 text-slate-400" />
                      {wh.name}
                    </div>
                    {wh.address && (
                      <p className="text-xs text-slate-500 mt-0.5">{wh.address}</p>
                    )}
                  </TableCell>
                  <TableCell className="capitalize">{wh.type}</TableCell>
                  <TableCell>{wh.capacity || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        wh.is_active ? "bg-green-600" : "bg-slate-500"
                      }
                    >
                      {wh.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => openEditDialog(wh)}>
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggle(wh)}>
                            {wh.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(wh.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
