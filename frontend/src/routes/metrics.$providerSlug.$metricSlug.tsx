import PageHeader from "@/components/app/pageHeader";
import ExecutionGroupTable from "@/components/executionGroupTable.tsx";
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
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { metricsGetMetricOptions } from "@/client/@tanstack/react-query.gen";

const MetricInfo = () => {
  const { providerSlug, metricSlug } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

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
            value={tab}
            className="space-y-4"
            onValueChange={(value) =>
              navigate({
                search: (prev) => ({ ...prev, tab: value }),
              })
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

const metricInfoSchema = z.object({
  tab: z.enum(["executions", "raw-data"]).default("executions"),
});

export const Route = createFileRoute("/metrics/$providerSlug/$metricSlug")({
  component: MetricInfo,
  validateSearch: zodValidator(metricInfoSchema),
});
