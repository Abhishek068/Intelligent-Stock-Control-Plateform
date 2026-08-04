"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  MoreHorizontal,
  FolderPlus,
  Layers,
  Package,
  Tag,
  FileText,
  LayoutGrid,
  List,
  Folder,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categoriesApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const COLORS = ["#0D9488", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#6366F1", "#EC4899", "#10B981"];

function CategoryKpiCard({ title, value, subtitle, icon: Icon, color, glowColor }) {
  return (
    <Card className="relative overflow-hidden bg-slate-900/60 border-slate-800/80 backdrop-blur-xl transition-all duration-300 hover:border-slate-700 hover:shadow-xl group">
      <div className={`absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl ${glowColor} rounded-bl-full pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity`} />
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400">{title}</p>
          <h3 className="text-2xl font-black tracking-tight text-white">{value}</h3>
          {subtitle && <p className="text-[11px] text-slate-400 flex items-center gap-1">{subtitle}</p>}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function CategoriesPage() {
  const { canEdit, hasPermission, isSuperAdmin } = useRoleAccess();
  const canManage =
    isSuperAdmin || hasPermission("categories", "create") || hasPermission("categories", "edit") || canEdit;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("table"); // 'table' | 'grid'
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await categoriesApi.list());
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const filtered = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [categories, searchQuery]
  );

  // Summary Metrics
  const totalProductsCount = useMemo(
    () => categories.reduce((sum, c) => sum + (c.product_count || 0), 0),
    [categories]
  );

  const topCategory = useMemo(() => {
    if (!categories.length) return null;
    return [...categories].sort((a, b) => (b.product_count || 0) - (a.product_count || 0))[0];
  }, [categories]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await categoriesApi.update(editing.id, form);
        toast.success("Category updated successfully");
      } else {
        await categoriesApi.create(form);
        toast.success("New category created");
      }
      setDialogOpen(false);
      loadCategories();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await categoriesApi.delete(cat.id);
      toast.success("Category deleted");
      loadCategories();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Layers className="h-8 w-8 text-blue-400" /> Category Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Organise, structure, and categorize products across your global inventory catalog.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={openCreate}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/20"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        )}
      </div>

      {/* KPI Cards Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CategoryKpiCard
          title="Total Categories"
          value={categories.length.toLocaleString()}
          subtitle="Catalog structures"
          icon={Folder}
          color="bg-blue-500/10 text-blue-400 border-blue-500/20"
          glowColor="from-blue-500/20 to-transparent"
        />

        <CategoryKpiCard
          title="Categorized Products"
          value={totalProductsCount.toLocaleString()}
          subtitle="Assigned SKUs"
          icon={Package}
          color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          glowColor="from-emerald-500/20 to-transparent"
        />

        <CategoryKpiCard
          title="Avg SKUs / Category"
          value={`${Math.round(totalProductsCount / (categories.length || 1))} SKUs`}
          subtitle="Distribution density"
          icon={BarChart3}
          color="bg-purple-500/10 text-purple-400 border-purple-500/20"
          glowColor="from-purple-500/20 to-transparent"
        />

        <CategoryKpiCard
          title="Largest Category"
          value={topCategory?.name || "N/A"}
          subtitle={`${topCategory?.product_count ?? 0} active products`}
          icon={TrendingUp}
          color="bg-amber-500/10 text-amber-400 border-amber-500/20"
          glowColor="from-amber-500/20 to-transparent"
        />
      </div>

      {/* Main Content Card */}
      <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl">
        <CardContent className="p-5 space-y-4">
          {/* Controls Bar: Search & View Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search categories by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-950/60 border-slate-800 text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800">
                <Button
                  size="sm"
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("table")}
                  className="h-7 text-xs px-2.5"
                >
                  <List className="mr-1 h-3.5 w-3.5" /> Table
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("grid")}
                  className="h-7 text-xs px-2.5"
                >
                  <LayoutGrid className="mr-1 h-3.5 w-3.5" /> Grid
                </Button>
              </div>

              <div className="text-xs text-slate-400 font-medium">
                Showing {filtered.length} of {categories.length}
              </div>
            </div>
          </div>

          {/* VIEW MODE 1: TABLE VIEW */}
          {viewMode === "table" && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Category Name</TableHead>
                    <TableHead className="text-slate-400">Description</TableHead>
                    <TableHead className="text-slate-400 text-center">Assigned Products</TableHead>
                    <TableHead className="text-slate-400 text-right pr-6 font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 4 : 3} className="text-center text-slate-400 py-8">
                        Loading categories...
                      </TableCell>
                    </TableRow>
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManage ? 4 : 3} className="text-center text-slate-400 py-8">
                        No categories found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((cat, idx) => {
                      const color = COLORS[idx % COLORS.length];
                      return (
                        <TableRow key={cat.id} className="border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 border border-white/10" style={{ backgroundColor: `${color}20` }}>
                                <AvatarFallback style={{ color }} className="font-bold text-xs">
                                  {cat.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-semibold text-white">{cat.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-md truncate text-slate-400 text-xs">
                            {cat.description || "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className="bg-blue-500/10 text-blue-300 border-blue-500/20 font-mono text-xs px-2.5 py-0.5"
                            >
                              {cat.product_count ?? 0} SKUs
                            </Badge>
                          </TableCell>
                          {canManage && (
                            <TableCell className="text-right pr-6">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEdit(cat)}
                                  className="h-8 px-2.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 border border-blue-500/20"
                                >
                                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(cat)}
                                  className="h-8 px-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20"
                                >
                                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* VIEW MODE 2: GRID CARDS VIEW */}
          {viewMode === "grid" && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2">
              {loading ? (
                <div className="col-span-full text-center text-slate-400 py-8">Loading category cards...</div>
              ) : filtered.length === 0 ? (
                <div className="col-span-full text-center text-slate-400 py-8">No categories found.</div>
              ) : (
                filtered.map((cat, idx) => {
                  const color = COLORS[idx % COLORS.length];
                  return (
                    <Card
                      key={cat.id}
                      className="relative overflow-hidden bg-slate-950/60 border-slate-800 hover:border-slate-700 transition-all duration-200 group flex flex-col justify-between"
                    >
                      <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border border-white/10" style={{ backgroundColor: `${color}20` }}>
                            <AvatarFallback style={{ color }} className="font-bold text-sm">
                              {cat.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base font-semibold text-white group-hover:text-blue-300 transition-colors">
                              {cat.name}
                            </CardTitle>
                            <span className="text-[11px] text-slate-400">Category ID: #{cat.id}</span>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3 pt-0">
                        <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px]">
                          {cat.description || "No description provided for this category."}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                          <span className="text-xs text-slate-400">Assigned SKUs:</span>
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-300 border-blue-500/20 font-mono text-xs">
                            {cat.product_count ?? 0} Products
                          </Badge>
                        </div>

                        {canManage && (
                          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/60">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(cat)}
                              className="h-8 text-xs border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(cat)}
                              className="h-8 text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Glassmorphism Add/Edit Category Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md bg-slate-900/95 border-slate-800 text-white backdrop-blur-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-blue-400" />
              {editing ? "Edit Category Details" : "Add New Category"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Create or modify product classification metadata for your inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="cat-name" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Tag className="h-3.5 w-3.5 text-blue-400" /> Category Name *
              </Label>
              <Input
                id="cat-name"
                placeholder="e.g. Electrical Components"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-slate-950/70 border-slate-800 text-white focus:border-blue-500"
              />
            </div>

            <div>
              <Label htmlFor="cat-desc" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <FileText className="h-3.5 w-3.5 text-blue-400" /> Description
              </Label>
              <Textarea
                id="cat-desc"
                rows={3}
                placeholder="Brief summary of items in this category..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-slate-950/70 border-slate-800 text-white focus:border-blue-500"
              />
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-slate-800 bg-slate-800/40 hover:bg-slate-800 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-500/20"
            >
              {saving ? "Saving..." : editing ? "Update Category" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
