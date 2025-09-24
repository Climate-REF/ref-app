import { cva, type VariantProps } from "class-variance-authority";
import type { ExecutionOutput } from "@/client";
import { cn } from "@/lib/utils";

const figureVariants = cva(
  // Improve transitions to include background and border for smoother dark toggles
  "object-contain",
  {
    variants: {
      size: {
        // Primary: strong contrast; slightly softer hover in dark
        default: "max-h-96",
        // Destructive: ensure proper tokens in both themes
        large: "h-[800px] max-w-full",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

export function Figure({
  url,
  long_name,
  size,
}: ExecutionOutput & VariantProps<typeof figureVariants>) {
  return (
    <div className="flex flex-col items-center gap-2 overflow-hidden">
      <img src={url} alt={long_name} className={cn(figureVariants({ size }))} />
      <small className="text-muted-foreground">{long_name}</small>
    </div>
  );
}
