"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, MoreHorizontal, Pencil, Shield } from "lucide-react";
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Users</h1>
          <p className="text-slate-400 mt-1">Invite, lifecycle status, roles and permission overrides</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Invite User
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search name or email..."
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.value || "all"} value={s.value || "all"}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={roleFilter || "all"} onValueChange={(v) => setRoleFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="Manager">Manager</SelectItem>
            <SelectItem value="Staff">Staff</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={load}>
          Apply
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-slate-100">All users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-white/5">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Role</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 text-slate-200">
                      <td className="py-3 pr-4">{u.display_name || `${u.first_name} ${u.last_name}`}</td>
                      <td className="py-3 pr-4">{u.email}</td>
                      <td className="py-3 pr-4">{u.primary_role}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="outline" className="capitalize">
                          {String(u.status || "").replaceAll("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => openEdit(u)}>
                              <Pencil className="mr-2 h-3 w-3" /> Edit profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRoles(u)}>
                              Assign roles
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openOverrides(u)}>
                              <Shield className="mr-2 h-3 w-3" /> Permission overrides
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => act(u.id, "activate")}>
                              Activate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => act(u.id, "deactivate")}>
                              Deactivate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => act(u.id, "suspend")}>
                              Suspend
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => act(u.id, "archive")}>
                              Archive
                            </DropdownMenuItem>
                            {(u.status === "pending_verification" || u.status === "verified") && (
                              <DropdownMenuItem onClick={() => act(u.id, "resendVerification")}>
                                Resend verification
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <p className="text-slate-500 text-sm py-4">No users found</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle>Invite user</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First name</Label>
                <Input
                  value={inviteForm.first_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, first_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Last name</Label>
                <Input
                  value={inviteForm.last_name}
                  onChange={(e) => setInviteForm({ ...inviteForm, last_name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={inviteForm.phone}
                onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={inviteForm.address}
                onChange={(e) => setInviteForm({ ...inviteForm, address: e.target.value })}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={inviteForm.role_id}
                onValueChange={(v) => setInviteForm({ ...inviteForm, role_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={invite}>Send invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle>Edit {selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First name</Label>
                <Input
                  value={editForm.first_name}
                  onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Last name</Label>
                <Input
                  value={editForm.last_name}
                  onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              />
            </div>
            <div>
              <Label>Department</Label>
              <Input
                value={editForm.department}
                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm({ ...editForm, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.filter((s) => s.value).map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rolesOpen} onOpenChange={setRolesOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle>Assign roles — {selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedRoleIds.includes(r.id)}
                  onCheckedChange={(checked) => {
                    setSelectedRoleIds((ids) =>
                      checked ? [...ids, r.id] : ids.filter((id) => id !== r.id)
                    );
                  }}
                />
                <span>
                  {r.name}
                  {r.is_system ? " (system)" : ""}
                </span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRolesOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRoles}>Save roles</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overridesOpen} onOpenChange={setOverridesOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-100 max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Permission overrides — {selectedUser?.email}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-500">
            Checked boxes grant an individual allow override on top of role permissions.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-500">
                  <th className="text-left py-2">Module</th>
                  {catalog.actions.map((a) => (
                    <th key={a.code} className="px-1 capitalize">
                      {a.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catalog.modules.map((m) => (
                  <tr key={m.code} className="border-t border-white/5">
                    <td className="py-2 text-slate-200">{m.label}</td>
                    {catalog.actions.map((a) => (
                      <td key={a.code} className="px-1 text-center">
                        <Checkbox
                          checked={!!overrideMatrix[`${m.code}:${a.code}`]}
                          onCheckedChange={() => toggleOverride(m.code, a.code)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverridesOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveOverrides}>Save overrides</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
