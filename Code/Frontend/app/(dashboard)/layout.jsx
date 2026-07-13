"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useUIStore } from "@/lib/store";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const { sidebarCollapsed } = useUIStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push("/login");
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !user) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className={cn(
        "flex-1 transition-all duration-300",
        sidebarCollapsed ? "pl-16" : "pl-64"
      )}>
        <Topbar />
        <main className="min-h-[calc(100vh-64px)] p-6">{children}</main>
      </div>
    </div>);

}