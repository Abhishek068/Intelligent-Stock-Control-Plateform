import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:bg-indigo-500 hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:scale-[1.02]",
        destructive: "bg-rose-600 text-white shadow-sm hover:bg-rose-500 hover:scale-[1.02]",
        outline: "border border-white/10 bg-slate-900/50 backdrop-blur-sm text-slate-200 shadow-sm hover:bg-slate-800 hover:text-white hover:border-white/20 hover:scale-[1.02]",
        secondary: "bg-slate-800/80 text-slate-200 shadow-sm hover:bg-slate-700 hover:text-white hover:scale-[1.02]",
        ghost: "text-slate-400 hover:bg-slate-800 hover:text-slate-100 hover:scale-[1.02]",
        link: "text-indigo-400 underline-offset-4 hover:underline hover:text-indigo-300"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />);


}

export { Button, buttonVariants };