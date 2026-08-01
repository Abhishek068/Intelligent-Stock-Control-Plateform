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
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs outline-none data-[size=default]:h-9 data-[size=sm]:h-8 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}>
      
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon className="size-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>);

}

function SelectContent({ className, children, position = "popper", ...props }) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        className={cn(
          "bg-slate-900/95 backdrop-blur-xl text-slate-100 relative z-50 max-h-96 min-w-[10rem] overflow-x-hidden overflow-y-auto rounded-2xl border border-white/10 shadow-2xl shadow-black/50 p-1.5 animate-in fade-in-0 zoom-in-95 duration-150",
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
        "cursor-pointer relative flex w-full items-center gap-2.5 rounded-xl py-2.5 pr-10 pl-3.5 text-sm font-medium outline-none select-none transition-all duration-200 text-slate-200 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-indigo-500 hover:text-white hover:translate-x-1.5 hover:shadow-md hover:shadow-indigo-500/20 data-[highlighted]:bg-gradient-to-r data-[highlighted]:from-indigo-600 data-[highlighted]:to-indigo-500 data-[highlighted]:text-white data-[highlighted]:translate-x-1.5 data-[highlighted]:shadow-md data-[highlighted]:shadow-indigo-500/20 focus:bg-gradient-to-r focus:from-indigo-600 focus:to-indigo-500 focus:text-white focus:translate-x-1.5 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 my-0.5",
        className
      )}
      {...props}>
      
      <span className="absolute right-2.5 flex size-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-3.5 stroke-[3]" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>);

}

function SelectLabel({ className, ...props }) {
  return <SelectPrimitive.Label className={cn("text-slate-400 font-semibold px-3 py-2 text-xs uppercase tracking-wider", className)} {...props} />;
}
function SelectSeparator({ className, ...props }) {
  return <SelectPrimitive.Separator className={cn("bg-white/10 -mx-1 my-1 h-px", className)} {...props} />;
}

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator };