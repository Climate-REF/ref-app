import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { getSourceTypeColour } from "@/lib/sourceTypes.ts";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Base shape and focus
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[background-color,color,box-shadow,border-color] overflow-hidden",
  {
    variants: {
      variant: {
        // Primary badge: increase contrast in dark mode
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:[a&]:hover:bg-primary/80",
        // Neutral badge: use muted tokens for dark backgrounds to reduce glare
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90 dark:bg-muted dark:text-foreground/80 dark:[a&]:hover:bg-muted/80",
        // Destructive badge: keep strong but adjust ring and contrast for dark
        destructive:
          "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive",
        // Outline: ensure readable border and subtle hover in dark
        outline:
          "text-foreground border-border [a&]:hover:bg-accent [a&]:hover:text-accent-foreground dark:text-foreground dark:border-border dark:[a&]:hover:bg-accent/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

function SourceTypeBadge({
  className,
  sourceType,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & {
  asChild?: boolean;
  sourceType: string;
}) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      className={cn(
        // Use secondary base so we inherit dark-muted behavior, then overlay source color
        badgeVariants({ variant: "secondary" }),
        getSourceTypeColour(sourceType),
        className,
      )}
      {...props}
    />
  );
}

export { Badge, SourceTypeBadge, badgeVariants };
