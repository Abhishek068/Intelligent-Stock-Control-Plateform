"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore, useUIStore } from "@/lib/store";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ChatWidget } from "@/components/chatbot/ChatWidget";
import { cn } from "@/lib/utils";
import { authApi } from "@/lib/api";

export default function DashboardLayout({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const { sidebarCollapsed } = useUIStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) return;
    authApi
      .me()
      .then((res) => {
        if (res?.success && res.data) {
          useAuthStore.getState().setUser(res.data);
        } else {
          useAuthStore.getState().logout();
          router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      })
      .catch(() => {
        useAuthStore.getState().logout();
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      });
  }, [isAuthenticated, router, pathname]);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated || !user) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user.must_change_password && pathname !== "/change-password") {
      router.push("/change-password");
    }
  }, [isAuthenticated, user, router, isHydrated, pathname]);

  if (!isHydrated || !isAuthenticated || !user) {
    return <div className="flex h-screen items-center justify-center text-slate-400">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen max-w-full overflow-x-hidden bg-slate-50 dark:bg-[#0B0F1A] relative text-slate-900 dark:text-slate-100">
      {/* Background Ambient Glows */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 dark:bg-indigo-600/15 rounded-full blur-[150px] pointer-events-none -translate-y-1/2 -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/10 dark:bg-purple-600/10 rounded-full blur-[140px] pointer-events-none translate-y-1/3 -z-10" />
      <Sidebar />
      <div className={cn("flex-1 min-w-0 max-w-full overflow-x-hidden transition-all duration-300", sidebarCollapsed ? "pl-16" : "pl-64")}>
        <Topbar />
        <main className="min-h-[calc(100vh-64px)] p-4 sm:p-6 w-full max-w-full overflow-x-hidden">{children}</main>
        <ChatWidget />
      </div>
    </div>
  );
}
