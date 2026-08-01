"use client";
import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

function DropdownMenuContent({ className, sideOffset = 4, ...props }) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "bg-slate-900/95 backdrop-blur-xl text-slate-100 z-50 min-w-[10rem] overflow-hidden rounded-2xl border border-white/10 p-1.5 shadow-2xl shadow-black/50 animate-in fade-in-0 zoom-in-95 duration-150",
          className
        )}
        {...props} />
      
    </DropdownMenuPrimitive.Portal>);

}

function DropdownMenuItem({ className, inset, variant = "default", ...props }) {
  return (
    <DropdownMenuPrimitive.Item
      data-inset={inset}
      data-variant={variant}
      className={cn(
        "cursor-pointer relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium outline-none select-none transition-all duration-200 text-slate-200 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-indigo-500 hover:text-white hover:translate-x-1.5 hover:shadow-md hover:shadow-indigo-500/20 data-[highlighted]:bg-gradient-to-r data-[highlighted]:from-indigo-600 data-[highlighted]:to-indigo-500 data-[highlighted]:text-white data-[highlighted]:translate-x-1.5 data-[highlighted]:shadow-md data-[highlighted]:shadow-indigo-500/20 focus:bg-gradient-to-r focus:from-indigo-600 focus:to-indigo-500 focus:text-white focus:translate-x-1.5 data-[variant=destructive]:text-rose-400 data-[variant=destructive]:hover:from-rose-600 data-[variant=destructive]:hover:to-rose-500 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 my-0.5",
        className
      )}
      {...props} />);


}

function DropdownMenuCheckboxItem({ className, children, checked, ...props }) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      className={cn(
        "cursor-pointer relative flex items-center gap-2.5 rounded-xl py-2 pr-4 pl-9 text-sm font-medium outline-none select-none transition-all duration-200 text-slate-200 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-indigo-500 hover:text-white hover:translate-x-1.5 hover:shadow-md hover:shadow-indigo-500/20 data-[highlighted]:bg-gradient-to-r data-[highlighted]:from-indigo-600 data-[highlighted]:to-indigo-500 data-[highlighted]:text-white data-[highlighted]:translate-x-1.5 data-[highlighted]:shadow-md data-[highlighted]:shadow-indigo-500/20 focus:bg-gradient-to-r focus:from-indigo-600 focus:to-indigo-500 focus:text-white focus:translate-x-1.5 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 my-0.5",
        className
      )}
      checked={checked}
      {...props}>
      
      <span className="pointer-events-none absolute left-2.5 flex size-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-3.5 stroke-[3]" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>);

}

function DropdownMenuRadioItem({ className, children, ...props }) {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn(
        "cursor-pointer relative flex items-center gap-2.5 rounded-xl py-2 pr-4 pl-9 text-sm font-medium outline-none select-none transition-all duration-200 text-slate-200 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-indigo-500 hover:text-white hover:translate-x-1.5 hover:shadow-md hover:shadow-indigo-500/20 data-[highlighted]:bg-gradient-to-r data-[highlighted]:from-indigo-600 data-[highlighted]:to-indigo-500 data-[highlighted]:text-white data-[highlighted]:translate-x-1.5 data-[highlighted]:shadow-md data-[highlighted]:shadow-indigo-500/20 focus:bg-gradient-to-r focus:from-indigo-600 focus:to-indigo-500 focus:text-white focus:translate-x-1.5 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 my-0.5",
        className
      )}
      {...props}>
      
      <span className="pointer-events-none absolute left-2.5 flex size-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon className="size-2 fill-current" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>);

}

function DropdownMenuLabel({ className, inset, ...props }) {
  return <DropdownMenuPrimitive.Label data-inset={inset} className={cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className)} {...props} />;
}

function DropdownMenuSeparator({ className, ...props }) {
  return <DropdownMenuPrimitive.Separator className={cn("bg-border -mx-1 my-1 h-px", className)} {...props} />;
}

function DropdownMenuShortcut({ className, ...props }) {
  return <span className={cn("text-muted-foreground ml-auto text-xs tracking-widest", className)} {...props} />;
}

function DropdownMenuSubTrigger({ className, inset, children, ...props }) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-inset={inset}
      className={cn("focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8", className)}
      {...props}>
      
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>);

}

function DropdownMenuSubContent({ className, ...props }) {
  return (
    <DropdownMenuPrimitive.SubContent
      className={cn("bg-popover text-popover-foreground z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg", className)}
      {...props} />);


}

export {
  DropdownMenu, DropdownMenuPortal, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuLabel, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuRadioGroup,
  DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub,
  DropdownMenuSubTrigger, DropdownMenuSubContent };