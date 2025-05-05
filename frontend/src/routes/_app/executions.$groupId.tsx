import {
  executionsExecutionOptions,
  executionsGetOptions,
  executionsMetricValuesOptions,
} from "@/client/@tanstack/react-query.gen";
import ExecutionsTable from "@/components/diagnostics/executionsTable.tsx";
import DatasetTable from "@/components/execution/datasetTable.tsx";
import { DownloadOutputs } from "@/components/execution/downloadOutputs.tsx";
import { ExecutionFilesContainer } from "@/components/execution/executionFiles";
import { ExecutionLogContainer } from "@/components/execution/executionLogs";
import { Values } from "@/components/execution/values";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils.ts";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import type * as React from "react";
import { z } from "zod";

function SummaryItem({
  className,
  title,
  children,
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="font-medium overflow-hidden text-nowrap text-ellipsis">
        {children}
      </p>
    </div>
  );
}

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
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Execution Summary</CardTitle>
                  <CardDescription>
                    Overview of the execution of a group for{" "}
                    <Link
                      to="/diagnostics/$providerSlug/$diagnosticSlug"
                      params={{
                        providerSlug: data.diagnostic.provider.slug,
                        diagnosticSlug: data.diagnostic.slug,
                      }}
                    >
                      {data.diagnostic.name}
                    </Link>
                  </CardDescription>
                </div>
                <div>
                  <DownloadOutputs
                    executionGroup={groupId}
                    executionId={(
                      executionId ??
                      data?.latest_execution.id ??
                      ""
                    ).toString()}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <SummaryItem title="Date">
                  {format(
                    new Date(execution.updated_at as string),
                    "yyyy-MM-dd HH:mm",
                  )}{" "}
                </SummaryItem>
                <SummaryItem title="Key" className="col-span-2">
                  <span title={data?.key}>{data?.key}</span>
                </SummaryItem>

                <SummaryItem title="Status">
                  <Badge className="mt-1">
                    {execution.successful ? "Success" : "Failed"}
                  </Badge>
                </SummaryItem>
                <SummaryItem title="Execution Time">3m 42s</SummaryItem>
                <SummaryItem title="Number of outputs">
                  {execution.outputs.length}
                </SummaryItem>
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
                  <DatasetTable groupId={groupId} executionId={executionId} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="executions" className="space-y-4">
              <ExecutionsTable results={data?.executions} />
            </TabsContent>

            <TabsContent value="files" className="space-y-4">
              <ExecutionFilesContainer outputs={execution?.outputs ?? []} />
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
                  <Values
                    facets={metricValues.data?.facets ?? []}
                    values={metricValues.data?.data ?? []}
                    loading={metricValues.isLoading}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <ExecutionLogContainer
                groupId={groupId}
                executionId={executionId}
              />
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
