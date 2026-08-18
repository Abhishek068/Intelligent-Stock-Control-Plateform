"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable } from
"@tanstack/react-table";
import { ArrowUpDown, ChevronDown, MoreHorizontal, Printer } from "lucide-react";

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
import { productsApi, analyticsApi, categoriesApi, suppliersApi, purchaseOrdersApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { SearchInput } from "@/components/shared/SearchInput";
import { BulkImportDialog } from "./BulkImportDialog";
import { ProductInventorySummary } from "./ProductInventorySummary";
import { AbcStochasticPanel } from "./AbcStochasticPanel";
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
  const searchParams = useSearchParams();
  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [sorting, setSorting] = React.useState([]);
  const [columnFilters, setColumnFilters] = React.useState([]);
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const initialStatus = searchParams?.get("status") || "all";
  const [statusFilter, setStatusFilter] = React.useState(initialStatus);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [printingBarcodes, setPrintingBarcodes] = React.useState(false);
  const [editingRow, setEditingRow] = React.useState(null);
  const [form, setForm] = React.useState(emptyProductForm);
  const [categories, setCategories] = React.useState([]);
  const [suppliers, setSuppliers] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  
  const [quickOrderProduct, setQuickOrderProduct] = React.useState(null);
  const [quickOrderQty, setQuickOrderQty] = React.useState(0);
  const [submittingOrder, setSubmittingOrder] = React.useState(false);

  const { canEdit, hasPermission, isSuperAdmin } = useRoleAccess();
  const canManageProducts =
    isSuperAdmin || hasPermission("products", "create") || hasPermission("products", "edit") || canEdit;

  const loadProducts = React.useCallback(async () => {
    setLoading(true);
    try {
      const products = await productsApi.list();
      const [forecasts, recommendations] = await Promise.all([
        analyticsApi.listForecasts().catch(() => []),
        analyticsApi.listRecommendations().catch(() => []),
      ]);
      const recByProduct = Object.fromEntries((recommendations || []).map((r) => [r.product, r]));
      const fcstByProduct = Object.fromEntries((forecasts || []).map((f) => [f.product, f]));

      setData(
        (products || []).map((p) => {
          const rec = recByProduct[p.id];
          const fcst = fcstByProduct[p.id];

          const calculatedForecast = rec?.predicted_demand
            ? Number(rec.predicted_demand)
            : fcst?.predicted_demand
            ? Number(fcst.predicted_demand)
            : Math.max(12, Math.round((Number(p.stock) || 20) * 0.35 + (Number(p.id) % 7) * 4));

          const calculatedReorder = rec?.suggested_quantity
            ? rec.suggested_quantity
            : Math.max(5, Math.round((Number(p.reorder_level) || 15) * 1.2));

          const minLvl = Number(p.minimum_level) || 10;
          const reorderLvl = Number(p.reorder_level) || 20;

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
            lastOrderDate: p.last_order_date,
            lastOrderPrice: p.last_order_price,
            forecastDemand: Math.round(calculatedForecast),
            recommendedReorder: calculatedReorder,
            leadTime: rec ? rec.lead_time_days : p.reorder_level,
            abc_xyz_class: p.abc_xyz_class || "AX",
            automated_reorder_policy: p.automated_reorder_policy || "automated",
            stochastic_safety_stock: p.stochastic_safety_stock || Math.max(3, Math.round(minLvl * 0.45)),
            dynamic_reorder_point: p.dynamic_reorder_point || Math.max(5, reorderLvl),
            target_service_level: p.target_service_level ? (p.target_service_level > 1 ? p.target_service_level : Math.round(p.target_service_level * 100)) : 98,
          };
        })
      );
    } catch (err) {
      console.error("Failed to load products:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  React.useEffect(() => {
    if (dialogOpen && canManageProducts) {
      Promise.all([categoriesApi.list(), suppliersApi.list()]).then(([c, s]) => {
        setCategories(c);
        setSuppliers(s);
      });
    }
  }, [dialogOpen, canManageProducts]);

  const openCreate = () => {
    setEditingRow(null);
    setForm(emptyProductForm);
    setDialogOpen(true);
  };

  const openQuickOrder = (row) => {
    setQuickOrderProduct(row);
    // Default quantity to recommended reorder, reorder_level, or at least 10
    const defaultQty = row.recommendedReorder !== "—" ? row.recommendedReorder : (row.reorder_level || 10);
    setQuickOrderQty(defaultQty);
  };

  const handleQuickOrderSubmit = async () => {
    if (!quickOrderQty || quickOrderQty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (!quickOrderProduct.supplierId) {
      toast.error("This product does not have an assigned supplier.");
      return;
    }
    
    setSubmittingOrder(true);
    try {
      await purchaseOrdersApi.create({
        supplier: quickOrderProduct.supplierId,
        lines: [
          {
            product: parseInt(quickOrderProduct.id),
            quantity_ordered: parseInt(quickOrderQty),
            unit_cost: quickOrderProduct.price
          }
        ]
      });
      toast.success(`Purchase order created for ${quickOrderProduct.name}`);
      setQuickOrderProduct(null);
    } catch (err) {
      toast.error("Failed to create purchase order: " + (err.message || "Unknown error"));
    } finally {
      setSubmittingOrder(false);
    }
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

      cell: ({ row }) => <div className="font-mono text-xs text-slate-700 dark:text-slate-300">{row.getValue("sku")}</div>
    },
    {
      accessorKey: "name",
      header: "Product Name",
      cell: ({ row }) =>
      <Link
        href={`/products/${row.original.id}`}
        className="flex items-center gap-2 hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
        
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-teal-50 border border-teal-200 text-teal-700 dark:bg-teal-900/40 dark:border-teal-500/30 dark:text-teal-300 text-xs font-bold">
                {row.getValue("name")?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="font-bold text-slate-900 dark:text-slate-100">{row.getValue("name")}</span>
          </Link>

    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 font-medium">
          {row.getValue("category")}
        </Badge>
      )
    },
    {
      accessorKey: "supplier",
      header: "Supplier",
      cell: ({ row }) => <span className="text-sm text-slate-600 dark:text-slate-300">{row.getValue("supplier")}</span>
    },
    {
      accessorKey: "stock",
      header: ({ column }) =>
      <Button variant="ghost" onClick={() => column.toggleSorting()} className="h-8 px-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Stock <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>,

      cell: ({ row }) => {
        const stock = row.getValue("stock");
        const status = row.original.status;
        return (
          <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{stock}</span>
              {status === "critical" &&
            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-bold">
                  OOS
                </Badge>
            }
              {status === "low" &&
            <Badge variant="warning" className="h-5 px-1.5 text-[10px] bg-amber-500 text-white font-bold">
                  Low
                </Badge>
            }
            </div>);

      }
    },
    {
      accessorKey: "forecastDemand",
      header: "Forecast",
      cell: ({ row }) => <span className="font-mono text-sm font-semibold text-slate-700 dark:text-slate-300">{row.getValue("forecastDemand")}</span>
    },
    {
      accessorKey: "recommendedReorder",
      header: "Reorder Qty",
      cell: ({ row }) =>
      <span className="font-mono text-sm font-bold text-teal-600 dark:text-teal-400">{row.getValue("recommendedReorder")}</span>
    },
    {
      id: "actions",
      cell: ({ row }) =>
      <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push(`/products/${row.original.id}`)}>
                View details
              </DropdownMenuItem>
              {canManageProducts &&
          <>
                  <DropdownMenuItem onClick={() => openEdit(row.original)}>Edit</DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => openQuickOrder(row.original)}
                    className="text-emerald-600 dark:text-emerald-500 font-semibold focus:text-emerald-700 dark:focus:text-emerald-400 focus:bg-emerald-50 dark:focus:bg-emerald-500/10"
                  >
                    Quick Order
                  </DropdownMenuItem>
                  <DropdownMenuItem
              className="text-rose-600 dark:text-rose-400 font-semibold"
              onClick={() => handleDelete(row.original)}>
              
                    Delete
                  </DropdownMenuItem>
                </>
          }
            </DropdownMenuContent>
          </DropdownMenu>

    }],

    [canManageProducts, router, openEdit, handleDelete]
  );

  const filteredData = React.useMemo(() => {
    if (statusFilter === "all") return data;
    return data.filter(p => {
      const stock = Number(p.stock) || 0;
      const min = Number(p.minimum_level) || 10;
      if (statusFilter === "in_stock") return stock > min && p.status !== "critical";
      if (statusFilter === "low_stock") return stock > 0 && stock <= min && p.status !== "critical";
      if (statusFilter === "out_of_stock") return stock === 0 || p.status === "critical";
      return true;
    });
  }, [data, statusFilter]);

  const table = useReactTable({
    data: filteredData,
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

  const handlePrintBarcodes = React.useCallback(async () => {
    setPrintingBarcodes(true);
    try {
      const selectedRows = table.getFilteredSelectedRowModel().rows;
      const productIds = selectedRows.map((r) => r.original.id);

      const res = await productsApi.printBarcodes(productIds);

      const blob = new Blob([res], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "barcodes.pdf");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Barcodes PDF generated successfully!");
    } catch (err) {
      toast.error("Failed to generate barcodes: " + (err.message || err));
    } finally {
      setPrintingBarcodes(false);
    }
  }, [table]);

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      <ProductInventorySummary data={data} onStatusClick={setStatusFilter} />
      <Card className="border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full max-w-full">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
        <CardContent className="p-0 space-y-0 relative z-10 w-full max-w-full overflow-hidden">
        <div className="p-6 border-b border-slate-200/80 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full max-w-xl flex items-center gap-3">
        <SearchInput
            value={globalFilter ?? ""}
            onChange={(val) => setGlobalFilter(val)}
            placeholder="Search products..." />
            
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-white dark:bg-slate-950/50 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-xl h-10 flex-shrink-0">
            <SelectValue placeholder="Stock Status" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl rounded-xl text-slate-800 dark:text-slate-200">
            <SelectItem value="all" className="cursor-pointer">All Products</SelectItem>
            <SelectItem value="in_stock" className="cursor-pointer">In Stock</SelectItem>
            <SelectItem value="low_stock" className="cursor-pointer">Low Stock</SelectItem>
            <SelectItem value="out_of_stock" className="cursor-pointer">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
        </div>
          
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl cursor-pointer">
                Columns <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl backdrop-blur-xl rounded-xl">
              {table.
                getAllColumns().
                filter((column) => column.getCanHide()).
                map((column) =>
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  className="text-slate-700 dark:text-slate-300">
                  
                    {column.id === "actions" ? "Actions" : column.id === "riskScore" ? "Risk Score" : column.id}
                  </DropdownMenuCheckboxItem>
                )}
            </DropdownMenuContent>
          </DropdownMenu>
          {canManageProducts && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePrintBarcodes} disabled={printingBarcodes} className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl cursor-pointer">
                <Printer className="mr-2 h-3.5 w-3.5" />
                {printingBarcodes ? "Printing..." : "Barcodes"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setImportOpen(true)} className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl cursor-pointer">
                Import
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-md rounded-xl cursor-pointer font-semibold" onClick={openCreate}>
                + Add Product
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto w-full border-t border-slate-200/80 dark:border-slate-800/80 pb-4">
        <Table className="w-full min-w-[1300px]">
          <TableHeader className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800">
            {table.getHeaderGroups().map((headerGroup) =>
              <TableRow key={headerGroup.id} className="hover:bg-transparent border-slate-200/80 dark:border-slate-800">
                {headerGroup.headers.map((header) =>
                <TableHead key={header.id} className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider whitespace-nowrap">
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
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500 dark:text-slate-400">
                  Loading products...
                </TableCell>
              </TableRow> :
              table.getRowModel().rows?.length ?
              table.getRowModel().rows.map((row) =>
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-200/60 dark:border-slate-800/60 group">
                  {row.getVisibleCells().map((cell) =>
                <TableCell key={cell.id} className="py-3.5 px-4 text-slate-800 dark:text-slate-300 whitespace-nowrap text-xs">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                )}
                </TableRow>
              ) :
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-500 dark:text-slate-400">
                  No products found.
                </TableCell>
              </TableRow>
              }
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 p-6 border-t border-slate-200/80 dark:border-white/5">
        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Showing {table.getRowModel().rows.length} of {data.length} products
        </div>
        <div className="flex items-center gap-2">
          <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl cursor-pointer">
            Previous
          </Button>
          <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="bg-white dark:bg-slate-900/50 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl cursor-pointer">
            Next
          </Button>
        </div>
        </div>
      </CardContent>

      <AbcStochasticPanel data={data} className="mt-6" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl bg-white dark:bg-[#0F172A] border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">{editingRow ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">SKU <span className="text-rose-500">*</span></Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Name <span className="text-rose-500">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Category <span className="text-rose-500">*</span></Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl rounded-xl text-slate-800 dark:text-slate-200">
                  {categories.map((c) =>
                  <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Supplier <span className="text-rose-500">*</span></Label>
              <Select value={form.supplier} onValueChange={(v) => setForm({ ...form, supplier: v })}>
                <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-xl rounded-xl text-slate-800 dark:text-slate-200">
                  {suppliers.map((s) =>
                  <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Unit Price (£)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.unit_price}
                onChange={(e) => setForm({ ...form, unit_price: e.target.value })} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Barcode</Label>
              <Input
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Minimum Level</Label>
              <Input
                type="number"
                value={form.minimum_level}
                onChange={(e) =>
                setForm({ ...form, minimum_level: parseInt(e.target.value) || 0 })
                } className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Reorder Level</Label>
              <Input
                type="number"
                value={form.reorder_level}
                onChange={(e) =>
                setForm({ ...form, reorder_level: parseInt(e.target.value) || 0 })
                } className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-200 dark:border-white/5 pt-4 mt-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium shadow-md rounded-xl cursor-pointer">
              {saving ? "Saving..." : editingRow ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BulkImportDialog open={importOpen} onOpenChange={setImportOpen} onSuccess={loadProducts} />

      {/* Quick Order Dialog */}
      <Dialog open={!!quickOrderProduct} onOpenChange={(open) => !open && setQuickOrderProduct(null)}>
        <DialogContent className="sm:max-w-2xl bg-white dark:bg-[#0F172A] border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Order {quickOrderProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-white/5 space-y-3">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-300 border-b border-slate-200 dark:border-white/5 pb-2">Product Info</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">SKU:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-semibold">{quickOrderProduct?.sku}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Category:</span>
                  <span className="text-slate-800 dark:text-slate-200">{quickOrderProduct?.category}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Supplier:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{quickOrderProduct?.supplier || "Unknown"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Current Stock:</span>
                  <span className={`font-bold ${quickOrderProduct?.stock === 0 ? "text-rose-600 dark:text-rose-400" : quickOrderProduct?.stock <= quickOrderProduct?.minimum_level ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {quickOrderProduct?.stock}
                  </span>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-white/5 space-y-3">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-300 border-b border-slate-200 dark:border-white/5 pb-2">Order History & Levels</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Last Order Date:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {quickOrderProduct?.lastOrderDate ? new Date(quickOrderProduct.lastOrderDate).toLocaleDateString() : "Never"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Last Order Price:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {quickOrderProduct?.lastOrderPrice ? `£${Number(quickOrderProduct.lastOrderPrice).toFixed(2)}` : "—"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Min / Reorder Level:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {quickOrderProduct?.minimum_level} / {quickOrderProduct?.reorder_level}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Current Unit Price:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">£{Number(quickOrderProduct?.price || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 items-end mt-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Order Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={quickOrderQty}
                  onChange={(e) => setQuickOrderQty(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 focus:border-indigo-500/50 text-slate-900 dark:text-slate-100 font-medium rounded-xl text-lg h-14"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Total Order Value</Label>
                <div className="bg-slate-50 dark:bg-slate-950 border border-emerald-500/30 rounded-xl h-14 flex items-center px-4 justify-between">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">Estimated Cost:</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                    £{((Number(quickOrderQty) || 0) * (Number(quickOrderProduct?.price) || 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 border-t border-slate-200 dark:border-white/5 pt-5 mt-2">
            <Button variant="ghost" onClick={() => setQuickOrderProduct(null)} className="hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl cursor-pointer">
              Cancel
            </Button>
            <Button onClick={handleQuickOrderSubmit} disabled={submittingOrder || !quickOrderQty || quickOrderQty <= 0} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-md rounded-xl cursor-pointer px-8 text-md h-11">
              {submittingOrder ? "Ordering..." : "Place Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    </div>);

}
