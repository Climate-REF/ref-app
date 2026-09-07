import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const CMIP7_AVAILABILITY_URL =
  "https://www.climate-resource.com/tools/esm-model/cmip7-availability/";

type Variant = "card" | "inline";

interface Cmip7AvailabilityCtaProps {
  /** `card` is a standalone panel. `inline` is a single row for tucking under a page header. */
  variant?: Variant;
  className?: string;
}

/**
 * Announces the first CMIP7 results and points at the CMIP7 diagnostics,
 * with the availability dashboard as the secondary link.
 */
export function Cmip7AvailabilityCta({
  variant = "card",
  className,
}: Cmip7AvailabilityCtaProps) {
  const size = variant === "card" ? "default" : "sm";
  const buttons = (
    <div className="flex flex-wrap gap-2">
      <Button asChild size={size}>
        <Link to="/diagnostics" search={{ mip_era: "CMIP7" }}>
          View CMIP7 diagnostics
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
      <Button asChild size={size} variant="outline">
        <a
          href={CMIP7_AVAILABILITY_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          Which models are available
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </Button>
    </div>
  );

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-lg border border-oceanBlue/30 bg-oceanBlue/5 px-4 py-3 lg:flex-row lg:items-center lg:justify-between dark:border-icyBlue/30 dark:bg-icyBlue/5",
          className,
        )}
      >
        <p className="text-sm">
          <span>
            <span className="font-medium">
              The first CMIP7 AFT models are being published.
            </span>{" "}
            <span className="text-muted-foreground">
              Browse their diagnostics, or check which models have landed.
            </span>
          </span>
        </p>
        {buttons}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto max-w-prose space-y-4 rounded-xl border border-oceanBlue/30 bg-gradient-to-r from-oceanBlue/10 to-icyBlue/10 p-6 dark:border-icyBlue/30 dark:from-oceanBlue/20 dark:to-icyBlue/10",
        className,
      )}
    >
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-oceanBlue dark:text-icyBlue">
          CMIP7 Assessment Fast Track
        </p>
        <h2 className="text-lg font-semibold">
          The first CMIP7 AFT models are being published
        </h2>
        <p className="text-sm text-muted-foreground">
          Modelling centres are starting to release their CMIP7 output. Browse
          the diagnostics run on it so far, or check the availability dashboard
          to see which models and experiments have landed.
        </p>
      </div>
      {buttons}
    </div>
  );
}
