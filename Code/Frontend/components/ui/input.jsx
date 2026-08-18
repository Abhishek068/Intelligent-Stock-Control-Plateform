import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground selection:bg-indigo-500/30 selection:text-white flex h-10 w-full min-w-0 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 backdrop-blur-sm px-3.5 py-1.5 text-sm text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs transition-all outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 focus-visible:ring-2",
        "aria-invalid:ring-rose-500/20 aria-invalid:border-rose-500",
        className
      )}
      {...props}
    />
  );
}

export { Input };