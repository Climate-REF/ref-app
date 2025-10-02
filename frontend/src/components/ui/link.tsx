import { Link as LinkRouter } from "@tanstack/react-router";
import type * as React from "react";
import { cn } from "@/lib/utils";

function Link({
  className,
  ...props
}: React.ComponentProps<typeof LinkRouter>) {
  return (
    <LinkRouter
      className={cn(
        "text-primary hover:underline font-medium underline-offset-2",
        className,
      )}
      {...props}
    />
  );
}

function LinkExternal({ className, ...props }: React.ComponentProps<"a">) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "text-primary hover:underline font-medium underline-offset-2",
        className,
      )}
      {...props}
    />
  );
}

export { Link, LinkExternal };
