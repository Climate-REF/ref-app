import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { z } from "zod";
import { executionsMetricValues } from "@/client";
import {
  executionsExecutionOptions,
  executionsGetOptions,
  executionsMetricValuesOptions,
} from "@/client/@tanstack/react-query.gen";
import ExecutionsTable from "@/components/diagnostics/executionsTable.tsx";
import { DownloadOutputs } from "@/components/execution/downloadOutputs.tsx";
import ExecutionDatasetTable from "@/components/execution/executionDatasetTable.tsx";
import { ExecutionFilesContainer } from "@/components/execution/executionFiles";
import { ExecutionLogContainer } from "@/components/execution/executionLogs";
import { Values } from "@/components/execution/values";
import type { MetricValueCollection } from "@/components/execution/values/types";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DetailsPanel } from "@/components/ui/detailsPanel.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ExecutionInfo = () => {
  const { groupId } = Route.useParams();
  const { tab, executionId } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { data } = useSuspenseQuery(
    executionsGetOptions({
      path: { group_id: groupId },
    }),
  );

  const { data: execution } = useSuspenseQuery(
    executionsExecutionOptions({
      path: { group_id: groupId },
      query: { execution_id: executionId },
    }),
  );

  const metricValues = useQuery(
    executionsMetricValuesOptions({
      path: { group_id: groupId },
      query: { execution_id: executionId },
    }),
  );

  return (
    <>
      {/*<PageHeader*/}
      {/*  breadcrumbs={[*/}
      {/*    {*/}
      {/*      name: "Metrics",*/}
      {/*      url: "/metrics",*/}
      {/*    },*/}
      {/*    {*/}
      {/*      name: data.diagnostic.name,*/}
      {/*      url: `/metrics/${data.diagnostic.provider.slug}/${data.diagnostic.slug}`,*/}
      {/*    },*/}
      {/*  ]}*/}
      {/*  title={data?.key}*/}
      {/*/>*/}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <DetailsPanel
            title="Execution Summary"
            description={
              <>
                Overview of the execution of a group for{" "}
                <Link
                  to="/diagnostics/$providerSlug/$diagnosticSlug"
                  className="underline"
                  params={{
                    providerSlug: data.diagnostic.provider.slug,
                    diagnosticSlug: data.diagnostic.slug,
                  }}
                >
                  {data.diagnostic.name}
                </Link>
              </>
            }
            action={
              <DownloadOutputs
                executionGroup={groupId}
                executionId={(
                  executionId ??
                  data.latest_execution?.id ??
                  ""
                ).toString()}
              />
            }
            items={[
              {
                label: "Date",
                value: format(
                  new Date(execution.updated_at as string),
                  "yyyy-MM-dd HH:mm",
                ),
              },
              {
                label: "Execution Group Key",
                value: (
                  <span title="A canonical identifier summarizing the selected datasets and parameters for this execution group.">
                    {data?.key}
                  </span>
                ),
                className: "col-span-2",
              },
              {
                label: "Status",
                value: (
                  <Badge
                    className="mt-1"
                    title="Whether the selected execution completed without errors."
                  >
                    {execution.successful ? "Success" : "Failed"}
                  </Badge>
                ),
              },
              {
                label: "Execution Time",
                value:
                  // Derive from updated_at and a best-effort estimate if created_at is present on the execution,
                  // otherwise leave unknown. Fallback keeps type-safety with known fields.
                  execution.updated_at
                    ? (() => {
                        // If created_at exists in the type in future, prefer that; currently only updated_at is guaranteed.
                        // Show unknown when duration can't be computed reliably.
                        return "—";
                      })()
                    : "—",
              },
              {
                label: "Number of outputs",
                value: execution.outputs.length,
              },
            ]}
          />
        </div>

        <div>
          <Tabs
            value={tab}
            className="space-y-4"
            onValueChange={(value) =>
              navigate({
                search: (prev) => ({ ...prev, tab: value }),
              })
            }
          >
            <TabsList>
              <TabsTrigger value="datasets">Datasets</TabsTrigger>
              <TabsTrigger value="executions">Executions</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="raw-data">Metric Values</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="datasets" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Datasets</CardTitle>
                  <CardDescription>
                    All datasets used in this execution. Click a dataset to view
                    metadata and provenance.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ExecutionDatasetTable
                    groupId={groupId}
                    executionId={executionId}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="executions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Executions</CardTitle>
                  <CardDescription>
                    History of runs for this execution group. Select a row to
                    bring its files, values, and logs into view.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ExecutionsTable results={data?.executions} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="files" className="space-y-4">
              <ExecutionFilesContainer outputs={execution.outputs} />
            </TabsContent>

            <TabsContent value="raw-data" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Metric Values</CardTitle>
                  <CardDescription>
                    Scalar metrics from the current execution. Use facets to
                    filter and Export to download as CSV.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Values
                    facets={
                      (metricValues.data as MetricValueCollection)?.facets ?? []
                    }
                    values={
                      (metricValues.data as MetricValueCollection)?.data ?? []
                    }
                    loading={metricValues.isLoading}
                    onDownload={async () => {
                      const response = await executionsMetricValues({
                        path: { group_id: groupId },
                        query: { execution_id: executionId, format: "csv" },
                      });
                      const blob = new Blob([response as unknown as string], {
                        type: "text/csv",
                      });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `metric-values-${groupId}.csv`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Logs</CardTitle>
                  <CardDescription>
                    Runtime logs from the selected execution. Use your browser
                    search (Ctrl/Cmd+F) to find warnings or errors.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ExecutionLogContainer
                    groupId={groupId}
                    executionId={executionId}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

const executionInfoSchema = z.object({
  tab: z
    .enum(["datasets", "executions", "files", "raw-data", "logs"])
    .default("datasets"),
  executionId: z.string().optional(),
});

export const Route = createFileRoute("/_app/executions/$groupId")({
  component: ExecutionInfo,
  validateSearch: executionInfoSchema,
});
