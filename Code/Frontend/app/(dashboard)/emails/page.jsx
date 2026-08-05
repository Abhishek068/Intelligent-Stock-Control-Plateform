"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { 
  RefreshCw, RotateCcw, Save, Mail, Inbox, 
  FileText, History, Settings, Play, Send, CheckCircle2, AlertTriangle, AlertCircle, Clock
} from "lucide-react";
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

function getStatusBadge(status) {
  switch (status?.toLowerCase()) {
    case "sent":
    case "delivered":
    case "success":
      return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-normal shadow-inner px-2 py-0.5 capitalize flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {status}</Badge>;
    case "failed":
    case "error":
      return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 font-normal shadow-inner px-2 py-0.5 capitalize flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {status}</Badge>;
    case "retry":
      return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 font-normal shadow-inner px-2 py-0.5 capitalize flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {status}</Badge>;
    default:
      return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20 font-normal shadow-inner px-2 py-0.5 capitalize flex items-center gap-1"><Clock className="h-3 w-3" /> {status || "Pending"}</Badge>;
  }
}

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
  const [viewEmail, setViewEmail] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (showToast = false) => {
    setLoading(true);
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
      if (showToast) toast.success("Email queues and logs refreshed");
    } catch (e) {
      toast.error(e.message || "Failed to load email data");
    } finally {
      setLoading(false);
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
      toast.success(`Processed queue successfully`);
      load();
    } catch (e) {
      toast.error(e.message || "Process failed");
    }
  };

  const retryItem = async (id, e) => {
    e.stopPropagation(); // Prevent opening modal
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
        <div className="absolute -top-10 -left-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Mail className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-50 via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Email Infrastructure
            </h1>
          </div>
          <p className="text-slate-400 max-w-xl text-sm leading-relaxed ml-14">
            Manage provider configuration, templates, delivery queue, and logs.
          </p>
        </div>

        <Button 
          variant="outline" 
          onClick={() => load(true)} 
          disabled={loading}
          className="bg-slate-900/50 border-white/10 hover:bg-white/10 text-slate-200 hover:text-white backdrop-blur-xl rounded-xl h-11 px-5 transition-all shadow-lg shadow-black/20"
        >
          <RefreshCw className={`mr-2 h-4 w-4 text-indigo-400 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Tabs defaultValue="queue" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
          <TabsTrigger 
            value="queue" 
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400 data-[state=active]:border-indigo-500/30 border border-transparent text-slate-400 hover:text-slate-200 transition-all shadow-none data-[state=active]:shadow-[0_0_15px_rgba(99,102,241,0.1)]"
          >
            <Inbox className="mr-2 h-4 w-4" /> Queue
          </TabsTrigger>
          <TabsTrigger 
            value="templates" 
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 data-[state=active]:border-purple-500/30 border border-transparent text-slate-400 hover:text-slate-200 transition-all shadow-none data-[state=active]:shadow-[0_0_15px_rgba(168,85,247,0.1)]"
          >
            <FileText className="mr-2 h-4 w-4" /> Templates
          </TabsTrigger>
          <TabsTrigger 
            value="logs" 
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 data-[state=active]:border-cyan-500/30 border border-transparent text-slate-400 hover:text-slate-200 transition-all shadow-none data-[state=active]:shadow-[0_0_15px_rgba(6,182,212,0.1)]"
          >
            <History className="mr-2 h-4 w-4" /> Logs
          </TabsTrigger>
          <TabsTrigger 
            value="provider" 
            className="rounded-xl px-5 py-2.5 data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 data-[state=active]:border-emerald-500/30 border border-transparent text-slate-400 hover:text-slate-200 transition-all shadow-none data-[state=active]:shadow-[0_0_15px_rgba(16,185,129,0.1)]"
          >
            <Settings className="mr-2 h-4 w-4" /> Provider Config
          </TabsTrigger>
        </TabsList>

        <Card className="border border-white/5 bg-slate-900/40 backdrop-blur-2xl shadow-xl overflow-hidden rounded-2xl relative w-full">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

          {/* QUEUE TAB */}
          <TabsContent value="queue" className="m-0 border-none p-0 outline-none">
            <CardHeader className="px-8 py-6 border-b border-white/5 bg-slate-950/20 relative z-10 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-slate-200 font-semibold text-lg flex items-center gap-2">
                <Inbox className="h-5 w-5 text-indigo-400" />
                Dispatch Queue
              </CardTitle>
              <Button 
                onClick={processQueue}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl h-10 px-5 shadow-[0_0_15px_rgba(99,102,241,0.25)] border border-indigo-500/50 transition-all"
              >
                <Play className="mr-2 h-4 w-4" /> Process Now
              </Button>
            </CardHeader>
            <CardContent className="p-0 relative z-10">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 px-8 py-4 gap-4 hover:bg-slate-800/40 transition-colors cursor-pointer"
                  onClick={() => setViewEmail(item)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <Send className="h-4 w-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                      <p className="text-slate-200 font-medium group-hover:text-indigo-300 transition-colors truncate">{item.subject}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 ml-7">To: <span className="text-slate-400">{item.recipient}</span></p>
                    {item.error_message && (
                      <p className="text-xs text-rose-400 mt-2 ml-7 bg-rose-500/10 p-2 rounded-md border border-rose-500/20 inline-block">
                        Error: {item.error_message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {getStatusBadge(item.status)}
                    {(item.status === "failed" || item.status === "retry") && (
                      <Button size="sm" variant="outline" onClick={(e) => retryItem(item.id, e)} className="h-8 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border-amber-500/30">
                        <RotateCcw className="h-3 w-3 mr-1" /> Retry
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {queue.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500/50 mb-4" />
                  <p className="text-lg font-medium text-slate-300">Queue is completely clear!</p>
                  <p className="text-sm">All emails have been processed.</p>
                </div>
              )}
            </CardContent>
          </TabsContent>

          {/* TEMPLATES TAB */}
          <TabsContent value="templates" className="m-0 border-none p-0 outline-none">
            <CardHeader className="px-8 py-6 border-b border-white/5 bg-slate-950/20 relative z-10">
              <CardTitle className="text-slate-200 font-semibold text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-400" />
                Email Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 relative z-10 grid gap-4 grid-cols-1 md:grid-cols-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="group bg-slate-950/40 border border-white/5 rounded-xl p-5 hover:bg-slate-900/60 hover:border-purple-500/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-normal px-2 py-0.5 mb-3">{t.key}</Badge>
                    <p className="text-base font-semibold text-slate-200 leading-tight mb-2">{t.subject}</p>
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">{t.body_text || "No plain text fallback provided."}</p>
                  </div>
                  <div className="flex justify-end pt-2 border-t border-white/5">
                    <Button size="sm" variant="outline" onClick={() => setEditTpl({ ...t })} className="bg-slate-800 hover:bg-purple-500/20 hover:text-purple-300 border-white/10 hover:border-purple-500/30 text-slate-300 transition-colors">
                      Edit Template
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </TabsContent>

          {/* LOGS TAB */}
          <TabsContent value="logs" className="m-0 border-none p-0 outline-none">
            <CardHeader className="px-8 py-6 border-b border-white/5 bg-slate-950/20 relative z-10">
              <CardTitle className="text-slate-200 font-semibold text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-cyan-400" />
                Delivery Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 relative z-10">
              {logs.map((log) => {
                const qItem = queue.find((qi) => qi.id === log.queue_item);
                return (
                  <div key={log.id} className="border-b border-white/5 px-8 py-4 text-sm hover:bg-slate-800/40 transition-colors">
                    <div className="flex justify-between items-start gap-4">
                      <div className={qItem ? "cursor-pointer flex-1 min-w-0 group" : "flex-1 min-w-0"} onClick={() => qItem && setViewEmail(qItem)}>
                        <div className="flex items-center gap-2">
                          <Send className="h-3 w-3 text-slate-500" />
                          <span className={`text-slate-200 font-medium ${qItem ? "group-hover:text-cyan-400 transition-colors" : ""}`}>{log.subject}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 ml-5">Sent to: <span className="text-slate-400">{log.recipient}</span></p>
                      </div>
                      <div className="shrink-0">
                        {getStatusBadge(log.status)}
                      </div>
                    </div>
                    {log.provider_response && (
                      <div className="mt-3 ml-5 p-3 rounded-lg bg-slate-950/80 border border-white/5 text-xs text-slate-400 font-mono overflow-x-auto whitespace-pre-wrap">
                        {log.provider_response}
                      </div>
                    )}
                  </div>
                );
              })}
              {logs.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <History className="h-12 w-12 text-slate-600 mb-4 opacity-50" />
                  <p className="text-lg font-medium text-slate-300">No delivery logs yet.</p>
                </div>
              )}
            </CardContent>
          </TabsContent>

          {/* PROVIDER TAB */}
          <TabsContent value="provider" className="m-0 border-none p-0 outline-none">
            <CardHeader className="px-8 py-6 border-b border-white/5 bg-slate-950/20 relative z-10">
              <CardTitle className="text-slate-200 font-semibold text-lg flex items-center gap-2">
                <Settings className="h-5 w-5 text-emerald-400" />
                Brevo Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 relative z-10 max-w-2xl space-y-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-200/80 leading-relaxed">
                  Org API key is preferred. If empty, `BREVO_API_KEY` from Backend `.env` is used.
                  With neither set, emails will fallback to printing in the Django/Celery console.
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-slate-300 font-semibold">API Key</Label>
                  <Input
                    type="password"
                    placeholder={config ? "•••••••••••••••• (leave blank to keep existing)" : "Optional overriding API Key"}
                    value={configForm.api_key}
                    onChange={(e) => setConfigForm({ ...configForm, api_key: e.target.value })}
                    className="bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300 font-semibold">Sender Email Address</Label>
                  <Input
                    placeholder="e.g. alerts@stocksense.app"
                    value={configForm.sender_email}
                    onChange={(e) => setConfigForm({ ...configForm, sender_email: e.target.value })}
                    className="bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 h-11 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-slate-300 font-semibold">Sender Name</Label>
                    <Input
                      placeholder="e.g. StockSense Notifications"
                      value={configForm.sender_name}
                      onChange={(e) => setConfigForm({ ...configForm, sender_name: e.target.value })}
                      className="bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 h-11 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 font-semibold">Reply-To Address</Label>
                    <Input
                      placeholder="e.g. support@stocksense.app"
                      value={configForm.reply_to}
                      onChange={(e) => setConfigForm({ ...configForm, reply_to: e.target.value })}
                      className="bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 h-11 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5">
                <Button 
                  onClick={saveConfig}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl px-6 h-11 shadow-lg shadow-emerald-500/25 transition-all w-full sm:w-auto"
                >
                  <Save className="mr-2 h-4 w-4" /> Save Configuration
                </Button>
              </div>
            </CardContent>
          </TabsContent>
        </Card>
      </Tabs>

      {/* EDIT TEMPLATE MODAL */}
      <Dialog open={!!editTpl} onOpenChange={(v) => !v && setEditTpl(null)}>
        <DialogContent className="max-w-3xl bg-[#0F172A] border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.15)] rounded-2xl p-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <DialogHeader className="p-6 pb-2 border-b border-white/5">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-400" /> Edit Template — <span className="text-purple-300 font-mono text-sm bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 ml-2">{editTpl?.key}</span>
            </DialogTitle>
          </DialogHeader>
          
          {editTpl && (
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <Label className="text-slate-300 font-semibold">Subject Line</Label>
                <Input
                  value={editTpl.subject}
                  onChange={(e) => setEditTpl({ ...editTpl, subject: e.target.value })}
                  className="bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 h-11 rounded-xl font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 font-semibold">HTML Body</Label>
                <Textarea
                  rows={8}
                  value={editTpl.body_html}
                  onChange={(e) => setEditTpl({ ...editTpl, body_html: e.target.value })}
                  className="bg-slate-900 border-white/10 text-white focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 rounded-xl font-mono text-xs custom-scrollbar resize-y p-4"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 font-semibold">Plain Text Body (Fallback)</Label>
                <Textarea
                  rows={4}
                  value={editTpl.body_text || ""}
                  onChange={(e) => setEditTpl({ ...editTpl, body_text: e.target.value })}
                  className="bg-slate-900 border-white/10 text-slate-300 focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 rounded-xl font-mono text-xs custom-scrollbar resize-y p-4"
                />
              </div>
            </div>
          )}
          
          <DialogFooter className="p-6 pt-0 border-t border-white/5 mt-2 flex gap-3">
            <Button variant="ghost" onClick={() => setEditTpl(null)} className="text-slate-400 hover:text-white rounded-xl">
              Cancel
            </Button>
            <Button onClick={saveTemplate} className="bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25">
              <Save className="mr-2 h-4 w-4" /> Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW EMAIL MODAL */}
      <Dialog open={!!viewEmail} onOpenChange={(v) => !v && setViewEmail(null)}>
        <DialogContent className="max-w-3xl bg-[#0F172A] border border-indigo-500/30 shadow-[0_0_50px_rgba(99,102,241,0.15)] rounded-2xl p-0 overflow-hidden flex flex-col max-h-[85vh]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
          <DialogHeader className="p-6 pb-4 border-b border-white/5 shrink-0">
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Mail className="h-5 w-5 text-indigo-400" /> Email Preview
            </DialogTitle>
          </DialogHeader>
          
          {viewEmail && (
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <div className="p-6 border-b border-white/5 bg-slate-950/50 space-y-3">
                <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                  <div className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Status</div>
                  <div>{getStatusBadge(viewEmail.status)}</div>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                  <div className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Recipient</div>
                  <div className="text-slate-200 font-mono text-sm bg-slate-900 px-3 py-1.5 rounded-lg border border-white/5 w-fit select-all">{viewEmail.recipient}</div>
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                  <div className="text-slate-500 font-semibold text-xs uppercase tracking-wider">Subject</div>
                  <div className="text-slate-100 font-semibold">{viewEmail.subject}</div>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Rendered Content</h4>
                </div>
                
                {/* Simulated Email Client Container */}
                <div className="rounded-xl bg-white text-slate-800 border border-white/10 shadow-inner overflow-hidden flex flex-col min-h-[300px]">
                  <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-2 shrink-0">
                    <div className="h-2.5 w-2.5 rounded-full bg-rose-400"></div>
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400"></div>
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400"></div>
                    <div className="ml-2 text-xs font-medium text-slate-400 truncate flex-1">{viewEmail.subject}</div>
                  </div>
                  <div 
                    className="p-6 overflow-x-auto flex-1 email-preview-content"
                    dangerouslySetInnerHTML={{ __html: viewEmail.body_html || `<pre style="font-family: monospace; font-size: 14px; white-space: pre-wrap; color: #1e293b;">${viewEmail.body_text || ''}</pre>` }}
                  />
                </div>
                
                {/* Verification Link Extraction (if any) */}
                {viewEmail.body_text && viewEmail.body_text.includes("token=") && (
                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex flex-col gap-2 mt-6">
                    <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
                      <CheckCircle2 className="h-4 w-4" /> Detected Verification Link
                    </div>
                    <p className="text-xs text-indigo-200/70 mb-1">We extracted this link from the email body for easy testing:</p>
                    <a 
                      href={viewEmail.body_text.match(/https?:\/\/[^\s]+/)?.[0] || "#"} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-sm text-indigo-400 bg-indigo-950 px-3 py-2 rounded-lg border border-indigo-500/30 break-all font-mono hover:bg-indigo-900 transition-colors inline-block w-fit"
                    >
                      {viewEmail.body_text.match(/https?:\/\/[^\s]+/)?.[0] || "Click here to verify"}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="p-6 shrink-0 border-t border-white/5 flex gap-3">
            <Button variant="outline" onClick={() => setViewEmail(null)} className="text-slate-300 hover:text-white rounded-xl bg-slate-800 border-white/10">
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
