import type { ReactNode } from "react";
import {
  MipEraProvider,
  type MipEraSelection,
  useMipEraSelection,
} from "@/components/charts/mipEraContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MIP_ERAS, type MipEra, otherMipEra } from "@/lib/mipEras";
import { cn } from "@/lib/utils";

// CMIP brand colours, shared with the dataset type badges.
const ERA_STYLES: Record<MipEra, { bar: string; active: string }> = {
  CMIP6: {
    bar: "border-cmip-mustard/60 bg-cmip-mustard/15",
    active:
      "data-[state=active]:bg-cmip-mustard data-[state=active]:text-black",
  },
  CMIP7: {
    bar: "border-cmip-blue/40 bg-cmip-blue/10 dark:border-white/20 dark:bg-cmip-blue/60",
    active:
      "data-[state=active]:bg-cmip-blue data-[state=active]:text-white dark:data-[state=active]:ring-1 dark:data-[state=active]:ring-white/40",
  },
};

/**
 * Wrap a results page in a MIP era, with the bar that names it at the top.
 *
 * Only one era shows at a time, because the CMIP6 and CMIP7 ensembles are not directly comparable.
 */
export function MipEraScope({
  mipEra,
  setMipEra,
  children,
}: MipEraSelection & { children: ReactNode }) {
  return (
    <MipEraProvider mipEra={mipEra} setMipEra={setMipEra}>
      <MipEraBar />
      {children}
    </MipEraProvider>
  );
}

function MipEraBar() {
  const selection = useMipEraSelection();
  if (!selection) return null;
  const { mipEra, setMipEra } = selection;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border px-4 py-3",
        ERA_STYLES[mipEra].bar,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">Showing</span>
        <Tabs<MipEra> value={mipEra} onValueChange={setMipEra}>
          <TabsList aria-label="MIP era" className="h-auto bg-background">
            {MIP_ERAS.map((option) => (
              <TabsTrigger
                key={option}
                value={option}
                className={cn(
                  "px-4 py-1.5 text-base font-semibold",
                  ERA_STYLES[option].active,
                )}
              >
                {option}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <div className="text-sm text-muted-foreground">
        The two eras are shown separately, because the ensembles are not
        directly comparable.
      </div>
    </div>
  );
}

/**
 * Say the selected era has none of `what`, and offer the other era.
 *
 * Renders nothing where the page has no era selector.
 */
export function MipEraEmptyState({ what }: { what: string }) {
  const selection = useMipEraSelection();
  if (!selection) return null;
  const { mipEra, setMipEra } = selection;
  const other = otherMipEra(mipEra);
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
      No {mipEra} {what} yet.
      <Button variant="outline" size="sm" onClick={() => setMipEra(other)}>
        Show {other} instead
      </Button>
    </div>
  );
}
