import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-20 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-2xs outline-none transition-all disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20 focus-visible:ring-2",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };