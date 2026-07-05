import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-teal-600 text-white shadow-sm hover:bg-teal-700 hover:scale-[1.02]",
        destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700 hover:scale-[1.02]",
        outline: "border border-slate-700 bg-slate-900 text-slate-200 shadow-sm hover:bg-slate-800 hover:text-white hover:border-slate-500 hover:scale-[1.02]",
        secondary: "bg-slate-800 text-slate-200 shadow-sm hover:bg-slate-700 hover:text-white hover:scale-[1.02]",
        ghost: "text-slate-400 hover:bg-slate-800 hover:text-slate-100 hover:scale-[1.02]",
        link: "text-teal-400 underline-offset-4 hover:underline hover:text-teal-300",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
