import DatasetTable from "@/components/datasetTable.tsx";
import { ExecutionLogContainer } from "@/components/executionLogs/executionLogContainer.tsx";
import OutputListTable from "@/components/outputListTable.tsx";
import PageHeader from "@/components/pageHeader";
import ResultListTable from "@/components/resultsListTable.tsx";
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
import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useParams, useSearchParams } from "react-router";

import { executionsGetExecutionGroupOptions } from "@/client/@tanstack/react-query.gen";

const ExecutionInfo = () => {
  const { executionId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  if (!executionId) {
    return <div>Not found</div>;
  }

  const { data } = useSuspenseQuery(
    executionsGetExecutionGroupOptions({
      path: { execution_id: Number.parseInt(executionId) },
    }),
  );

  const latestResult = data?.latest_result;

  // @ts-ignore
  return (
    <>
      <PageHeader
        breadcrumbs={[
          {
            name: "Metrics",
            url: "/metrics",
          },
          {
            name: data.metric.name,
            url: `/metrics/${data.metric.provider.slug}/${data.metric.slug}`,
          },
        ]}
        title={data?.key}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Execution Summary</CardTitle>
                  <CardDescription>
                    Overview of this metric execution
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
                      new Date(latestResult?.updated_at as string),
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
                    {latestResult?.successful ? "Success" : "Failed"}
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
            defaultValue={searchParams.get("tab") ?? "datasets"}
            className="space-y-4"
            onValueChange={(value) =>
              setSearchParams({ ...searchParams, tab: value })
            }
          >
            <TabsList>
              <TabsTrigger value="datasets">Datasets</TabsTrigger>
              <TabsTrigger value="executions">Executions</TabsTrigger>
              <TabsTrigger value="files">Files</TabsTrigger>
              <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
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
                  <DatasetTable
                    executionId={Number.parseInt(executionId)}
                    resultId={latestResult?.id}
                  />
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
                  <CardTitle>Metrics</CardTitle>
                </CardHeader>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <ExecutionLogContainer
                executionId={data?.id}
                resultId={latestResult?.id as number}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default ExecutionInfo;
