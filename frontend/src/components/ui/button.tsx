import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Improve transitions to include background and border for smoother dark toggles
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,color,box-shadow,border-color] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // Primary: strong contrast; slightly softer hover in dark
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/80",
        // Destructive: ensure proper tokens in both themes
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive dark:text-destructive-foreground",
        // Outline: visible border in both themes; subtle accent hover in dark
        outline:
          "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-border dark:bg-background dark:hover:bg-accent/40",
        // Secondary: use muted surface in dark to reduce glare
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 dark:bg-muted dark:text-foreground/80 dark:hover:bg-muted/80",
        // Ghost: maintain subtle hover that respects dark accent tokens
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/30",
        // Link: ensure readable primary color in dark
        link: "text-primary underline-offset-4 hover:underline dark:text-primary",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
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
