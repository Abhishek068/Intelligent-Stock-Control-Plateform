"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootError({ error, reset }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-slate-100 p-6">
      <div className="rounded-full bg-rose-500/10 p-4 text-rose-400 mb-4 border border-rose-500/20">
        <AlertTriangle className="h-10 w-10 text-rose-500" />
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold tracking-tight text-slate-100">
          Application Error
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {error?.message || "An unexpected error occurred while loading the application."}
        </p>
      </div>
      <Button
        onClick={() => reset()}
        className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Reload Application
      </Button>
    </div>
  );
}
