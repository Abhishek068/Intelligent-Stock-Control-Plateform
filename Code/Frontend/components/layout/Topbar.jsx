"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Package, Truck, User, Sun, Moon, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { authApi, searchApi } from "@/lib/api";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth.store";
import { useNotificationStore } from "@/stores/notification.store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function Topbar() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const unread = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isDark, setIsDark] = useState(true);

  // Change Password Modal State
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!user?.must_change_password && !currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await authApi.changePassword(
        user?.must_change_password ? "" : currentPassword,
        newPassword
      );
      if (res?.data?.user) setUser(res.data.user);
      toast.success("Password changed successfully!");
      setChangePasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : (err.message || "Failed to change password"));
    } finally {
      setSavingPassword(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light") {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

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
    fetchUnreadCount();
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 20000);
    const onFocus = () => fetchUnreadCount();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchUnreadCount]);

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
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200/80 dark:border-white/5 bg-white/95 dark:bg-slate-950 px-6 shadow-sm">
      <div className="relative flex-1 max-w-md">
        <Input
          placeholder="Search products, suppliers, users..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-4 bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-0 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-indigo-500 rounded-xl focus-visible:bg-white dark:focus-visible:bg-slate-900/50 transition-all"
        />
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none z-10" />
        {open && results.length > 0 && (
          <div className="absolute top-full mt-1.5 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl z-50 max-h-72 overflow-y-auto p-1.5 space-y-0.5">
            {results.map((r, index) => (
              <button
                key={`${r.type}-${r.id}`}
                className={`w-full flex items-center justify-between text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 cursor-pointer ${
                  selectedIndex === index ? "bg-indigo-600 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-300"
                }`}
                onMouseDown={() => {
                  router.push(r.url);
                  setOpen(false);
                  setQ("");
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 ${selectedIndex === index ? "bg-indigo-700 text-white" : "text-slate-600 dark:text-slate-400"}`}>
                    {getResultIcon(r.type)}
                  </div>
                  <div>
                    <span className={`font-semibold ${selectedIndex === index ? "text-white" : "text-slate-900 dark:text-slate-100"}`}>{r.title}</span>
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
        <span className="hidden rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 px-3 py-1 text-xs font-semibold uppercase dark:text-indigo-400 sm:inline">
          {user?.primaryRole || user?.role}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors rounded-xl cursor-pointer"
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-amber-400" />
          ) : (
            <Moon className="h-5 w-5 text-indigo-600" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
          onClick={() => router.push("/notifications")}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-rose-500 text-[10px] text-white flex items-center justify-center px-1 font-bold">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 border border-indigo-500/30 cursor-pointer">
              <Avatar className="h-8 w-8 bg-indigo-600">
                <AvatarFallback className="text-white bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 shadow-xl rounded-xl">
            <DropdownMenuItem disabled className="text-slate-400 font-mono text-xs">
              {user?.email}
            </DropdownMenuItem>
            {(user?.is_superuser || user?.role === "admin") && (
              <DropdownMenuItem
                className="hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-200"
                onClick={() => router.push("/settings")}
              >
                Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-200"
              onClick={() => setChangePasswordModalOpen(true)}
            >
              Change password
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 focus:bg-rose-50 dark:focus:bg-rose-950/50 cursor-pointer"
              onClick={handleLogout}
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Change Password Dialog Modal */}
      <Dialog open={changePasswordModalOpen} onOpenChange={setChangePasswordModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {user?.must_change_password ? "Set New Password" : "Change Password"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Update your account password for <strong className="text-slate-700 dark:text-slate-300 font-mono">{user?.email}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleChangePasswordSubmit} className="space-y-4 py-2">
            {!user?.must_change_password && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Current Password</Label>
                <div className="relative">
                  <Input
                    type={showCurrent ? "text" : "password"}
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-xl text-xs h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">New Password</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-xl text-xs h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Confirm New Password</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-white dark:bg-slate-950 border-slate-200 dark:border-white/10 rounded-xl text-xs h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <DialogFooter className="gap-2 pt-3">
              <Button type="button" variant="outline" onClick={() => setChangePasswordModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={savingPassword} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl">
                {savingPassword ? "Updating..." : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  );
}
