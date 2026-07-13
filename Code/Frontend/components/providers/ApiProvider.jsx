"use client";

import { useEffect } from "react";
import { configureApiClient } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth.store";

export function ApiProvider({ children }) {
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    configureApiClient({
      getAccessToken: () => useAuthStore.getState().accessToken,
      refreshAccessToken: () => useAuthStore.getState().refreshSession(),
      onUnauthorized: () => {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      }
    });
  }, []);

  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading...
      </div>);

  }

  return children;
}