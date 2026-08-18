"use client";
import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const Select = SelectPrimitive.Root;
const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

function SelectTrigger({ className, size = "default", children, ...props }) {
  return (
    <SelectPrimitive.Trigger
      data-size={size}
      className={cn(
        "border-slate-200 dark:border-white/10 data-[placeholder]:text-slate-500 dark:data-[placeholder]:text-slate-400 [&_svg:not([class*='text-'])]:text-slate-500 dark:[&_svg:not([class*='text-'])]:text-slate-400 flex w-fit items-center justify-between gap-2 rounded-xl border bg-white dark:bg-slate-950/50 px-3 py-2 text-sm text-slate-800 dark:text-slate-200 whitespace-nowrap shadow-xs outline-none data-[size=default]:h-10 data-[size=sm]:h-8 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
        className
      )}
      {...props}>
      
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-70" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>);

}

function SelectContent({ className, children, position = "popper", ...props }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        className={cn(
          "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl text-slate-900 dark:text-slate-100 relative z-50 max-h-96 min-w-[10rem] overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl shadow-slate-300/40 dark:shadow-black/50 p-1.5 animate-in fade-in-0 zoom-in-95 duration-150",
          position === "popper" && "data-[side=bottom]:translate-y-1.5 data-[side=top]:-translate-y-1.5",
          className
        )}
        {...props}>
        
        <SelectPrimitive.Viewport className={cn("p-1", position === "popper" && "w-full min-w-[var(--radix-select-trigger-width)]")}>
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>);

}

function SelectItem({ className, children, ...props }) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "cursor-pointer relative flex w-full items-center gap-2.5 rounded-xl py-2.5 pr-10 pl-3.5 text-sm font-medium outline-none select-none transition-all duration-200 text-slate-700 dark:text-slate-200 hover:bg-indigo-600 hover:text-white hover:translate-x-1.5 hover:shadow-md hover:shadow-indigo-500/20 data-[highlighted]:bg-indigo-600 data-[highlighted]:text-white data-[highlighted]:translate-x-1.5 data-[highlighted]:shadow-md data-[highlighted]:shadow-indigo-500/20 focus:bg-indigo-600 focus:text-white focus:translate-x-1.5 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 my-0.5",
        className
      )}
      {...props}>
      
      <span className="absolute right-2.5 flex size-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-3.5 stroke-[3]" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>);

}

function SelectLabel({ className, ...props }) {
  return <SelectPrimitive.Label className={cn("text-slate-500 dark:text-slate-400 font-semibold px-3 py-2 text-xs uppercase tracking-wider", className)} {...props} />;
}
function SelectSeparator({ className, ...props }) {
  return <SelectPrimitive.Separator className={cn("bg-slate-200 dark:bg-white/10 -mx-1 my-1 h-px", className)} {...props} />;
}

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator };