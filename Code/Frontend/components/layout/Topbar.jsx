"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Package, Truck, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/auth.store";
import { searchApi, notificationsApi } from "@/lib/api";

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);



  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        e.preventDefault();
        const r = results[selectedIndex];
        router.push(r.url);
        setOpen(false);
        setQ("");
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const getResultIcon = (type) => {
    switch (type?.toLowerCase()) {
      case "product":
        return <Package className="h-4 w-4 text-sky-400" />;
      case "supplier":
        return <Truck className="h-4 w-4 text-emerald-400" />;
      case "user":
      case "staff":
        return <User className="h-4 w-4 text-amber-400" />;
      default:
        return <Search className="h-4 w-4 text-indigo-400" />;
    }
  };

  const getResultTypeBadge = (type) => {
    switch (type?.toLowerCase()) {
      case "product":
        return <span className="rounded bg-sky-550/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-400 border border-sky-500/20">Product</span>;
      case "supplier":
        return <span className="rounded bg-emerald-550/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">Supplier</span>;
      case "user":
      case "staff":
        return <span className="rounded bg-amber-550/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400 border border-amber-500/20">Staff</span>;
      default:
        return <span className="rounded bg-slate-550/10 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-500/20">Item</span>;
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  useEffect(() => {
    notificationsApi
      .unreadCount()
      .then((res) => setUnread(res.data?.count || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await searchApi.search(q.trim());
        setResults(res.data?.results || []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/5 bg-slate-950 px-6 shadow-sm">
      <div className="relative flex-1 max-w-md">
        <Input
          placeholder="Search products, suppliers, users..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-4 bg-white/5 border-0 text-slate-200 placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-indigo-500 rounded-lg focus-visible:bg-slate-900/50 transition-all"
        />
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
        {open && results.length > 0 && (
          <div className="absolute top-full mt-1.5 w-full rounded-lg border border-white/10 bg-slate-900/95 backdrop-blur-md shadow-xl z-50 max-h-72 overflow-y-auto p-1.5 space-y-0.5">
            {results.map((r, index) => (
              <button
                key={`${r.type}-${r.id}`}
                className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-md text-sm transition-all duration-150 cursor-pointer ${
                  selectedIndex === index ? "bg-indigo-600 text-white" : "hover:bg-slate-800/80 text-slate-300"
                }`}
                onMouseDown={() => {
                  router.push(r.url);
                  setOpen(false);
                  setQ("");
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded bg-slate-800/80 ${selectedIndex === index ? "bg-indigo-700 text-white" : "text-slate-400"}`}>
                    {getResultIcon(r.type)}
                  </div>
                  <div>
                    <span className={`font-medium ${selectedIndex === index ? "text-white" : "text-slate-250"}`}>{r.title}</span>
                    <span className={`block text-xs ${selectedIndex === index ? "text-indigo-200" : "text-slate-500"}`}>
                      {r.subtitle}
                    </span>
                  </div>
                </div>
                <div>
                  {getResultTypeBadge(r.type)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-4">
        <span className="hidden rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 text-xs font-medium uppercase text-indigo-400 sm:inline">
          {user?.primaryRole || user?.role}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          onClick={() => router.push("/notifications")}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-rose-500 text-[10px] text-white flex items-center justify-center px-1">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 border border-indigo-500/30">
              <Avatar className="h-8 w-8 bg-indigo-600">
                <AvatarFallback className="text-white bg-gradient-to-br from-indigo-500 to-purple-600">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-slate-900 border-white/10 text-slate-200">
            <DropdownMenuItem disabled className="text-slate-400">
              {user?.email}
            </DropdownMenuItem>
            {(user?.is_superuser || user?.role === "admin") && (
              <DropdownMenuItem
                className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer"
                onClick={() => router.push("/settings")}
              >
                Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="hover:bg-slate-800 focus:bg-slate-800 cursor-pointer"
              onClick={() => router.push("/change-password")}
            >
              Change password
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-rose-400 hover:bg-rose-950/50 focus:bg-rose-950/50 cursor-pointer"
              onClick={handleLogout}
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
