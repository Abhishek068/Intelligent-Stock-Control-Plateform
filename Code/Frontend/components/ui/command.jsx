"use client";
import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function Command({ className, ...props }) {
  return (
    <CommandPrimitive
      className={cn("bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md", className)}
      {...props} />);


}

function CommandDialog({ children, ...props }) {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0">
        <Command className="[&_[cmdk-group-heading]]:text-muted-foreground **:data-[slot=command-input-wrapper]:h-12">{children}</Command>
      </DialogContent>
    </Dialog>);

}

function CommandInput({ className, ...props }) {
  return (
    <div data-slot="command-input-wrapper" className="flex h-9 items-center gap-2 border-b px-3">
      <SearchIcon className="size-4 shrink-0 opacity-50" />
      <CommandPrimitive.Input
        className={cn("placeholder:text-muted-foreground flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50", className)}
        {...props} />
      
    </div>);

}

function CommandList({ className, ...props }) {
  return <CommandPrimitive.List className={cn("max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto", className)} {...props} />;
}
function CommandEmpty(props) {
  return <CommandPrimitive.Empty className="py-6 text-center text-sm" {...props} />;
}
function CommandGroup({ className, ...props }) {
  return (
    <CommandPrimitive.Group
      className={cn("text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium", className)}
      {...props} />);


}
function CommandSeparator({ className, ...props }) {
  return <CommandPrimitive.Separator className={cn("bg-border -mx-1 h-px", className)} {...props} />;
}
function CommandItem({ className, ...props }) {
  return (
    <CommandPrimitive.Item
      className={cn("data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50", className)}
      {...props} />);


}
function CommandShortcut({ className, ...props }) {
  return <span className={cn("text-muted-foreground ml-auto text-xs tracking-widest", className)} {...props} />;
}

export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut, CommandSeparator };