import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground selection:bg-blue-500/30 selection:text-white flex h-10 w-full min-w-0 rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur-md px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 shadow-inner transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "hover:border-slate-700/80 focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/15 focus-visible:bg-slate-950/90",
        "aria-invalid:ring-rose-500/20 aria-invalid:border-rose-500",
        className
      )}
      {...props}
    />
  );
}

export { Input };