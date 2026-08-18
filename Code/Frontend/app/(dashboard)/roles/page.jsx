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
    <div className="space-y-6 w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-slate-50 dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Roles & Permissions
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Create, clone, assign members, and edit the permission matrix</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl px-5 shadow-md cursor-pointer">
          <Plus className="mr-2 h-4 w-4" /> Create Role
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl rounded-2xl lg:col-span-1">
          <CardHeader className="border-b border-slate-200/80 dark:border-white/5 pb-4">
            <CardTitle className="text-slate-900 dark:text-slate-100 font-bold">Roles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {roles.map((r) => (
              <div
                key={r.id}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                  selected?.id === r.id ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" : "border-slate-200/80 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
                onClick={() => selectRole(r)}
              >
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {r.name}
                    {r.is_system ? (
                      <span className="ml-2 text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20 px-1.5 py-0.5 rounded">system</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{r.member_count} members</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer text-slate-500 hover:text-slate-900 dark:hover:text-white"
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
                      className="cursor-pointer text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRole(r);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl rounded-2xl lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200/80 dark:border-white/5 pb-4">
            <CardTitle className="text-slate-900 dark:text-slate-100 font-bold">
              {selected ? selected.name : "Select a role"}
            </CardTitle>
            {selected && (
              <Button
                size="sm"
                variant="outline"
                className="border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 rounded-xl cursor-pointer"
                onClick={() => {
                  setEditForm({ name: selected.name, description: selected.description || "" });
                  setEditOpen(true);
                }}
              >
                Edit details
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-4">
            {!selected ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm py-8 text-center">Choose a role to manage permissions and members.</p>
            ) : (
              <Tabs defaultValue="matrix">
                <TabsList className="bg-slate-100 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-xl">
                  <TabsTrigger value="matrix" className="rounded-lg font-bold">Permission matrix</TabsTrigger>
                  <TabsTrigger value="members" className="rounded-lg font-bold">
                    <Users className="mr-1 h-3.5 w-3.5" /> Members
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="matrix" className="mt-4 space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={saveMatrix} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer">
                      <Save className="mr-2 h-4 w-4" /> Save matrix
                    </Button>
                  </div>
                  <div className="overflow-x-auto border border-slate-200/80 dark:border-white/5 rounded-xl">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-white/5">
                        <tr className="text-slate-700 dark:text-slate-300 font-bold">
                          <th className="text-left py-3 px-4">Module</th>
                          {catalog.actions.map((a) => (
                            <th key={a.code} className="px-2 py-3 capitalize text-center">
                              {a.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {catalog.modules.map((m) => (
                          <tr key={m.code} className="border-t border-slate-200/60 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                            <td className="py-2.5 px-4 text-slate-900 dark:text-slate-200 font-semibold">{m.label}</td>
                            {catalog.actions.map((a) => (
                              <td key={a.code} className="px-2 text-center">
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

                <TabsContent value="members" className="mt-4 space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" onClick={saveMembers} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer">
                      <Save className="mr-2 h-4 w-4" /> Save members
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {allUsers.map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-2 text-sm border border-slate-200/80 dark:border-white/5 rounded-xl px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                      >
                        <Checkbox
                          checked={memberIds.includes(u.id)}
                          onCheckedChange={(checked) => {
                            setMemberIds((ids) =>
                              checked ? [...ids, u.id] : ids.filter((id) => id !== u.id)
                            );
                          }}
                        />
                        <span className="text-slate-900 dark:text-slate-200 font-semibold">
                          {u.display_name || u.email}
                          <span className="text-slate-500 ml-2 text-xs font-normal">{u.email}</span>
                        </span>
                      </label>
                    ))}
                    {allUsers.length === 0 && (
                      <p className="text-slate-500 text-sm">No users available to assign</p>
                    )}
                  </div>
                  {members.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
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
        <DialogContent className="bg-white dark:bg-[#0F172A] border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Create role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700 dark:text-slate-300">Name</Label>
              <Input 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700 dark:text-slate-300">Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl cursor-pointer">
              Cancel
            </Button>
            <Button onClick={createRole} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-white dark:bg-[#0F172A] border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700 dark:text-slate-300">Name</Label>
              <Input
                value={editForm.name}
                disabled={selected?.is_system}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700 dark:text-slate-300">Description</Label>
              <Input
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl cursor-pointer">
              Cancel
            </Button>
            <Button onClick={saveEdit} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl cursor-pointer">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
