"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, MoreHorizontal, Pencil, Shield, Users, Search, Activity, Mail, Phone, MapPin, Building, Lock } from "lucide-react";
import { usersApi, rolesApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { unwrapList } from "@/lib/api/client";

const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "pending_verification", label: "Pending Verification" },
  { value: "verified", label: "Verified" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
  { value: "archived", label: "Archived" },
];

function getStatusBadge(status) {
  switch (status) {
    case "active":
    case "verified":
      return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-normal shadow-inner px-2 py-0.5 capitalize">{status}</Badge>;
    case "pending_verification":
      return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 font-normal shadow-inner px-2 py-0.5 capitalize">Pending</Badge>;
    case "suspended":
    case "archived":
      return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 font-normal shadow-inner px-2 py-0.5 capitalize">{status}</Badge>;
    default:
      return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 font-normal shadow-inner px-2 py-0.5 capitalize">{status || "Unknown"}</Badge>;
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState({ modules: [], actions: [] });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rolesOpen, setRolesOpen] = useState(false);
  const [overridesOpen, setOverridesOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [inviteForm, setInviteForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    role_id: "",
  });
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    address: "",
    department: "",
    status: "active",
  });
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [overrideMatrix, setOverrideMatrix] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      if (roleFilter) params.roles__name = roleFilter;
      const [uRes, rRes, cRes] = await Promise.all([
        usersApi.list(params),
        rolesApi.list(),
        rolesApi.catalog(),
      ]);
      setUsers(unwrapList(uRes));
      setRoles(unwrapList(rRes));
      if (cRes.success) setCatalog(cRes.data);
    } catch (e) {
      toast.error(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const roleParam = urlParams.get("role") || "";
      if (roleParam) {
        setRoleFilter(roleParam);
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [statusFilter, roleFilter]);

  const invite = async () => {
    try {
      await usersApi.invite({
        ...inviteForm,
        role_id: inviteForm.role_id ? Number(inviteForm.role_id) : null,
      });
      toast.success("Invitation sent");
      setInviteOpen(false);
      setInviteForm({
        email: "",
        first_name: "",
        last_name: "",
        phone: "",
        address: "",
        role_id: "",
      });
      load();
    } catch (e) {
      toast.error(e.message || "Invite failed");
    }
  };

  const openEdit = async (u) => {
    try {
      const res = await usersApi.get(u.id);
      const data = res.data || res;
      setSelectedUser(data);
      setEditForm({
        first_name: data.first_name || "",
        last_name: data.last_name || "",
        phone: data.phone || "",
        address: data.address || "",
        department: data.department || "",
        status: data.status || "active",
      });
      setEditOpen(true);
    } catch (e) {
      toast.error(e.message || "Failed to load user");
    }
  };

  const saveEdit = async () => {
    try {
      await usersApi.update(selectedUser.id, editForm);
      toast.success("User updated");
      setEditOpen(false);
      load();
    } catch (e) {
      toast.error(e.message || "Update failed");
    }
  };

  const openRoles = (u) => {
    setSelectedUser(u);
    setSelectedRoleIds((u.roles || []).map((r) => r.id));
    setRolesOpen(true);
  };

  const saveRoles = async () => {
    try {
      await usersApi.setRoles(selectedUser.id, selectedRoleIds);
      toast.success("Roles updated");
      setRolesOpen(false);
      load();
    } catch (e) {
      toast.error(e.message || "Failed to update roles");
    }
  };

  const openOverrides = async (u) => {
    setSelectedUser(u);
    try {
      const [ovRes, cRes] = await Promise.all([
        usersApi.getOverrides(u.id),
        catalog.modules.length ? Promise.resolve({ success: true, data: catalog }) : rolesApi.catalog(),
      ]);
      if (cRes.success) setCatalog(cRes.data);
      const map = {};
      (ovRes.data || []).forEach((p) => {
        map[`${p.module}:${p.action}`] = { allowed: !!p.allowed, reason: p.reason || "" };
      });
      setOverrideMatrix(map);
      setOverridesOpen(true);
    } catch (e) {
      toast.error(e.message || "Failed to load overrides");
    }
  };

  const toggleOverride = (module, action) => {
    const key = `${module}:${action}`;
    setOverrideMatrix((m) => {
      const next = { ...m };
      if (next[key]) delete next[key];
      else next[key] = { allowed: true, reason: "Manual override" };
      return next;
    });
  };

  const saveOverrides = async () => {
    const permissions = Object.entries(overrideMatrix).map(([key, val]) => {
      const [module, action] = key.split(":");
      return { module, action, allowed: val.allowed, reason: val.reason || "" };
    });
    try {
      await usersApi.setOverrides(selectedUser.id, permissions);
      toast.success("Overrides saved");
      setOverridesOpen(false);
    } catch (e) {
      toast.error(e.message || "Save failed");
    }
  };

  const act = async (id, action) => {
    try {
      await usersApi[action](id);
      toast.success(`User ${action} completed`);
      load();
    } catch (e) {
      toast.error(e.message || "Action failed");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-violet-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-violet-500/20 rounded-xl border border-violet-500/30 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.2)]">
              <Users className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Users & Access
            </h1>
          </div>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Manage user lifecycle, assign roles, and override specific permissions.
          </p>
        </div>

        <Button 
          onClick={() => setInviteOpen(true)}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl h-11 px-6 shadow-lg shadow-violet-500/25 border border-violet-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <UserPlus className="mr-2 h-4 w-4" /> Invite User
        </Button>
      </div>

      <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="px-8 py-5 border-b border-white/5 bg-slate-950/20 relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="relative w-full lg:max-w-md group">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
            <Input
              placeholder="Search name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              className="pl-9 bg-slate-950/80 border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition-all rounded-xl h-11 w-full"
            />
          </div>
          
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px] bg-slate-950/50 border-white/10 focus:border-violet-500/50 text-slate-200 rounded-xl h-11">
                <Activity className="mr-2 h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 shadow-xl rounded-xl text-slate-200">
                {STATUSES.map((s) => (
                  <SelectItem key={s.value || "all"} value={s.value || "all"} className="focus:bg-violet-500/20 focus:text-violet-200 cursor-pointer">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={roleFilter || "all"} onValueChange={(v) => setRoleFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px] bg-slate-950/50 border-white/10 focus:border-violet-500/50 text-slate-200 rounded-xl h-11">
                <Shield className="mr-2 h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 shadow-xl rounded-xl text-slate-200">
                <SelectItem value="all" className="focus:bg-violet-500/20 focus:text-violet-200 cursor-pointer">All roles</SelectItem>
                <SelectItem value="Manager" className="focus:bg-violet-500/20 focus:text-violet-200 cursor-pointer">Manager</SelectItem>
                <SelectItem value="Staff" className="focus:bg-violet-500/20 focus:text-violet-200 cursor-pointer">Staff</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              onClick={load} 
              variant="outline" 
              className="bg-slate-900/50 border-white/10 hover:bg-white/10 text-slate-200 hover:text-white rounded-xl h-11 px-5 transition-colors"
            >
              Apply
            </Button>
          </div>
        </div>

        <CardContent className="p-0 relative z-10">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-950/40 border-b border-white/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4 pl-8 font-semibold text-slate-300">User Details</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Contact</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Role</TableHead>
                  <TableHead className="py-4 font-semibold text-slate-300">Status</TableHead>
                  <TableHead className="py-4 pr-8 text-right font-semibold text-slate-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400 py-12">
                      <div className="animate-pulse flex items-center justify-center gap-2">
                        <div className="h-4 w-4 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                        Loading users...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400 py-12">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="h-10 w-10 text-slate-600 mb-3" />
                        <p>No users found matching filters.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id} className="hover:bg-slate-800/40 transition-colors border-b border-white/5 group">
                      <TableCell className="pl-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold tracking-wide">
                            {(u.first_name?.[0] || u.email[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200 group-hover:text-violet-200 transition-colors">
                              {u.display_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Pending User"}
                            </p>
                            {u.department && (
                              <p className="text-xs text-slate-500 mt-0.5">{u.department}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Mail className="h-3 w-3 text-slate-500" />
                            {u.email}
                          </div>
                          {u.phone && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Phone className="h-3 w-3" />
                              {u.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-inner px-2 py-0.5 font-normal">
                          {u.primary_role || "No Role"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4">
                        {getStatusBadge(u.status)}
                      </TableCell>
                      <TableCell className="text-right pr-8 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-white/10 text-slate-200 rounded-xl shadow-xl">
                            <DropdownMenuItem onClick={() => openEdit(u)} className="focus:bg-slate-800 cursor-pointer">
                              <Pencil className="mr-2 h-4 w-4 text-violet-400" /> Edit profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRoles(u)} className="focus:bg-slate-800 cursor-pointer">
                              <Shield className="mr-2 h-4 w-4 text-indigo-400" /> Assign roles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openOverrides(u)} className="focus:bg-slate-800 cursor-pointer">
                              <Lock className="mr-2 h-4 w-4 text-emerald-400" /> Permission overrides
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem onClick={() => act(u.id, "activate")} className="focus:bg-slate-800 cursor-pointer">
                              Activate User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => act(u.id, "deactivate")} className="focus:bg-slate-800 cursor-pointer">
                              Deactivate User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => act(u.id, "suspend")} className="focus:bg-rose-500/20 focus:text-rose-400 cursor-pointer text-rose-400">
                              Suspend User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => act(u.id, "archive")} className="focus:bg-slate-800 cursor-pointer">
                              Archive User
                            </DropdownMenuItem>
                            {(u.status === "pending_verification" || u.status === "verified") && (
                              <>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem onClick={() => act(u.id, "resendVerification")} className="focus:bg-slate-800 cursor-pointer">
                                  Resend verification
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-xl bg-[#0F172A] border border-violet-500/30 shadow-[0_0_50px_rgba(139,92,246,0.15)] rounded-2xl p-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
          <DialogHeader className="p-6 pb-2 border-b border-white/5">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-violet-400" /> Invite New User
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300 font-semibold">First name</Label>
                <Input
                  value={inviteForm.first_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })}
                  className="bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 font-semibold">Last name</Label>
                <Input
                  value={inviteForm.last_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })}
                  className="bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 font-semibold">Email <span className="text-violet-400">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="pl-9 bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300 font-semibold">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    value={inviteForm.phone}
                    onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                    className="pl-9 bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 h-11 rounded-xl"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 font-semibold">Role</Label>
                <Select
                  value={inviteForm.role_id}
                  onValueChange={(v) => setInviteForm({ ...inviteForm, role_id: v })}
                >
                  <SelectTrigger className="w-full bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 h-11 rounded-xl">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-white/10 text-slate-200 rounded-xl">
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)} className="focus:bg-violet-500/20 focus:text-violet-200">
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 font-semibold">Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  value={inviteForm.address}
                  onChange={(e) => setInviteForm({ ...inviteForm, address: e.target.value })}
                  className="pl-9 bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 h-11 rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 border-t border-white/5 mt-2 flex gap-3">
            <Button variant="ghost" onClick={() => setInviteOpen(false)} className="text-slate-400 hover:text-white rounded-xl">
              Cancel
            </Button>
            <Button onClick={invite} disabled={!inviteForm.email} className="bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25">
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl bg-[#0F172A] border border-violet-500/30 shadow-[0_0_50px_rgba(139,92,246,0.15)] rounded-2xl p-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
          <DialogHeader className="p-6 pb-2 border-b border-white/5">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Pencil className="h-5 w-5 text-violet-400" /> Edit Profile
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300 font-semibold">First name</Label>
                <Input
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                  className="bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 font-semibold">Last name</Label>
                <Input
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                  className="bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 h-11 rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300 font-semibold">Phone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 font-semibold">Department</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="pl-9 bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 h-11 rounded-xl"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 font-semibold">Address</Label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 font-semibold">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm({ ...editForm, status: v })}
              >
                <SelectTrigger className="w-full bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-violet-500/50 focus:border-violet-500/50 h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10 text-slate-200 rounded-xl">
                  {STATUSES.filter((s) => s.value).map((s) => (
                    <SelectItem key={s.value} value={s.value} className="focus:bg-violet-500/20 focus:text-violet-200">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 border-t border-white/5 mt-2 flex gap-3">
            <Button variant="ghost" onClick={() => setEditOpen(false)} className="text-slate-400 hover:text-white rounded-xl">
              Cancel
            </Button>
            <Button onClick={saveEdit} className="bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Roles Modal */}
      <Dialog open={rolesOpen} onOpenChange={setRolesOpen}>
        <DialogContent className="max-w-md bg-[#0F172A] border border-violet-500/30 shadow-[0_0_50px_rgba(139,92,246,0.15)] rounded-2xl p-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
          <DialogHeader className="p-6 pb-2 border-b border-white/5">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-400" /> Assign Roles
            </DialogTitle>
            <p className="text-sm text-slate-400 mt-1">{selectedUser?.email}</p>
          </DialogHeader>
          <div className="p-6 space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-3 text-sm text-slate-200 bg-slate-900/50 border border-white/5 p-3 rounded-xl hover:bg-slate-900 hover:border-violet-500/30 transition-all cursor-pointer">
                <Checkbox
                  checked={selectedRoleIds.includes(r.id)}
                  onCheckedChange={(checked) => {
                    setSelectedRoleIds((ids) =>
                      checked ? [...ids, r.id] : ids.filter((id) => id !== r.id)
                    );
                  }}
                  className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                />
                <span className="font-medium">
                  {r.name}
                  {r.is_system && <Badge className="ml-2 bg-slate-800 text-slate-400 border-white/10 text-[10px]">System</Badge>}
                </span>
              </label>
            ))}
          </div>
          <DialogFooter className="p-6 pt-0 border-t border-white/5 mt-2 flex gap-3">
            <Button variant="ghost" onClick={() => setRolesOpen(false)} className="text-slate-400 hover:text-white rounded-xl">
              Cancel
            </Button>
            <Button onClick={saveRoles} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25">
              Save Roles
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Overrides Modal */}
      <Dialog open={overridesOpen} onOpenChange={setOverridesOpen}>
        <DialogContent className="max-w-4xl bg-[#0F172A] border border-violet-500/30 shadow-[0_0_50px_rgba(139,92,246,0.15)] rounded-2xl p-0 overflow-hidden max-h-[85vh] flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
          <DialogHeader className="p-6 pb-4 border-b border-white/5 shrink-0">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-emerald-400" /> Permission Overrides
            </DialogTitle>
            <div className="flex flex-col gap-1 mt-1">
              <p className="text-sm font-semibold text-slate-300">{selectedUser?.email}</p>
              <p className="text-xs text-slate-500">
                Checked boxes grant an individual <strong className="text-emerald-400">ALLOW</strong> override on top of their role permissions.
              </p>
            </div>
          </DialogHeader>
          <div className="overflow-x-auto flex-1 custom-scrollbar p-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-white/10">
                  <th className="text-left py-3 font-semibold uppercase tracking-wider">Module</th>
                  {catalog.actions.map((a) => (
                    <th key={a.code} className="px-2 py-3 text-center capitalize font-semibold tracking-wider">
                      {a.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catalog.modules.map((m) => (
                  <tr key={m.code} className="border-b border-white/5 hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 text-slate-200 font-medium pl-2">{m.label}</td>
                    {catalog.actions.map((a) => (
                      <td key={a.code} className="px-2 py-3 text-center">
                        <Checkbox
                          checked={!!overrideMatrix[`${m.code}:${a.code}`]}
                          onCheckedChange={() => toggleOverride(m.code, a.code)}
                          className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 h-4 w-4"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="p-6 shrink-0 border-t border-white/5 flex gap-3">
            <Button variant="ghost" onClick={() => setOverridesOpen(false)} className="text-slate-400 hover:text-white rounded-xl">
              Cancel
            </Button>
            <Button onClick={saveOverrides} className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25">
              Save Overrides
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
