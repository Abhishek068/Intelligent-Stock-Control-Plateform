"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleGate } from "@/components/shared/ModuleGate";
import { analyticsApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "What is my current inventory valuation?",
  "Which products are low on stock?",
  "What should I reorder?",
  "What batches expire soon?",
  "Show open alerts",
  "Supplier performance overview",
];

function ChatbotPageContent() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Ask natural-language questions about valuation, stock levels, reorders, expiry, forecasts, alerts, or supplier scores. I am read-only and cannot change inventory.",
      mode: null,
      tools_used: [],
    },
  ]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">AI Assistant</h1>
        <p className="text-slate-400">
          Natural-language inventory Q&A with tool-backed answers (OpenAI or offline mode)
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-teal-400" /> Conversation
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Leave OPENAI_API_KEY empty to use offline keyword mode
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
                onClick={() => send(s)}
                disabled={loading}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="h-[420px] space-y-3 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/60 p-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={cn(
                  "max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap",
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
              placeholder="Ask about inventory valuation, low stock, reorders..."
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              <Send className="mr-2 h-4 w-4" /> Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ChatbotPage() {
  return (
    <ModuleGate module="forecasting" action="view">
      <ChatbotPageContent />
    </ModuleGate>
  );
}
