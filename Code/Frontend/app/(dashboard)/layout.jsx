"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserStore, useUIStore } from "@/lib/store";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }) {
  const { role } = useUserStore();
  const { sidebarCollapsed } = useUIStore();
  const router = useRouter();

  useEffect(() => {
    if (!role) {
      router.push("/login");
    }
  }, [role, router]);

  if (!role) {
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
        <main className="min-h-[calc(100vh-64px)] bg-slate-50 p-6">{children}</main>
      </div>
    </div>
  );
}