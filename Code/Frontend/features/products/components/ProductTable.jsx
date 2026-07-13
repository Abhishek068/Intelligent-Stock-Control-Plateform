"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable } from
"@tanstack/react-table";
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow } from
"@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { productsApi, analyticsApi, categoriesApi, suppliersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { SearchInput } from "@/components/shared/SearchInput";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle } from
"@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
"@/components/ui/select";

const emptyProductForm = {
  sku: "",
  name: "",
  category: "",
  supplier: "",
  unit_price: "",
  minimum_level: 10,
  reorder_level: 20,
  barcode: ""
};

export function ProductTable() {
  const router = useRouter();
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState([]);
  const [columnFilters, setColumnFilters] = React.useState([]);
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingRow, setEditingRow] = React.useState(null);
  const [form, setForm] = React.useState(emptyProductForm);
  const [categories, setCategories] = React.useState([]);
  const [suppliers, setSuppliers] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const { canEdit } = useRoleAccess();

  const loadProducts = React.useCallback(async () => {
    setLoading(true);
    try {
      const [products, recommendations] = await Promise.all([
      productsApi.list(),
      analyticsApi.listRecommendations().catch(() => [])]
      );
      const recByProduct = Object.fromEntries(recommendations.map((r) => [r.product, r]));
      setData(
        products.map((p) => {
          const rec = recByProduct[p.id];
          return {
            id: String(p.id),
            sku: p.sku,
            name: p.name,
            category: p.category_name,
            categoryId: p.category,
            supplier: p.supplier_name,
            supplierId: p.supplier,
            stock: p.stock,
            status: p.status,
            price: Number(p.unit_price),
            minimum_level: p.minimum_level,
            reorder_level: p.reorder_level,
            barcode: p.barcode,
            forecastDemand: rec ? Number(rec.predicted_demand) : "—",
            recommendedReorder: rec ? rec.suggested_quantity : "—",
            leadTime: rec ? rec.lead_time_days : p.reorder_level
          };
        })
      );
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  React.useEffect(() => {
    if (dialogOpen && canEdit) {
      Promise.all([categoriesApi.list(), suppliersApi.list()]).then(([c, s]) => {
        setCategories(c);
        setSuppliers(s);
      });
    }
  }, [dialogOpen, canEdit]);

  const openCreate = () => {
    setEditingRow(null);
    setForm(emptyProductForm);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditingRow(row);
    setForm({
      sku: row.sku,
      name: row.name,
      category: String(row.categoryId),
      supplier: String(row.supplierId),
      unit_price: String(row.price),
      minimum_level: row.minimum_level,
      reorder_level: row.reorder_level,
      barcode: row.barcode || ""
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.sku.trim() || !form.name.trim() || !form.category || !form.supplier) {
      toast.error("SKU, name, category and supplier are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        sku: form.sku,
        name: form.name,
        category: Number(form.category),
        supplier: Number(form.supplier),
        unit_price: form.unit_price || "0",
        minimum_level: Number(form.minimum_level),
        reorder_level: Number(form.reorder_level),
        barcode: form.barcode,
        is_active: true
      };
      if (editingRow) {
        await productsApi.update(editingRow.id, payload);
        toast.success("Product updated");
      } else {
        await productsApi.create(payload);
        toast.success("Product created");
      }
      setDialogOpen(false);
      loadProducts();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (!confirm(`Delete product "${row.name}"?`)) return;
    try {
      await productsApi.delete(row.id);
      toast.success("Product deleted");
      loadProducts();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Delete failed");
    }
  };

  const columns = React.useMemo(
    () => [
    {
      accessorKey: "sku",
      header: ({ column }) =>
      <Button variant="ghost" onClick={() => column.toggleSorting()} className="h-8 px-2 text-xs">
            SKU <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>,

      cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("sku")}</div>
    },
    {
      accessorKey: "name",
      header: "Product Name",
      cell: ({ row }) =>
      <Link
        href={`/products/${row.original.id}`}
        className="flex items-center gap-2 hover:text-teal-600">
        
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
                {row.getValue("name")?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{row.getValue("name")}</span>
          </Link>

    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => <Badge variant="outline">{row.getValue("category")}</Badge>
    },
    {
      accessorKey: "supplier",
      header: "Supplier",
      cell: ({ row }) => <span className="text-sm">{row.getValue("supplier")}</span>
    },
    {
      accessorKey: "stock",
      header: ({ column }) =>
      <Button variant="ghost" onClick={() => column.toggleSorting()} className="h-8 px-2 text-xs">
            Stock <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>,

      cell: ({ row }) => {
        const stock = row.getValue("stock");
        const status = row.original.status;
        return (
          <div className="flex items-center gap-2">
              <span className="font-mono font-medium">{stock}</span>
              {status === "critical" &&
            <Badge variant="destructive" className="h-5 px-1 text-[10px]">
                  OOS
                </Badge>
            }
              {status === "low" &&
            <Badge variant="warning" className="h-5 px-1 text-[10px] bg-amber-500 text-white">
                  Low
                </Badge>
            }
            </div>);

      }
    },
    {
      accessorKey: "forecastDemand",
      header: "Forecast",
      cell: ({ row }) => <span className="font-mono text-sm">{row.getValue("forecastDemand")}</span>
    },
    {
      accessorKey: "recommendedReorder",
      header: "Reorder Qty",
      cell: ({ row }) =>
      <span className="font-mono text-sm text-teal-600">{row.getValue("recommendedReorder")}</span>

    },
    {
      id: "actions",
      cell: ({ row }) =>
      <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push(`/products/${row.original.id}`)}>
                View details
              </DropdownMenuItem>
              {canEdit &&
          <>
                  <DropdownMenuItem onClick={() => openEdit(row.original)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem
              className="text-red-600"
              onClick={() => handleDelete(row.original)}>
              
                    Delete
                  </DropdownMenuItem>
                </>
          }
            </DropdownMenuContent>
          </DropdownMenu>

    }],

    [canEdit, router, openEdit, handleDelete]
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter
    },
    onGlobalFilterChange: setGlobalFilter
  });

  return (
    <Card className="border-slate-800 bg-card text-card-foreground p-6 shadow-sm">
      <CardContent className="p-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
        <SearchInput
            value={globalFilter ?? ""}
            onChange={(val) => setGlobalFilter(val)}
            placeholder="Search products..." />
          
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Columns <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table.
                getAllColumns().
                filter((column) => column.getCanHide()).
                map((column) =>
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}>
                  
                    {column.id === "actions" ? "Actions" : column.id === "riskScore" ? "Risk Score" : column.id}
                  </DropdownMenuCheckboxItem>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
          {canEdit &&
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700" onClick={openCreate}>
              + Add Product
            </Button>
            }
        </div>
      </div>

      <div className="rounded-md border border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) =>
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) =>
                <TableHead key={header.id} className="py-2">
                    {header.isPlaceholder ?
                  null :
                  flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                )}
              </TableRow>
              )}
          </TableHeader>
          <TableBody>
            {loading ?
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Loading products...
                </TableCell>
              </TableRow> :
              table.getRowModel().rows?.length ?
              table.getRowModel().rows.map((row) =>
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) =>
                <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                )}
                </TableRow>
              ) :

              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
              }
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-slate-400">
          Showing {table.getRowModel().rows.length} of {data.length} products
        </div>
        <div className="flex items-center gap-2">
          <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}>
              
            Previous
          </Button>
          <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}>
              
            Next
          </Button>
        </div>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRow ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div>
              <Label>SKU *</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) =>
                  <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supplier *</Label>
              <Select value={form.supplier} onValueChange={(v) => setForm({ ...form, supplier: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) =>
                  <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit Price (£)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
              
            </div>
            <div>
              <Label>Barcode</Label>
              <Input
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
              
            </div>
            <div>
              <Label>Minimum Level</Label>
              <Input
                type="number"
                value={form.minimum_level}
                onChange={(e) =>
                setForm({ ...form, minimum_level: parseInt(e.target.value) || 0 })
                } />
              
            </div>
            <div>
              <Label>Reorder Level</Label>
              <Input
                type="number"
                value={form.reorder_level}
                onChange={(e) =>
                setForm({ ...form, reorder_level: parseInt(e.target.value) || 0 })
                } />
              
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingRow ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>);

}
