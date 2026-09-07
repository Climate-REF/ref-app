import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  modelsEnsembleOptions,
  modelsGetOptions,
} from "@/client/@tanstack/react-query.gen";
import { PageHeader } from "@/components/app/pageHeader";
import { MipEraScope } from "@/components/charts/mipEraBar";
import { DiagnosticRunsTable } from "@/components/models/diagnosticRunsTable";
import { EnsembleComparisonTable } from "@/components/models/ensembleComparisonTable";
import { FailedRunsTable } from "@/components/models/failedRunsTable";
import {
  RunOutcomeBar,
  RunOutcomeLegend,
} from "@/components/models/runOutcomeBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMipEra } from "@/hooks/useMipEra";
import { formatCount } from "@/lib/format";
import { mipEraSearchFields } from "@/lib/mipEras";

const ModelSearchSchema = z.object(mipEraSearchFields);

export const Route = createFileRoute("/_app/models/$sourceId")({
  component: ModelDetailPage,
  validateSearch: zodValidator(ModelSearchSchema),
  staticData: {
    title: "Model",
  },
});

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm leading-none font-semibold">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function ModelDetailPage() {
  const { sourceId } = Route.useParams();
  const search = Route.useSearch();
  const { mipEra, setMipEra } = useMipEra(search.mip_era);

  const { data, isLoading, error } = useQuery(
    modelsGetOptions({
      path: { source_id: sourceId },
      query: { mip_era: mipEra },
    }),
  );
  const ensemble = useQuery(
    modelsEnsembleOptions({
      path: { source_id: sourceId },
      query: { mip_era: mipEra },
    }),
  );

  const counts = data?.execution_groups;
  const comparisons = ensemble.data?.data ?? [];
  const outliers = comparisons.filter((comparison) => comparison.is_outlier);

  return (
    <div className="container mx-auto space-y-6 p-4">
      <title>{`${sourceId} (${mipEra}) - Climate-REF`}</title>
      <PageHeader
        title={sourceId}
        description={
          data ? (
            <div className="flex flex-wrap items-center gap-2">
              {data.institution_ids.map((institution) => (
                <Badge key={institution} variant="secondary">
                  {institution}
                </Badge>
              ))}
              {data.mip_eras.map((era) => (
                <Badge key={era} variant="outline">
                  {era}
                </Badge>
              ))}
            </div>
          ) : null
        }
        actions={
          <Button variant="outline" asChild>
            <Link to="/models">All models</Link>
          </Button>
        }
      />

      <MipEraScope mipEra={mipEra} setMipEra={setMipEra}>
        {error && (
          <div className="text-destructive">
            This model has no {mipEra} runs. {String(error)}
          </div>
        )}
        {isLoading && <div>Loading model...</div>}

        {counts && data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Execution groups"
                value={formatCount(counts.total)}
                hint={`Across ${formatCount(data.diagnostic_count)} diagnostics`}
              />
              <StatCard
                title="Successful"
                value={`${counts.success_rate_percentage}%`}
                hint={`${formatCount(counts.successful)} of ${formatCount(counts.total)} groups`}
              />
              <StatCard
                title="Not successful"
                value={formatCount(
                  counts.failed + counts.running + counts.not_started,
                )}
                hint={`${formatCount(counts.failed)} failed, ${formatCount(counts.running)} running, ${formatCount(counts.not_started)} not started`}
              />
              <StatCard
                title="Ensemble outliers"
                value={
                  ensemble.isLoading
                    ? "..."
                    : `${formatCount(outliers.length)} / ${formatCount(comparisons.length)}`
                }
                hint="Metrics beyond the ensemble's inter-quartile fences"
              />
            </div>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <RunOutcomeBar counts={counts} className="w-full" />
                <RunOutcomeLegend />
              </CardContent>
            </Card>

            <Tabs defaultValue="diagnostics">
              <TabsList>
                <TabsTrigger value="diagnostics">By diagnostic</TabsTrigger>
                <TabsTrigger value="failures">
                  Failures ({data.failures.length})
                </TabsTrigger>
                <TabsTrigger value="ensemble">Vs ensemble</TabsTrigger>
              </TabsList>

              <TabsContent value="diagnostics">
                <Card>
                  <CardHeader>
                    <CardTitle>Runs by diagnostic</CardTitle>
                    <CardDescription>
                      How each diagnostic went for {sourceId}, counted at the
                      promoted version of the diagnostic.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DiagnosticRunsTable diagnostics={data.diagnostics} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="failures">
                <Card>
                  <CardHeader>
                    <CardTitle>Runs that did not succeed</CardTitle>
                    <CardDescription>
                      Execution groups whose latest execution failed, is still
                      running, or has not started.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FailedRunsTable failures={data.failures} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="ensemble">
                <Card>
                  <CardHeader>
                    <CardTitle>{sourceId} against the ensemble</CardTitle>
                    <CardDescription>
                      Every scalar metric {sourceId} reported alongside at least
                      two other models, furthest from the ensemble mean first.
                      Members of a model are averaged before the spread is
                      taken, so a model with many variants does not pull the
                      ensemble towards itself.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!ensemble.isLoading && comparisons.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">
                        No {mipEra} metric of this model is reported by enough
                        other models to compare against.
                      </p>
                    ) : (
                      <EnsembleComparisonTable
                        comparisons={comparisons}
                        loading={ensemble.isLoading}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </MipEraScope>
    </div>
  );
}
