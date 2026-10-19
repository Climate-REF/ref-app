import { Link } from "@tanstack/react-router";
import type { ProviderSummary } from "@/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  type DiagnosticFailures,
  type FailureFilters,
  failureSummary,
  failuresAnchor,
} from "@/lib/failures";
import { HEALTH, HealthDot, HealthLegend } from "./health";

interface ProviderGroup {
  provider: ProviderSummary;
  diagnostics: DiagnosticFailures[];
}

function groupByProvider(diagnostics: DiagnosticFailures[]): ProviderGroup[] {
  const groups = new Map<string, ProviderGroup>();
  for (const failures of diagnostics) {
    const provider = failures.diagnostic.provider;
    if (!groups.has(provider.slug)) {
      groups.set(provider.slug, { provider, diagnostics: [] });
    }
    groups.get(provider.slug)?.diagnostics.push(failures);
  }
  return [...groups.values()];
}

function DiagnosticDot({
  failures,
  filters,
}: {
  failures: DiagnosticFailures;
  filters?: FailureFilters;
}) {
  const { diagnostic } = failures;
  const dot = <HealthDot health={failures.health} />;

  // A failing diagnostic jumps to its section below, the others open the diagnostic
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {failures.failedGroups.length > 0 ? (
          <a
            href={`#${failuresAnchor(diagnostic)}`}
            className="flex rounded-full p-0.5 hover:ring-2 hover:ring-ring"
            aria-label={diagnostic.name}
          >
            {dot}
          </a>
        ) : (
          <Link
            to="/diagnostics/$providerSlug/$diagnosticSlug"
            params={{
              providerSlug: diagnostic.provider.slug,
              diagnosticSlug: diagnostic.slug,
            }}
            className="flex rounded-full p-0.5 hover:ring-2 hover:ring-ring"
            aria-label={diagnostic.name}
          >
            {dot}
          </Link>
        )}
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{diagnostic.name}</p>
        <p>
          {failures.total === 0
            ? "No execution groups"
            : failureSummary(failures, filters)}
        </p>
        <p className="opacity-80">{HEALTH[failures.health].label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/** One row of dots per provider, one dot per diagnostic, coloured by how its execution groups turned out. */
export function ProviderHealthOverview({
  diagnostics,
  filters,
}: {
  diagnostics: DiagnosticFailures[];
  /** What the failures were narrowed to, named in each dot's summary */
  filters?: FailureFilters;
}) {
  return (
    <div className="space-y-4">
      <HealthLegend />
      <ul className="space-y-3">
        {groupByProvider(diagnostics).map(({ provider, diagnostics }) => {
          const partial = diagnostics.filter((d) => d.health === "partial");
          const failed = diagnostics.filter((d) => d.health === "failed");
          return (
            <li
              key={provider.slug}
              className="grid gap-2 sm:grid-cols-[12rem_1fr] sm:items-start"
            >
              <div>
                <p className="font-medium">{provider.name}</p>
                <p className="text-xs text-muted-foreground">
                  {diagnostics.length} diagnostics
                  {partial.length > 0 && `, ${partial.length} some failing`}
                  {failed.length > 0 && `, ${failed.length} all failing`}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                {diagnostics.map((failures) => (
                  <DiagnosticDot
                    key={failures.diagnostic.slug}
                    failures={failures}
                    filters={filters}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Placeholder rows of dots while the diagnostics load. */
export function ProviderHealthOverviewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-3 w-80 max-w-full" />
      <ul className="space-y-3">
        {[25, 13, 10].map((dots) => (
          <li
            key={dots}
            className="grid gap-2 sm:grid-cols-[12rem_1fr] sm:items-start"
          >
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: dots }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Placeholders have no identity
                <Skeleton key={i} className="m-0.5 size-3 rounded-full" />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
