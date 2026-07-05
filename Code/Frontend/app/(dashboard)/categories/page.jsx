"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search, MoreHorizontal, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUserStore } from "@/lib/store";

const mockCategories = [
  { id: "cat-1", name: "Electronics", description: "All electronic devices", productCount: 24, inventoryValue: 48500, trend: 12.5, color: "#0D9488", abcClass: "A" },
  { id: "cat-2", name: "Cables", description: "USB, HDMI, Ethernet", productCount: 18, inventoryValue: 12500, trend: -3.2, color: "#3B82F6", abcClass: "B" },
  { id: "cat-3", name: "Furniture", description: "Office desks, chairs", productCount: 12, inventoryValue: 34200, trend: 8.7, color: "#8B5CF6", abcClass: "A" },
];

export default function CategoriesPage() {
  const { role } = useUserStore();
  const canEdit = role === "admin" || role === "manager";
  const [categories, setCategories] = useState(mockCategories);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalValue = categories.reduce((sum, c) => sum + c.inventoryValue, 0);
  const abcSummary = { A: 0, B: 0, C: 0 };
  categories.forEach(c => { abcSummary[c.abcClass] += c.inventoryValue; });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Category Management</h1><p className="text-slate-500">Organise products by category</p></div>
        {canEdit && <Button><Plus className="mr-2 h-4 w-4" /> Add</Button>}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {["A", "B", "C"].map(cls => {
          const value = abcSummary[cls] || 0;
          const pct = totalValue > 0 ? (value / totalValue) * 100 : 0;
          return (
            <Card key={cls} className={`border-l-4 ${cls === "A" ? "border-green-500" : cls === "B" ? "border-amber-500" : "border-red-500"}`}>
              <CardContent className="p-4"><p className="text-xs text-slate-500">Class {cls}</p>
                <p className="text-2xl font-bold">£{(value/1000).toFixed(1)}k</p>
                <Progress value={pct} className="h-1 mt-1" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input placeholder="Search categories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
          </div>
          <Table className="mt-4">
            <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Products</TableHead><TableHead className="text-right">Value</TableHead><TableHead>ABC</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(cat => (
                <TableRow key={cat.id}>
                  <TableCell><div className="flex items-center gap-2"><Avatar className="h-8 w-8" style={{ backgroundColor: cat.color + "20" }}><AvatarFallback style={{ color: cat.color }}>{cat.name.slice(0,2)}</AvatarFallback></Avatar>{cat.name}</div></TableCell>
                  <TableCell>{cat.productCount}</TableCell>
                  <TableCell className="text-right">£{cat.inventoryValue.toLocaleString()}</TableCell>
                  <TableCell><Badge className={cat.abcClass === "A" ? "bg-green-500" : cat.abcClass === "B" ? "bg-amber-500" : "bg-red-500"}>{cat.abcClass}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}