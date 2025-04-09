import ExecutionGroupTable from "@/components/executionGroupTable.tsx";
import PageHeader from "@/components/pageHeader";
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
import { useParams, useSearchParams } from "react-router";

import { metricsGetMetricOptions } from "@/client/@tanstack/react-query.gen";

const MetricInfo = () => {
  const { providerSlug, metricSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  if (!metricSlug || !providerSlug) {
    return <div>Not found</div>;
  }

  const { data } = useSuspenseQuery(
    metricsGetMetricOptions({
      path: { provider_slug: providerSlug, metric_slug: metricSlug },
    }),
  );

  return (
    <>
      <PageHeader
        breadcrumbs={[{ name: "Metrics", url: "/metrics" }]}
        title={data?.name}
      />
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{data?.name}</CardTitle>
              <CardDescription>
                Metric longer description goes here{" "}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Metric Provider
                  </p>
                  <p className="font-medium">
                    <Badge>{data?.provider.name}</Badge>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Slug</p>
                  <p className="font-medium">{data?.slug}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    Number of execution groups
                  </p>
                  <p className="font-medium">
                    {data?.metric_executions.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Tabs
            value={searchParams.get("tab") ?? "executions"}
            className="space-y-4"
            onValueChange={(value) =>
              setSearchParams({ ...searchParams, tab: value })
            }
          >
            <TabsList>
              <TabsTrigger value="executions">Execution Groups</TabsTrigger>
              <TabsTrigger value="raw-data">Raw Data</TabsTrigger>
            </TabsList>

            <TabsContent value="executions" className="space-y-4">
              <ExecutionGroupTable
                metricSlug={metricSlug}
                providerSlug={providerSlug}
              />
            </TabsContent>

            <TabsContent value="raw-data" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Portrait plot</CardTitle>
                </CardHeader>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default MetricInfo;
