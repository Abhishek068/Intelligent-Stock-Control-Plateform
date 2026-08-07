"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, MoreHorizontal, FolderOpen } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
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
import { categoriesApi, productsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const COLORS = ["#0D9488", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#6366F1"];

export default function CategoriesPage() {
  const { canEdit, hasPermission, isSuperAdmin } = useRoleAccess();
  const canManage =
    isSuperAdmin || hasPermission("categories", "create") || hasPermission("categories", "edit") || canEdit;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [saving, setSaving] = useState(false);

  const [viewingCategory, setViewingCategory] = useState(null);
  const [selectedCategoryProducts, setSelectedCategoryProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const openProductsModal = async (cat) => {
    setViewingCategory(cat);
    setLoadingProducts(true);
    try {
      const products = await productsApi.list({ category: cat.id });
      setSelectedCategoryProducts(products);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  };

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

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        toast.success("Category updated");
      } else {
        await categoriesApi.create(form);
        toast.success("Category created");
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <FolderOpen className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Category Management
            </h1>
          </div>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Organize and structure your product inventory with intelligent categorization.
            Assign products to categories for streamlined filtering and reporting.
          </p>
        </div>

        {canManage && (
          <Button
            onClick={openCreate}
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-2 px-4 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border border-indigo-500/50"
          >
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        )}
      </div>

      {/* Main Card */}
      <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

        <CardContent className="p-0">
          {/* Toolbar */}
          <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between relative z-10">
            <div className="relative w-full max-w-md group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors" />
              <Input
                placeholder="Search categories by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-950/50 border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all rounded-xl h-10"
              />
            </div>
            <div className="text-sm text-slate-400 font-medium px-4 py-2 bg-slate-950/50 border border-white/5 rounded-lg shadow-inner">
              Total Categories: <span className="text-slate-200">{categories.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto relative z-10">
            <Table>
              <TableHeader className="bg-slate-950/40 border-b border-white/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 pl-8 font-semibold text-slate-300">Category</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Description</TableHead>
                  <TableHead className="py-4 text-center font-semibold text-slate-300">Products</TableHead>
                  {canManage && <TableHead className="w-16" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 4 : 3} className="text-center text-slate-400 py-12">
                      <div className="animate-pulse">Loading categories...</div>
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 4 : 3} className="text-center text-slate-400 py-12">
                      No categories found matching "{searchQuery}"
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((cat, idx) => {
                    const color = COLORS[idx % COLORS.length];
                    return (
                      <TableRow key={cat.id} className="hover:bg-slate-800/40 transition-colors border-b border-white/5 group">
                        <TableCell className="pl-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <Avatar className="h-11 w-11 ring-1 ring-white/10 shadow-lg" style={{ backgroundColor: `${color}15` }}>
                                <AvatarFallback style={{ color }} className="font-bold bg-transparent text-sm">
                                  {cat.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute inset-0 rounded-full blur-[10px] opacity-30 -z-10" style={{ backgroundColor: color }} />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-200 text-[15px]">{cat.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">ID: {cat.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-md">
                          <p className="truncate text-slate-400 text-sm">
                            {cat.description || <span className="italic opacity-50">No description provided</span>}
                          </p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge 
                            variant="outline" 
                            className="bg-slate-950/50 border-white/10 text-slate-300 px-3 py-1 font-medium shadow-inner cursor-pointer hover:bg-indigo-500/10 hover:border-indigo-500/30 hover:text-indigo-300 transition-colors"
                            onClick={() => openProductsModal(cat)}
                          >
                            {cat.product_count ?? 0} Products
                          </Badge>
                        </TableCell>
                        {canManage && (
                          <TableCell className="pr-6 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10 hover:text-slate-200">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 shadow-xl backdrop-blur-xl rounded-xl">
                                <DropdownMenuItem onClick={() => openEdit(cat)} className="hover:bg-white/5 cursor-pointer text-slate-300">
                                  <Pencil className="mr-2 h-4 w-4 text-indigo-400" /> Edit Category
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDelete(cat)} className="hover:bg-rose-500/10 cursor-pointer text-rose-400 focus:text-rose-400 focus:bg-rose-500/10">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete Category
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#0F172A] border-white/10 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">
              {editing ? "Edit Category" : "Create New Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name" className="text-sm font-semibold text-slate-200">Category Name <span className="text-rose-400">*</span></Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Abrasives, Electronics..."
                className="bg-slate-950 border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-slate-100 font-medium rounded-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc" className="text-sm font-semibold text-slate-200">Description</Label>
              <Textarea
                id="cat-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what items belong in this category..."
                className="bg-slate-950 border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 text-slate-100 font-medium rounded-lg resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 border-t border-white/5 pt-4 mt-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="hover:bg-white/5 text-slate-300 hover:text-white rounded-xl">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium shadow-lg shadow-indigo-500/20 rounded-xl border border-indigo-500/50"
            >
              {saving ? "Saving..." : editing ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Products Modal */}
      <Dialog open={!!viewingCategory} onOpenChange={(open) => !open && setViewingCategory(null)}>
        <DialogContent className="sm:max-w-[600px] bg-[#0F172A] border-white/10 shadow-2xl rounded-2xl flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              Products in {viewingCategory?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 py-4 min-h-[150px]">
            {loadingProducts ? (
              <div className="flex h-full items-center justify-center text-slate-400 py-12">
                <div className="animate-pulse flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-indigo-500/50 animate-bounce" />
                  Loading products...
                </div>
              </div>
            ) : selectedCategoryProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-3">
                <FolderOpen className="h-10 w-10 text-slate-600" />
                <p>No products found in this category.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedCategoryProducts.map(p => (
                  <div key={p.id} className="p-3 bg-slate-950/40 border border-white/5 rounded-xl flex items-center justify-between hover:bg-slate-900/60 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-xs border border-indigo-500/20 shadow-inner">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 text-sm group-hover:text-indigo-300 transition-colors">{p.name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">SKU: {p.sku}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-300">
                        Stock: <span className={p.stock > 0 ? "text-emerald-400" : "text-rose-400"}>{p.stock}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">£{Number(p.unit_price).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-white/5 pt-4 mt-2">
            <Button variant="ghost" onClick={() => setViewingCategory(null)} className="hover:bg-white/5 text-slate-300 hover:text-white rounded-xl">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
