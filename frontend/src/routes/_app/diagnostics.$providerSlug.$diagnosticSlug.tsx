import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import type { GroupBy } from "@/client";
import {
  diagnosticsGetOptions,
  diagnosticsListMetricValuesOptions,
} from "@/client/@tanstack/react-query.gen";
import ExecutionGroupTable from "@/components/execution/executionGroupTable.tsx";
import { Values } from "@/components/execution/values";
import { Badge, SourceTypeBadge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const DiagnosticInfo = () => {
  const { providerSlug, diagnosticSlug } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const data = Route.useLoaderData();

  const { data: metricValues, isLoading } = useQuery(
    diagnosticsListMetricValuesOptions({
      path: {
        provider_slug: providerSlug,
        diagnostic_slug: diagnosticSlug,
      },
    }),
  );

  return (
    <>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>{data.name}</CardTitle>
          <CardDescription>{data.description}</CardDescription>
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
              <p className="font-medium">{data.execution_groups.length}</p>
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
          <TabsTrigger value="values">Metric Values</TabsTrigger>
        </TabsList>

        <TabsContent value="executions" className="space-y-4">
          <ExecutionGroupTable
            diagnosticSlug={diagnosticSlug}
            providerSlug={providerSlug}
          />
        </TabsContent>

        <TabsContent value="values" className="space-y-4">
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
  tab: z.enum(["executions", "values"]).default("executions"),
});

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug",
)({
  component: DiagnosticInfo,
  validateSearch: zodValidator(metricInfoSchema),
  staticData: {
    title: "",
  },
  loader: ({ context: { queryClient }, params }) => {
    return queryClient.ensureQueryData(
      diagnosticsGetOptions({
        path: {
          provider_slug: params.providerSlug,
          diagnostic_slug: params.diagnosticSlug,
        },
      }),
    );
  },
});
