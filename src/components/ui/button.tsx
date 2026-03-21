import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-body text-[0.75rem] uppercase tracking-[0.12em] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-primary-foreground hover:bg-accent-hover",
        destructive: "bg-transparent border border-destructive text-destructive hover:bg-destructive hover:text-primary-foreground",
        outline: "bg-transparent border border-border text-foreground hover:border-accent hover:text-accent",
        secondary: "bg-transparent border border-border text-foreground hover:border-accent hover:text-accent",
        ghost: "bg-transparent text-muted-foreground hover:text-foreground",
        link: "text-accent underline-offset-4 hover:underline",
        amber: "bg-accent text-primary-foreground hover:bg-accent-hover",
        "amber-outline": "bg-transparent text-accent hover:underline",
      },
      size: {
        default: "h-10 px-8 py-2",
        sm: "h-9 px-4",
        lg: "h-12 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
