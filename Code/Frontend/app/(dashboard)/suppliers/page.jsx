"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Search, MoreHorizontal, Mail, Phone, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useUserStore } from "@/lib/store";

const mockSuppliers = [
  { id: "sup-1", name: "TechSupply Ltd", contactName: "John Doe", email: "john@techsupply.com", phone: "+44 20 7123 4567", leadTimeDays: 3, status: "active", productCount: 28, deliveryReliability: 94, scores: { delivery: 92, quality: 88, price: 85, accuracy: 94 } },
  { id: "sup-2", name: "Global Parts Co", contactName: "Jane Smith", email: "jane@globalparts.com", leadTimeDays: 5, status: "active", productCount: 15, deliveryReliability: 87, scores: { delivery: 85, quality: 90, price: 80, accuracy: 87 } },
];

export default function SuppliersPage() {
  const { role } = useUserStore();
  const canEdit = role === "admin" || role === "manager";
  const [suppliers, setSuppliers] = useState(mockSuppliers);
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getAvgScore = (scores) => {
    const vals = Object.values(scores);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold">Supplier Management</h1><p className="text-slate-500">Manage suppliers and track performance</p></div>
        {canEdit && <Button><Plus className="mr-2 h-4 w-4" /> Add</Button>}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input placeholder="Search suppliers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
          <Table className="mt-4">
            <TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead>Contact</TableHead><TableHead>Lead Time</TableHead><TableHead className="text-center">Delivery</TableHead><TableHead className="text-center">Score</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map(sup => {
                const avgScore = getAvgScore(sup.scores);
                return (
                  <TableRow key={sup.id}>
                    <TableCell><div className="flex items-center gap-2"><Avatar className="h-8 w-8 bg-teal-100"><AvatarFallback className="text-teal-700">{sup.name.slice(0,2)}</AvatarFallback></Avatar>{sup.name}</div></TableCell>
                    <TableCell><div><p className="text-sm">{sup.contactName}</p><p className="text-xs text-slate-400">{sup.email}</p></div></TableCell>
                    <TableCell>{sup.leadTimeDays}d</TableCell>
                    <TableCell className="text-center"><div className="flex items-center justify-center gap-2"><span>{sup.deliveryReliability}%</span><div className="h-1.5 w-12 rounded-full bg-slate-200"><div className="h-1.5 rounded-full bg-teal-500" style={{ width: `${sup.deliveryReliability}%` }} /></div></div></TableCell>
                    <TableCell className="text-center"><Badge className={avgScore >= 85 ? "bg-green-500" : "bg-amber-500"}>{Math.round(avgScore)}%</Badge></TableCell>
                    <TableCell><Badge className={sup.status === "active" ? "bg-green-500" : "bg-slate-400"}>{sup.status}</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}