import type { GroupBy } from "@/client";
import { Values } from "@/components/execution/values";
import ExecutionGroupTable from "@/components/metrics/executionGroupTable.tsx";
import { Badge, SourceTypeBadge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import {
  metricsGetMetricOptions,
  metricsListMetricValuesOptions,
} from "@/client/@tanstack/react-query.gen";

const GroupByItem = ({ source_type, group_by }: GroupBy) => {
  return (
    <div className="flex flex-wrap gap-2">
      {group_by?.map((value) => (
        <SourceTypeBadge sourceType={source_type} key={value}>
          {source_type}:{value}
        </SourceTypeBadge>
      ))}
    </div>
  );
};

const MetricInfo = () => {
  const { providerSlug, metricSlug } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const data = Route.useLoaderData();

  const { data: metricValues, isLoading } = useQuery(
    metricsListMetricValuesOptions({
      path: {
        provider_slug: providerSlug,
        metric_slug: metricSlug,
      },
    }),
  );

  return (
    <>
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
              <p className="text-sm text-muted-foreground">Metric Provider</p>
              <p className="font-medium">
                <Badge>{data?.provider.name}</Badge>
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Slug</p>
              <p className="font-medium">{data?.slug}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Groupings</p>
              <div className="flex flex-col gap-2">
                {data.group_by.map((groups) => (
                  <GroupByItem key={groups.source_type} {...groups} />
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Number of execution groups
              </p>
              <p className="font-medium">{data.metric_executions.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
          <Values
            facets={metricValues?.facets ?? []}
            values={metricValues?.data ?? []}
            loading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </>
  );
};

const metricInfoSchema = z.object({
  tab: z.enum(["executions", "raw-data"]).default("executions"),
});

export const Route = createFileRoute("/_app/metrics/$providerSlug/$metricSlug")(
  {
    component: MetricInfo,
    validateSearch: zodValidator(metricInfoSchema),
    staticData: {
      breadcrumbs: [{ name: "Metrics", url: "/metrics" }],
      title: "",
    },
    loader: ({ context: { queryClient }, params }) => {
      return queryClient.ensureQueryData(
        metricsGetMetricOptions({
          path: {
            provider_slug: params.providerSlug,
            metric_slug: params.metricSlug,
          },
        }),
      );
    },
  },
);
