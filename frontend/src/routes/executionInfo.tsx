import DatasetTable from "@/components/datasetTable.tsx";
import { ExecutionLogs } from "@/components/logView.tsx";
import PageHeader from "@/components/pageHeader";
import ResultListTable from "@/components/resultsListTable.tsx";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "react-router";

import { executionsGetExecutionOptions } from "@/client/@tanstack/react-query.gen";

const ExecutionInfo = () => {
  const { executionId } = useParams();
  if (!executionId) {
    return <div>Not found</div>;
  }

  const { data } = useSuspenseQuery(
    executionsGetExecutionOptions({
      path: { execution_id: Number.parseInt(executionId) },
    }),
  );

  return (
    <>
      <PageHeader />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Execution Summary</CardTitle>
              <CardDescription>
                Overview of this metric execution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Key</p>
                  <p className="font-medium">{data?.key}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Dataset</p>
                  <p className="font-medium">ImageNet-1K</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {data.latest_result?.updated_at}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Value</p>
                  <p className="text-2xl font-bold">91.5%</p>
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
                    {data.latest_result?.successful ? "Success" : "Failed"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Tabs defaultValue="datasets" className="space-y-4">
            <TabsList>
              <TabsTrigger value="datasets">Datasets</TabsTrigger>
              <TabsTrigger value="executions">Executions</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
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
                    resultId={data?.latest_result?.id}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="executions" className="space-y-4">
              <ResultListTable results={data?.results} />
            </TabsContent>

            <TabsContent value="metadata" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Test</CardTitle>
                </CardHeader>
              </Card>
            </TabsContent>

            <TabsContent value="raw-data" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Test</CardTitle>
                </CardHeader>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <ExecutionLogs type={data?.key ?? "Unknown"} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default ExecutionInfo;
