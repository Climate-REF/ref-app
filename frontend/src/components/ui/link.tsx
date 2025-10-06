import { Link as LinkRouter } from "@tanstack/react-router";
import type * as React from "react";
import { cn } from "@/lib/utils";

const common =
  "text-oceanBlue dark:text-icyBlue underline font-medium underline-offset-2";

function Link({
  className,
  ...props
}: React.ComponentProps<typeof LinkRouter>) {
  return <LinkRouter className={cn(common, className)} {...props} />;
}

function LinkExternal({ className, ...props }: React.ComponentProps<"a">) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={cn(common, className)}
      {...props}
    />
  );
}

export { Link, LinkExternal };
