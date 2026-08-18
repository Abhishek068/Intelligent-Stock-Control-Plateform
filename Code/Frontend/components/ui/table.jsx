import * as React from "react";
import { cn } from "@/lib/utils";

function Table({ className, ...props }) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}
function TableHeader({ className, ...props }) {
  return <thead className={cn("bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 [&_tr]:border-b", className)} {...props} />;
}
function TableBody({ className, ...props }) {
  return <tbody className={cn("[&_tr:last-child]:border-0 divide-y divide-slate-200/60 dark:divide-slate-800/60", className)} {...props} />;
}
function TableFooter({ className, ...props }) {
  return <tfoot className={cn("bg-slate-50/80 dark:bg-muted/50 border-t border-slate-200 dark:border-slate-800 font-medium [&>tr]:last:border-b-0", className)} {...props} />;
}
function TableRow({ className, ...props }) {
  return <tr className={cn("hover:bg-slate-50/90 dark:hover:bg-white/5 data-[state=selected]:bg-slate-100 dark:data-[state=selected]:bg-white/10 border-b border-slate-200/70 dark:border-white/5 transition-colors", className)} {...props} />;
}
function TableHead({ className, ...props }) {
  return <th className={cn("text-slate-600 dark:text-slate-400 h-10 px-4 text-left align-middle font-bold uppercase text-[11px] tracking-wider whitespace-nowrap [&:has([role=checkbox])]:pr-0", className)} {...props} />;
}
function TableCell({ className, ...props }) {
  return <td className={cn("p-4 align-middle whitespace-nowrap text-slate-800 dark:text-slate-200 text-xs sm:text-sm [&:has([role=checkbox])]:pr-0", className)} {...props} />;
}
function TableCaption({ className, ...props }) {
  return <caption className={cn("text-slate-500 dark:text-muted-foreground mt-4 text-sm", className)} {...props} />;
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };