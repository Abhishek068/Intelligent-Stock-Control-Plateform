"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
      <div className="rounded-full bg-red-100 p-3">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-100">
          Something went wrong
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {error?.message || "An unexpected error occurred."}
        </p>
      </div>
      <Button onClick={reset} variant="outline">
        <RefreshCw className="mr-2 h-4 w-4" />
        Try Again
      </Button>
    </div>);

}
