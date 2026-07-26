"use client";

import { Shield } from "lucide-react";
import { useRoleAccess } from "@/hooks/useRoleAccess";

export function ModuleGate({ module, action = "view", children, fallbackMessage }) {
  const { isSuperAdmin, hasPermission } = useRoleAccess();
  const allowed = isSuperAdmin || hasPermission(module, action);

  if (!allowed) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Shield className="h-16 w-16 text-slate-300" />
        <h2 className="text-2xl font-semibold">Access Denied</h2>
        <p className="text-slate-400">
          {fallbackMessage ||
            `You need ${module}:${action} permission to use this page.`}
        </p>
      </div>
    );
  }

  return children;
}
