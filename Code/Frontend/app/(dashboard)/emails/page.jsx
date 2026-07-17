"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, RotateCcw, Save } from "lucide-react";
import { emailsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { unwrapList } from "@/lib/api/client";

export default function EmailsPage() {
  const [templates, setTemplates] = useState([]);
  const [queue, setQueue] = useState([]);
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState(null);
  const [configForm, setConfigForm] = useState({
    api_key: "",
    sender_email: "",
    sender_name: "",
    reply_to: "",
  });
  const [editTpl, setEditTpl] = useState(null);

  const load = async () => {
    try {
      const [t, q, l, c] = await Promise.all([
        emailsApi.templates(),
        emailsApi.queue(),
        emailsApi.logs(),
        emailsApi.config().catch(() => null),
      ]);
      setTemplates(unwrapList(t));
      setQueue(unwrapList(q));
      setLogs(unwrapList(l));
      if (c?.success && c.data) {
        setConfig(c.data);
        setConfigForm({
          api_key: "",
          sender_email: c.data.sender_email || "",
          sender_name: c.data.sender_name || "",
          reply_to: c.data.reply_to || "",
        });
      }
    } catch (e) {
      toast.error(e.message || "Failed to load email data");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveConfig = async () => {
    try {
      const payload = {
        provider: "brevo",
        sender_email: configForm.sender_email,
        sender_name: configForm.sender_name,
        reply_to: configForm.reply_to,
        is_active: true,
      };
      if (configForm.api_key) payload.api_key = configForm.api_key;
      await emailsApi.saveConfig(payload);
      toast.success("Email provider saved");
      load();
    } catch (e) {
      toast.error(e.message || "Save failed");
    }
  };

  const processQueue = async () => {
    try {
      const res = await emailsApi.processQueue();
      toast.success(`Processed: ${JSON.stringify(res.data)}`);
      load();
    } catch (e) {
      toast.error(e.message || "Process failed");
    }
  };

  const retryItem = async (id) => {
    try {
      await emailsApi.retry(id);
      toast.success("Retry queued");
      load();
    } catch (e) {
      toast.error(e.message || "Retry failed");
    }
  };

  const saveTemplate = async () => {
    try {
      await emailsApi.updateTemplate(editTpl.id, {
        subject: editTpl.subject,
        body_html: editTpl.body_html,
        body_text: editTpl.body_text,
        is_active: editTpl.is_active,
      });
      toast.success("Template saved");
      setEditTpl(null);
      load();
    } catch (e) {
      toast.error(e.message || "Save failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Email Infrastructure</h1>
          <p className="text-slate-400 mt-1">Brevo provider, templates, queue and logs</p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Queue</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="provider">Provider</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-slate-100">Email queue</CardTitle>
              <Button size="sm" onClick={processQueue}>
                Process now
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-white/5 py-2 text-sm gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-slate-200 truncate">{item.subject}</p>
                    <p className="text-xs text-slate-500">{item.recipient}</p>
                    {item.error_message && (
                      <p className="text-xs text-rose-400 mt-1 truncate">{item.error_message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="capitalize">
                      {item.status}
                    </Badge>
                    {(item.status === "failed" || item.status === "retry") && (
                      <Button size="sm" variant="outline" onClick={() => retryItem(item.id)}>
                        <RotateCcw className="h-3 w-3 mr-1" /> Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {queue.length === 0 && <p className="text-slate-500 text-sm">Queue is empty</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-slate-100">Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="border border-white/5 rounded-lg p-3 flex justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-100">{t.key}</p>
                    <p className="text-xs text-slate-400 mt-1">{t.subject}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setEditTpl({ ...t })}>
                    Edit
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-slate-100">Email logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="border-b border-white/5 py-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-200">{log.subject}</span>
                    <Badge variant="outline">{log.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-500">{log.recipient}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="provider" className="mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-slate-100">Brevo configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-w-lg">
              <p className="text-xs text-slate-500">
                Org API key is preferred. If empty, `BREVO_API_KEY` from Backend `.env` is used.
                With neither set, emails print to the Django/Celery console.
              </p>
              <div>
                <Label>API key</Label>
                <Input
                  type="password"
                  placeholder={config ? "•••••••• (leave blank to keep)" : "Optional"}
                  value={configForm.api_key}
                  onChange={(e) => setConfigForm({ ...configForm, api_key: e.target.value })}
                />
              </div>
              <div>
                <Label>Sender email</Label>
                <Input
                  value={configForm.sender_email}
                  onChange={(e) => setConfigForm({ ...configForm, sender_email: e.target.value })}
                />
              </div>
              <div>
                <Label>Sender name</Label>
                <Input
                  value={configForm.sender_name}
                  onChange={(e) => setConfigForm({ ...configForm, sender_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Reply-To</Label>
                <Input
                  value={configForm.reply_to}
                  onChange={(e) => setConfigForm({ ...configForm, reply_to: e.target.value })}
                />
              </div>
              <Button onClick={saveConfig}>Save provider</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editTpl} onOpenChange={(v) => !v && setEditTpl(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-slate-100 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit template — {editTpl?.key}</DialogTitle>
          </DialogHeader>
          {editTpl && (
            <div className="space-y-3">
              <div>
                <Label>Subject</Label>
                <Input
                  value={editTpl.subject}
                  onChange={(e) => setEditTpl({ ...editTpl, subject: e.target.value })}
                />
              </div>
              <div>
                <Label>HTML body</Label>
                <Textarea
                  rows={8}
                  value={editTpl.body_html}
                  onChange={(e) => setEditTpl({ ...editTpl, body_html: e.target.value })}
                />
              </div>
              <div>
                <Label>Text body</Label>
                <Textarea
                  rows={4}
                  value={editTpl.body_text || ""}
                  onChange={(e) => setEditTpl({ ...editTpl, body_text: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTpl(null)}>
              Cancel
            </Button>
            <Button onClick={saveTemplate}>
              <Save className="mr-2 h-4 w-4" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
