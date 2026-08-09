"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { analyticsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useRoleAccess } from "@/hooks/useRoleAccess";

const SUGGESTIONS = [
  "What is my current inventory valuation?",
  "Which products are low on stock?",
  "What should I reorder?",
  "What batches expire soon?",
];

export function ChatWidget() {
  const { isSuperAdmin, hasPermission } = useRoleAccess();
  const canChat = isSuperAdmin || hasPermission("forecasting", "view");
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi — I'm the StockSense inventory assistant. Ask about valuation, low stock, reorders, expiry, or alerts.",
      mode: null,
      tools_used: [],
    },
  ]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  if (!canChat) return null;

  const send = async (text) => {
    const message = (text || input).trim();
    if (!message || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);
    try {
      const res = await analyticsApi.chatbotQuery(message);
      const data = res?.data || res;
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "No reply.",
          mode: data.mode,
          tools_used: data.tools_used || [],
        },
      ]);
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : "Chat request failed";
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Sorry — ${msg}`, mode: null, tools_used: [] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        size="icon"
        className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open AI assistant"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>

      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-3">
            <Bot className="h-5 w-5 text-teal-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-100">AI Assistant</p>
              <p className="text-[11px] text-slate-400">Read-only inventory Q&A</p>
            </div>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={cn(
                  "max-w-[90%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap",
                  m.role === "user"
                    ? "ml-auto bg-teal-600 text-white"
                    : "bg-slate-800 text-slate-100"
                )}
              >
                {m.content}
                {m.role === "assistant" && m.mode && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px]">
                      {m.mode}
                    </Badge>
                    {(m.tools_used || []).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-400">
                Thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="space-y-2 border-t border-slate-800 p-3">
            <div className="flex flex-wrap gap-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
                  onClick={() => send(s)}
                  disabled={loading}
                >
                  {s.length > 36 ? `${s.slice(0, 36)}…` : s}
                </button>
              ))}
            </div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about inventory..."
                disabled={loading}
                className="bg-slate-900"
              />
              <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
