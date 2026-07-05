"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, MoreHorizontal, Search } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserStore } from "@/lib/store";

// Mock Data
const mockProducts = [
  {
    id: "1",
    sku: "SKU-001",
    name: "Wireless Mouse",
    category: "Electronics",
    supplier: "TechSupply Ltd",
    stock: 12,
    reorderLevel: 20,
    leadTime: 3,
    unitPrice: 24.99,
    forecastDemand: 45,
    recommendedReorder: 50,
    batch: "B2024-01",
    expiryDate: "2026-12-31",
    status: "low-stock",
  },
  {
    id: "2",
    sku: "SKU-002",
    name: "USB-C Cable (2m)",
    category: "Cables",
    supplier: "Global Parts Co",
    stock: 5,
    reorderLevel: 15,
    leadTime: 5,
    unitPrice: 9.99,
    forecastDemand: 120,
    recommendedReorder: 200,
    batch: "B2024-02",
    expiryDate: "2027-01-15",
    status: "low-stock",
  },
  {
    id: "3",
    sku: "SKU-003",
    name: "Desk Monitor Stand",
    category: "Furniture",
    supplier: "OfficeDirect",
    stock: 8,
    reorderLevel: 10,
    leadTime: 7,
    unitPrice: 89.0,
    forecastDemand: 25,
    recommendedReorder: 30,
    status: "in-stock",
  },
  {
    id: "4",
    sku: "SKU-004",
    name: "Keyboard Wired",
    category: "Electronics",
    supplier: "TechSupply Ltd",
    stock: 3,
    reorderLevel: 8,
    leadTime: 2,
    unitPrice: 45.0,
    forecastDemand: 40,
    recommendedReorder: 40,
    batch: "B2024-03",
    expiryDate: "2026-11-01",
    status: "out-of-stock",
  },
  {
    id: "5",
    sku: "SKU-005",
    name: "Ethernet Cable 10ft",
    category: "Cables",
    supplier: "Global Parts Co",
    stock: 50,
    reorderLevel: 30,
    leadTime: 3,
    unitPrice: 12.5,
    forecastDemand: 60,
    recommendedReorder: 20,
    status: "in-stock",
  },
];

const ActionsCell = ({ row }) => {
  const product = row.original;
  const { role } = useUserStore();
  const canEdit = role === "admin" || role === "manager";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem>View details</DropdownMenuItem>
        {canEdit && (
          <>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Columns definition (NO TYPES)
const columns = [
  {
    accessorKey: "sku",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting()}
        className="h-8 px-2 text-xs"
      >
        SKU <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("sku")}</div>,
  },
  {
    accessorKey: "name",
    header: "Product Name",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
            {row.getValue("name")?.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">{row.getValue("name")}</span>
      </div>
    ),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => <Badge variant="outline">{row.getValue("category")}</Badge>,
  },
  {
    accessorKey: "supplier",
    header: "Supplier",
    cell: ({ row }) => <span className="text-sm">{row.getValue("supplier")}</span>,
  },
  {
    accessorKey: "stock",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting()} className="h-8 px-2 text-xs">
        Stock <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => {
      const stock = row.getValue("stock");
      const status = row.original.status;
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium">{stock}</span>
          {status === "out-of-stock" && (
            <Badge variant="destructive" className="h-5 px-1 text-[10px]">
              OOS
            </Badge>
          )}
          {status === "low-stock" && (
            <Badge variant="warning" className="h-5 px-1 text-[10px] bg-amber-500 text-white">
              Low
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "forecastDemand",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting()}
        className="h-8 px-2 text-xs text-teal-700"
      >
        Forecast <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-semibold text-teal-600">{row.getValue("forecastDemand")}</span>
    ),
  },
  {
    accessorKey: "recommendedReorder",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting()}
        className="h-8 px-2 text-xs text-blue-700"
      >
        Reorder Qty <ArrowUpDown className="ml-2 h-3 w-3" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-semibold text-blue-600">{row.getValue("recommendedReorder")}</span>
    ),
  },
  {
    accessorKey: "riskScore",
    header: "Risk Score",
    cell: ({ row }) => {
      const stock = row.original.stock;
      const leadTime = row.original.leadTime;
      const forecast = row.original.forecastDemand;
      const risk = Math.min(100, ((leadTime * forecast) / (stock + 1)) * 2);
      const riskColor = risk > 70 ? "bg-red-500" : risk > 40 ? "bg-amber-500" : "bg-green-500";
      return (
        <div className="flex items-center gap-2">
          <div className="h-2 w-20 rounded-full bg-slate-200">
            <div
              className={`h-2 rounded-full ${riskColor}`}
              style={{ width: `${Math.min(risk, 100)}%` }}
            />
          </div>
          <span className="text-xs font-mono">{Math.round(risk)}%</span>
        </div>
      );
    },
  },
  {
    accessorKey: "batch",
    header: "Batch",
    cell: ({ row }) => {
      const batch = row.getValue("batch");
      return batch ? (
        <Badge variant="secondary" className="text-[10px]">
          {batch}
        </Badge>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      );
    },
  },
  {
    accessorKey: "expiryDate",
    header: "Expiry",
    cell: ({ row }) => {
      const expiry = row.getValue("expiryDate");
      if (!expiry) return <span className="text-xs text-slate-400">—</span>;
      const daysLeft = Math.ceil(
        (new Date(expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      );
      let badgeVariant = "outline";
      if (daysLeft < 7) badgeVariant = "destructive";
      else if (daysLeft < 30) badgeVariant = "default";
      return (
        <Badge variant={badgeVariant} className="text-[10px]">
          {daysLeft > 0 ? `${daysLeft}d` : "Expired"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: ActionsCell,
  },
];

export function ProductTable({ data = mockProducts }) {
  const [sorting, setSorting] = React.useState([]);
  const [columnFilters, setColumnFilters] = React.useState([]);
  const [columnVisibility, setColumnVisibility] = React.useState({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");

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
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <Card className="border-slate-800 bg-card text-card-foreground p-6 shadow-sm">
      <CardContent className="p-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search products..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Columns <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id === "actions" ? "Actions" : column.id === "riskScore" ? "Risk Score" : column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
            + Add Product
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="py-2">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-slate-500">
          Showing {table.getRowModel().rows.length} of {data.length} products
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
        </div>
      </CardContent>
    </Card>
  );
}