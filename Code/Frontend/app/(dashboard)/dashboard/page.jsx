"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";

export default function DashboardRedirectPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    if (user.is_superuser || user.role === "admin" || user.role === "superadmin") {
      router.replace("/admin");
    } else if (user.role === "manager") {
      router.replace("/manager");
    } else if (user.role === "staff") {
      router.replace("/staff");
    } else {
      router.replace("/admin");
    }
  }, [user, router]);

  return (
    <div className="flex h-[80vh] items-center justify-center text-slate-400">
      <div className="flex items-center gap-3">
        <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium">Redirecting to your dashboard...</span>
      </div>
    </div>
  );
}
