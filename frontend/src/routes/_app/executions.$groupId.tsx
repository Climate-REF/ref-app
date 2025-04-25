import {
  executionsGetOptions,
  executionsListMetricValuesOptions,
  executionsResultOptions,
} from "@/client/@tanstack/react-query.gen";
import DatasetTable from "@/components/execution/datasetTable.tsx";
import { ExecutionLogContainer } from "@/components/execution/executionLogs/executionLogContainer.tsx";
import OutputListTable from "@/components/execution/outputListTable.tsx";
import ValuesDataTable from "@/components/execution/valuesDataTable.tsx";
import ResultListTable from "@/components/metrics/resultsListTable.tsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { z } from "zod";

const ExecutionInfo = () => {
  const { groupId } = Route.useParams();
  const { tab, resultId } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { data } = useSuspenseQuery(
    executionsGetOptions({
      path: { group_id: groupId },
    }),
  );

  const { data: executionResult } = useSuspenseQuery(
    executionsResultOptions({
      path: { group_id: groupId },
      query: { result_id: resultId },
    }),
  );

  const metricValues = useQuery(
    executionsListMetricValuesOptions({
      path: { group_id: groupId },
      query: { result_id: resultId },
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
      {/*      name: data.metric.name,*/}
      {/*      url: `/metrics/${data.metric.provider.slug}/${data.metric.slug}`,*/}
      {/*    },*/}
      {/*  ]}*/}
      {/*  title={data?.key}*/}
      {/*/>*/}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Execution Summary</CardTitle>
                  <CardDescription>
                    Overview of the execution of a group for{" "}
                    <Link
                      to="/metrics/$providerSlug/$metricSlug"
                      params={{
                        providerSlug: data.metric.provider.slug,
                        metricSlug: data.metric.slug,
                      }}
                    >
                      {data?.metric.name}
                    </Link>
                  </CardDescription>
                </div>
                <div>
                  <Button>Download outputs</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Key</p>
                  <p className="font-medium">{data?.key}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(
                      new Date(executionResult.updated_at as string),
                      "yyyy-MM-dd HH:mm",
                    )}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Execution Time
                  </p>
                  <p className="font-medium">3m 42s</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className="mt-1">
                    {executionResult.successful ? "Success" : "Failed"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Number of outputs
                  </p>
                  <p className="font-medium">{data?.outputs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
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
                    The datasets that were used in the calculation of this
                    metric
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DatasetTable groupId={groupId} resultId={resultId} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="executions" className="space-y-4">
              <ResultListTable results={data?.results} />
            </TabsContent>

            <TabsContent value="files" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Figures</CardTitle>
                  <CardDescription>
                    The datasets that were used in the calculation of this
                    metric
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {data?.outputs
                      .filter((output) => output.output_type === "plot")
                      .map((output) => (
                        <div
                          key={output.id}
                          className="flex flex-col items-center gap-2"
                        >
                          <img src={output.url} alt={output.description} />
                          <small>{output.description}</small>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
              <OutputListTable results={data?.outputs} />
            </TabsContent>

            <TabsContent value="raw-data" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Metric Values</CardTitle>
                  <CardDescription>
                    Scalar values from the latest executions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ValuesDataTable
                    facets={metricValues.data?.facets ?? []}
                    values={metricValues.data?.data ?? []}
                    isLoading={metricValues.isLoading}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <ExecutionLogContainer groupId={groupId} resultId={resultId} />
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
  resultId: z.string().optional(),
});

export const Route = createFileRoute("/_app/executions/$groupId")({
  component: ExecutionInfo,
  validateSearch: executionInfoSchema,
});
