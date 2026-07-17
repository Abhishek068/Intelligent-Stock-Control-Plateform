"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Plus, Save, Trash2, Users } from "lucide-react";
import { rolesApi, usersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { unwrapList } from "@/lib/api/client";

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [catalog, setCatalog] = useState({ modules: [], actions: [] });
  const [selected, setSelected] = useState(null);
  const [matrix, setMatrix] = useState({});
  const [members, setMembers] = useState([]);
  const [memberIds, setMemberIds] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editForm, setEditForm] = useState({ name: "", description: "" });

  const load = async () => {
    try {
      const [rRes, cRes, uRes] = await Promise.all([
        rolesApi.list(),
        rolesApi.catalog(),
        usersApi.list(),
      ]);
      setRoles(unwrapList(rRes));
      setAllUsers(unwrapList(uRes));
      if (cRes.success) setCatalog(cRes.data);
    } catch (e) {
      toast.error(e.message || "Failed to load roles");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectRole = async (role) => {
    setSelected(role);
    try {
      const [permRes, memRes] = await Promise.all([
        rolesApi.getPermissions(role.id),
        rolesApi.members(role.id),
      ]);
      const map = {};
      (permRes.data || []).forEach((p) => {
        map[`${p.module}:${p.action}`] = !!p.allowed;
      });
      setMatrix(map);
      const mems = memRes.data || [];
      setMembers(mems);
      setMemberIds(mems.map((u) => u.id));
    } catch (e) {
      toast.error(e.message || "Failed to load role details");
    }
  };

  const toggle = (module, action) => {
    const key = `${module}:${action}`;
    setMatrix((m) => ({ ...m, [key]: !m[key] }));
  };

  const saveMatrix = async () => {
    if (!selected) return;
    const permissions = [];
    catalog.modules.forEach((mod) => {
      catalog.actions.forEach((act) => {
        const key = `${mod.code}:${act.code}`;
        if (matrix[key]) {
          permissions.push({ module: mod.code, action: act.code, allowed: true });
        }
      });
    });
    try {
      await rolesApi.setPermissions(selected.id, permissions);
      toast.success("Permissions saved");
    } catch (e) {
      toast.error(e.message || "Save failed");
    }
  };

  const saveMembers = async () => {
    if (!selected) return;
    try {
      const res = await rolesApi.assignMembers(selected.id, memberIds);
      setMembers(res.data || []);
      toast.success("Members updated");
      load();
    } catch (e) {
      toast.error(e.message || "Failed to update members");
    }
  };

  const createRole = async () => {
    try {
      await rolesApi.create(form);
      toast.success("Role created");
      setCreateOpen(false);
      setForm({ name: "", description: "" });
      load();
    } catch (e) {
      toast.error(e.message || "Create failed");
    }
  };

  const saveEdit = async () => {
    try {
      const res = await rolesApi.update(selected.id, editForm);
      toast.success("Role updated");
      setEditOpen(false);
      await load();
      const updated = res.data || { ...selected, ...editForm };
      setSelected(updated);
      await selectRole(updated);
    } catch (e) {
      toast.error(e.message || "Update failed");
    }
  };

  const cloneRole = async (role) => {
    try {
      await rolesApi.clone(role.id);
      toast.success("Role cloned");
      load();
    } catch (e) {
      toast.error(e.message || "Clone failed");
    }
  };

  const deleteRole = async (role) => {
    if (role.is_system) {
      toast.error("System roles cannot be deleted");
      return;
    }
    try {
      await rolesApi.remove(role.id);
      toast.success("Role deleted");
      if (selected?.id === role.id) setSelected(null);
      load();
    } catch (e) {
      toast.error(e.message || "Delete failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Roles & Permissions</h1>
          <p className="text-slate-400 mt-1">Create, clone, assign members, and edit the permission matrix</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Role
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-slate-100">Roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {roles.map((r) => (
              <div
                key={r.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer ${
                  selected?.id === r.id ? "border-indigo-500 bg-indigo-500/10" : "border-white/5"
                }`}
                onClick={() => selectRole(r)}
              >
                <div>
                  <p className="text-sm text-slate-100">
                    {r.name}
                    {r.is_system ? (
                      <span className="ml-2 text-[10px] uppercase text-slate-500">system</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500">{r.member_count} members</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      cloneRole(r);
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {!r.is_system && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRole(r);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-rose-400" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-slate-100">
              {selected ? selected.name : "Select a role"}
            </CardTitle>
            {selected && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditForm({ name: selected.name, description: selected.description || "" });
                  setEditOpen(true);
                }}
              >
                Edit details
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="text-slate-500 text-sm">Choose a role to manage permissions and members.</p>
            ) : (
              <Tabs defaultValue="matrix">
                <TabsList>
                  <TabsTrigger value="matrix">Permission matrix</TabsTrigger>
                  <TabsTrigger value="members">
                    <Users className="mr-1 h-3 w-3" /> Members
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="matrix" className="mt-4 space-y-3">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={saveMatrix}>
                      <Save className="mr-2 h-4 w-4" /> Save matrix
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-500">
                          <th className="text-left py-2 pr-2">Module</th>
                          {catalog.actions.map((a) => (
                            <th key={a.code} className="px-1 py-2 capitalize">
                              {a.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {catalog.modules.map((m) => (
                          <tr key={m.code} className="border-t border-white/5">
                            <td className="py-2 pr-2 text-slate-200">{m.label}</td>
                            {catalog.actions.map((a) => (
                              <td key={a.code} className="px-1 text-center">
                                <Checkbox
                                  checked={!!matrix[`${m.code}:${a.code}`]}
                                  onCheckedChange={() => toggle(m.code, a.code)}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="members" className="mt-4 space-y-3">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={saveMembers}>
                      <Save className="mr-2 h-4 w-4" /> Save members
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {allUsers.map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 text-sm border border-white/5 rounded-lg px-3 py-2"
                      >
                        <Checkbox
                          checked={memberIds.includes(u.id)}
                          onCheckedChange={(checked) => {
                            setMemberIds((ids) =>
                              checked ? [...ids, u.id] : ids.filter((id) => id !== u.id)
                            );
                          }}
                        />
                        <span className="text-slate-200">
                          {u.display_name || u.email}
                          <span className="text-slate-500 ml-2 text-xs">{u.email}</span>
                        </span>
                      </label>
                    ))}
                    {allUsers.length === 0 && (
                      <p className="text-slate-500 text-sm">No users available to assign</p>
                    )}
                  </div>
                  {members.length > 0 && (
                    <p className="text-xs text-slate-500">
                      Currently assigned: {members.map((m) => m.email).join(", ")}
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle>Create role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createRole}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name</Label>
              <Input
                value={editForm.name}
                disabled={selected?.is_system}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
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
    </div>
  );
}
