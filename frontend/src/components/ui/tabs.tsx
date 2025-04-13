import * as TabsPrimitive from "@radix-ui/react-tabs";
import type * as React from "react";

import { cn } from "@/lib/utils";

type TabsProps<T extends string = string> = {
  value?: T;
  onValueChange?: (value: T) => void;
} & Omit<
  React.ComponentProps<typeof TabsPrimitive.Root>,
  "value" | "onValueChange"
>;

function Tabs<T extends string = string>({
  className,
  ...props
}: TabsProps<T>) {
  return (
    // @ts-ignore
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-1",
        className,
      )}
      {...props}
    />
  );
}

type TabsTriggerProps<T extends string = string> = {
  value: T;
} & Omit<React.ComponentProps<typeof TabsPrimitive.Trigger>, "value">;

function TabsTrigger<T extends string = string>({
  className,
  ...props
}: TabsTriggerProps<T>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "data-[state=active]:bg-background data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:shadow-sm [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

type TabsContentProps<T extends string = string> = {
  value: T;
} & Omit<React.ComponentProps<typeof TabsPrimitive.Content>, "value">;

function TabsContent<T extends string = string>({
  className,
  ...props
}: TabsContentProps<T>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
