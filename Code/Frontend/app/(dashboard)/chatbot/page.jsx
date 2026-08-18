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
    <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-slate-50 dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">AI Assistant</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Natural-language inventory Q&A with tool-backed answers (OpenAI or offline mode)
        </p>
      </div>

      <Card className="border border-slate-200/80 dark:border-white/5 bg-white/85 dark:bg-slate-900/40 backdrop-blur-2xl shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-200/80 dark:border-white/5 bg-slate-50/50 dark:bg-slate-950/20">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold">
            <Bot className="h-5 w-5 text-teal-600 dark:text-teal-400" /> Conversation
          </CardTitle>
          <CardDescription className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
            Leave OPENAI_API_KEY empty to use offline keyword mode
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                onClick={() => send(s)}
                disabled={loading}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="h-[420px] space-y-3 overflow-y-auto rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/60 p-4">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={cn(
                  "max-w-[85%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed shadow-xs",
                  m.role === "user"
                    ? "ml-auto bg-teal-600 text-white font-medium"
                    : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-white/5"
                )}
              >
                {m.content}
                {m.role === "assistant" && m.mode && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline" className="text-[10px] font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      {m.mode}
                    </Badge>
                    {(m.tools_used || []).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px] font-bold bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="rounded-xl bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-white/5 font-medium animate-pulse">
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
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-xl h-11 font-medium"
            />
            <Button type="submit" disabled={loading || !input.trim()} className="bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl h-11 px-6 shadow-md cursor-pointer">
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
