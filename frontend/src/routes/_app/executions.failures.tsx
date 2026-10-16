import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/app/pageHeader";
import {
  DiagnosticFailuresCard,
  DiagnosticFailuresCardSkeleton,
} from "@/components/failures/diagnosticFailuresCard";
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
import { apiErrorMessage } from "@/lib/apiError";

export const Route = createFileRoute("/_app/executions/failures")({
  component: FailuresPage,
  staticData: {
    title: "Failures",
  },
});

function FailuresPage() {
  const { data, isLoading, error, retry } = useFailures();
  const failing = (data ?? []).filter(
    (failures) => failures.failedGroups.length > 0,
  );

  return (
    <div className="container mx-auto p-4 space-y-6">
      <title>Failures - Climate-REF</title>
      <PageHeader
        title="Failures"
        description="Diagnostics with execution groups whose latest execution failed. Execution groups are counted at the current version of each diagnostic. Expand a failed group to see the end of its log."
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

      {data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Providers</CardTitle>
              <CardDescription>
                Each dot is a diagnostic. Hover for details, and click a failing
                one to jump to its failed execution groups.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProviderHealthOverview diagnostics={data} />
            </CardContent>
          </Card>

          {failing.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No execution groups are failing.
            </p>
          ) : (
            <div className="space-y-4">
              {failing.map((failures) => (
                <DiagnosticFailuresCard
                  key={`${failures.diagnostic.provider.slug}/${failures.diagnostic.slug}`}
                  failures={failures}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
