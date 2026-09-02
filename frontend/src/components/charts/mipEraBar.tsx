import type { ReactNode } from "react";
import {
  useMipEraSwitch,
  useSelectedMipEra,
} from "@/components/charts/mipEraContext";
import { Button } from "@/components/ui/button";
import { MIP_ERAS, type MipEra, otherMipEra } from "@/lib/mipEras";
import { cn } from "@/lib/utils";

/**
 * CMIP brand colours, matching the dataset type badges so an era looks the same everywhere.
 * The current phase takes the primary blue and the previous one the support mustard.
 */
const TINT: Record<MipEra, { bar: string; active: string }> = {
  CMIP6: {
    bar: "border-cmip-mustard/60 bg-cmip-mustard/15",
    active: "bg-cmip-mustard text-black hover:bg-cmip-mustard",
  },
  CMIP7: {
    bar: "border-cmip-blue/40 bg-cmip-blue/10 dark:border-white/20 dark:bg-cmip-blue/60",
    active:
      "bg-cmip-blue text-white hover:bg-cmip-blue dark:ring-1 dark:ring-white/40",
  },
};

interface MipEraBarProps {
  mipEra: MipEra;
  onChange: (mipEra: MipEra) => void;
  /** Extra context for the era shown, such as a model count. */
  detail?: ReactNode;
}

/**
 * The strip at the top of a results page naming the MIP era every chart and table below reports.
 *
 * Only one era shows at a time, because the CMIP6 and CMIP7 ensembles are not directly comparable.
 */
export function MipEraBar({ mipEra, onChange, detail }: MipEraBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border px-4 py-3",
        TINT[mipEra].bar,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Showing</span>
        <fieldset
          aria-label="MIP era"
          className="inline-flex rounded-md border border-border bg-background p-1"
        >
          {MIP_ERAS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === mipEra}
              onClick={() => onChange(option)}
              className={cn(
                "rounded px-4 py-1.5 text-base font-semibold transition-colors",
                option === mipEra
                  ? TINT[option].active
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {option}
            </button>
          ))}
        </fieldset>
      </div>
      <div className="text-sm text-muted-foreground">
        {detail ? <span className="mr-2 text-foreground">{detail}</span> : null}
        The two eras are shown separately, because the ensembles are not
        directly comparable.
      </div>
    </div>
  );
}

/**
 * Offer the other era when the selected one has nothing to show.
 *
 * Renders nothing where the page has no era selector.
 */
export function SwitchMipEraButton() {
  const mipEra = useSelectedMipEra();
  const setMipEra = useMipEraSwitch();
  if (!mipEra || !setMipEra) return null;
  const other = otherMipEra(mipEra);
  return (
    <Button variant="outline" size="sm" onClick={() => setMipEra(other)}>
      Show {other} instead
    </Button>
  );
}
