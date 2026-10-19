import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { useMemo } from "react";
import { z } from "zod";
import { PageHeader } from "@/components/app/pageHeader";
import type { DayRange } from "@/components/failures/dayRangePicker";
import {
  DiagnosticFailuresCard,
  DiagnosticFailuresCardSkeleton,
} from "@/components/failures/diagnosticFailuresCard";
import { FailureFilterBar } from "@/components/failures/failureFilters";
import {
  ProviderHealthOverview,
  ProviderHealthOverviewSkeleton,
} from "@/components/failures/providerHealthOverview";
import { useFailures } from "@/components/failures/useFailures";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMipEra } from "@/hooks/useMipEra";
import { apiErrorMessage } from "@/lib/apiError";
import { describeFailureReason } from "@/lib/failureReasons";
import {
  type FailureFilters,
  type FilterOptions,
  failedGroupsSummary,
  failureDays,
  filterOptions,
  summariseFailures,
} from "@/lib/failures";
import { type MipEra, mipEraSearchFields } from "@/lib/mipEras";

const day = z.string().regex(/^\d{4}-\d\d-\d\d$/);

const FailuresSearchSchema = z.object({
  model: z.string().optional(),
  reason: z.string().optional(),
  from: day.optional(),
  to: day.optional(),
  ...mipEraSearchFields,
});

export const Route = createFileRoute("/_app/executions/failures")({
  component: FailuresPage,
  validateSearch: FailuresSearchSchema,
  staticData: {
    title: "Failures",
  },
});

const reasonLabel = (key: string) => describeFailureReason(key).label;
const reasonDescription = (key: string) =>
  describeFailureReason(key).description;

/** Nothing to choose from while the failures load */
const NO_OPTIONS: FilterOptions = { reasons: [], models: [], days: new Set() };

function FailuresPage() {
  const search = Route.useSearch();
  const { model, reason, from, to } = search;
  const { mipEra } = useMipEra(search.mip_era);
  const { catalog, unsuccessful, isLoading, error, retry } = useFailures(
    mipEra,
    model,
  );
  const navigate = useNavigate({ from: Route.fullPath });
  const updateSearch = (patch: Partial<typeof search>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) });
  // The two eras mostly name their models differently, and their failures span different days,
  // so neither a model nor a time range carries over
  const selectMipEra = (next: MipEra) =>
    updateSearch({
      mip_era: next,
      model: undefined,
      from: undefined,
      to: undefined,
    });

  const filters: FailureFilters = useMemo(
    () => ({ model, reason, from, to }),
    [model, reason, from, to],
  );
  const allDays = useMemo(
    () => (unsuccessful ? failureDays(unsuccessful) : undefined),
    [unsuccessful],
  );
  const selectDays = (days: DayRange) =>
    updateSearch({ from: days.from, to: days.to });

  const { diagnostics, options } = useMemo(
    () =>
      catalog && unsuccessful
        ? {
            diagnostics: summariseFailures(catalog, unsuccessful, filters),
            options: filterOptions(catalog, unsuccessful, filters),
          }
        : { diagnostics: undefined, options: NO_OPTIONS },
    [catalog, unsuccessful, filters],
  );

  const failing = (diagnostics ?? []).filter(
    (failures) => failures.failedGroups.length > 0,
  );
  const filtered = [model, reason, from, to].some(
    (value) => value !== undefined,
  );

  return (
    <div className="container mx-auto p-4 space-y-6">
      <title>{`Failures (${mipEra}) - Climate-REF`}</title>
      <PageHeader
        title="Failures"
        description="Diagnostics with execution groups whose latest execution failed. Execution groups are counted at the current version of each diagnostic. Expand a failed group to see the errors in its log."
      />

      <FailureFilterBar
        mipEra={mipEra}
        onMipEra={selectMipEra}
        reasonCounts={options.reasons}
        reason={reason}
        onReason={(selected) => updateSearch({ reason: selected })}
        reasonLabel={reasonLabel}
        reasonDescription={reasonDescription}
        modelCounts={options.models}
        model={model}
        onModel={(selected) => updateSearch({ model: selected })}
        days={{ from, to }}
        allDays={allDays}
        failureDays={options.days}
        onDays={selectDays}
        onClear={
          filtered
            ? () =>
                updateSearch({
                  model: undefined,
                  reason: undefined,
                  from: undefined,
                  to: undefined,
                })
            : undefined
        }
        summary={diagnostics && failedGroupsSummary(diagnostics)}
        disabled={!diagnostics}
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Could not load the failures</AlertTitle>
          <AlertDescription>
            <p>{apiErrorMessage(error)}</p>
            <Button variant="outline" size="sm" onClick={retry}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div aria-busy="true" className="space-y-6">
          <span className="sr-only">Loading failures</span>
          <Card>
            <CardHeader>
              <CardTitle>Providers</CardTitle>
            </CardHeader>
            <CardContent>
              <ProviderHealthOverviewSkeleton />
            </CardContent>
          </Card>
          <div className="space-y-4">
            <DiagnosticFailuresCardSkeleton />
            <DiagnosticFailuresCardSkeleton />
          </div>
        </div>
      )}

      {diagnostics && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Providers</CardTitle>
              <CardDescription>
                Each dot is a diagnostic, coloured by the failures matching the
                filters. Hover for details, and click a failing one to jump to
                its failed execution groups.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProviderHealthOverview
                diagnostics={diagnostics}
                filters={filters}
              />
            </CardContent>
          </Card>

          {failing.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {filtered
                ? "No failing execution groups match these filters."
                : `No ${mipEra} execution groups are failing.`}
            </p>
          ) : (
            <div className="space-y-4">
              {failing.map((failures) => (
                <DiagnosticFailuresCard
                  key={`${failures.diagnostic.provider.slug}/${failures.diagnostic.slug}`}
                  failures={failures}
                  filters={filters}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
