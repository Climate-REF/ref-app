import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, X } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/app/pageHeader";
import { MipEraScope } from "@/components/charts/mipEraBar";
import {
  DiagnosticFailuresCard,
  DiagnosticFailuresCardSkeleton,
} from "@/components/failures/diagnosticFailuresCard";
import { ModelFailuresList } from "@/components/failures/modelFailures";
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
import { failuresByModel, groupsToShow } from "@/lib/failures";
import { type MipEra, mipEraSearchFields } from "@/lib/mipEras";

const FailuresSearchSchema = z.object({
  model: z.string().optional(),
  ...mipEraSearchFields,
});

export const Route = createFileRoute("/_app/executions/failures")({
  component: FailuresPage,
  validateSearch: FailuresSearchSchema,
  staticData: {
    title: "Failures",
  },
});

function FailuresPage() {
  const search = Route.useSearch();
  const { model } = search;
  const { mipEra } = useMipEra(search.mip_era);
  const { data, isLoading, error, retry } = useFailures(mipEra);
  const navigate = useNavigate({ from: Route.fullPath });
  const selectModel = (selected: string | undefined) =>
    navigate({ search: (prev) => ({ ...prev, model: selected }) });
  // The two eras mostly name their models differently, so a model filter doesn't carry over
  const selectMipEra = (next: MipEra) =>
    navigate({
      search: (prev) => ({ ...prev, mip_era: next, model: undefined }),
    });

  const failing = (data ?? []).filter(
    (failures) => groupsToShow(failures, model).length > 0,
  );
  const models = failuresByModel(data ?? []);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <title>{`Failures (${mipEra}) - Climate-REF`}</title>
      <PageHeader
        title="Failures"
        description="Diagnostics with execution groups whose latest execution failed. Execution groups are counted at the current version of each diagnostic. Expand a failed group to see the errors in its log."
      />

      <MipEraScope mipEra={mipEra} setMipEra={selectMipEra}>
        <div className="space-y-6">
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

          {data && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Providers</CardTitle>
                  <CardDescription>
                    Each dot is a diagnostic. Hover for details, and click a
                    failing one to jump to its failed execution groups.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProviderHealthOverview diagnostics={data} />
                </CardContent>
              </Card>

              {models.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Models</CardTitle>
                    <CardDescription>
                      Models with the most failed execution groups. A model
                      failing in many diagnostics usually points to a problem
                      with its data. Select one to list only its failures.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ModelFailuresList
                      models={models}
                      selected={model}
                      onSelect={selectModel}
                    />
                  </CardContent>
                </Card>
              )}

              {model && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span>
                    Showing the failures of{" "}
                    <span className="font-medium">{model}</span> in{" "}
                    {failing.length}{" "}
                    {failing.length === 1 ? "diagnostic" : "diagnostics"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => selectModel(undefined)}
                  >
                    <X className="size-4" />
                    Show all models
                  </Button>
                </div>
              )}

              {failing.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {model
                    ? `No execution groups of ${model} are failing.`
                    : `No ${mipEra} execution groups are failing.`}
                </p>
              ) : (
                <div className="space-y-4">
                  {failing.map((failures) => (
                    <DiagnosticFailuresCard
                      key={`${failures.diagnostic.provider.slug}/${failures.diagnostic.slug}`}
                      failures={failures}
                      model={model}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </MipEraScope>
    </div>
  );
}
