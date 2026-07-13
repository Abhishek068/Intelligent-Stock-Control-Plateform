"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Warehouse } from
"lucide-react";
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
  TableRow } from
"@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger } from
"@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


import { PageHeader } from "@/components/shared/PageHeader";
import { FilterBar } from "@/components/shared/FilterBar";
import { SearchInput } from "@/components/shared/SearchInput";
import { StatsGrid } from "@/components/shared/StatsGrid";


import { locationsApi } from "@/lib/api";
import { useRoleAccess } from "@/hooks/useRoleAccess";

export default function WarehousesPage() {
  const { canEdit } = useRoleAccess();

  const [warehouses, setWarehouses] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [formData, setFormData] = useState({ name: "", type: "warehouse", address: "", capacity: "" });

  useEffect(() => {
    locationsApi.list().then((locations) =>
    setWarehouses(
      locations.map((l) => ({
        id: String(l.id),
        name: l.name,
        manager: "—",
        capacity: l.capacity ?? 0,
        utilization: 0,
        status: l.is_active ? "active" : "maintenance",
        type: l.location_type,
        address: l.address
      }))
    )
    );
  }, []);

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
        w.id === editingWarehouse.id ?
        { ...w, ...formData, capacity: parseInt(formData.capacity) } :
        w
        )
      );
      toast.success("Warehouse updated");
    } else {
      const newWh = {
        id: `wh-${Date.now()}`,
        ...formData,
        capacity: parseInt(formData.capacity),
        used: 0,
        active: true
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
      capacity: warehouse.capacity.toString()
    });
    setIsDialogOpen(true);
  };

  const stats = {
    total: warehouses.length,
    active: warehouses.filter((w) => w.active).length,
    capacity: warehouses.reduce((s, w) => s + w.capacity, 0)
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Management"
        description="Manage storage locations and capacity"
        actions={
        canEdit &&
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
                    {editingWarehouse ?
                "Update warehouse details" :
                "Enter warehouse details"}
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
                  placeholder="e.g., Warehouse D" />
                
                  </div>
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select
                  value={formData.type}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}>
                  
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
                  placeholder="Full address" />
                
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity (sq ft / units) *</Label>
                    <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) =>
                  setFormData({ ...formData, capacity: e.target.value })
                  }
                  placeholder="e.g., 10000" />
                
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

        } />
      

      <FilterBar resultCount={filtered.length} resultLabel="locations">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search warehouses..." />
        
      </FilterBar>

      <Card className="glass-card">
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
                const utilization = Math.round(wh.used / wh.capacity * 100);
                const color =
                utilization > 90 ?
                "bg-red-500" :
                utilization > 75 ?
                "bg-amber-500" :
                "bg-green-500";
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
                    <TableCell className="text-sm text-slate-400">
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
                            style={{ width: `${Math.min(utilization, 100)}%` }} />
                          
                        </div>
                        <span className="text-xs font-mono">{utilization}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={wh.active ? "bg-green-500" : "bg-slate-400"}>
                        
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
                          {canEdit &&
                          <>
                              <DropdownMenuItem onClick={() => openEditDialog(wh)}>
                                <Pencil className="mr-2 h-3 w-3" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggle(wh.id)}>
                                {wh.active ? "🔴 Deactivate" : "🟢 Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(wh.id)}>
                              
                                <Trash2 className="mr-2 h-3 w-3" /> Delete
                              </DropdownMenuItem>
                            </>
                          }
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>);

              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <StatsGrid
        columns={3}
        stats={[
        { label: "Total Warehouses", value: stats.total },
        { label: "Active", value: stats.active, color: "green" },
        { label: "Total Capacity", value: stats.capacity.toLocaleString(), color: "teal" }]
        } />
      
    </div>);

}
