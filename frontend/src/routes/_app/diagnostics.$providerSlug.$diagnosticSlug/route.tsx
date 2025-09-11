import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import type { GroupBy } from "@/client";
import { diagnosticsGetOptions } from "@/client/@tanstack/react-query.gen.ts";
import { Badge, SourceTypeBadge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const DiagnosticInfoLayout = () => {
  const data = Route.useLoaderData();
  const { providerSlug, diagnosticSlug } = Route.useParams();

  return (
    <div className="flex flex-col gap-4">
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
                {data.group_by.map((groups: GroupBy) => (
                  <GroupByItem key={groups.source_type} {...groups} />
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Execution groups (successful/total)
              </p>
              <p className="font-medium">
                {data.successful_execution_group_count}/
                {data.execution_group_count}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs driven by parent route with tab in search to avoid undefined child routes in manifest */}
      <Tabs defaultValue="values" className="space-y-4">
        <TabsList>
          <TabsTrigger value="groups" asChild>
            <Link
              to="/diagnostics/$providerSlug/$diagnosticSlug/groups"
              params={{ providerSlug, diagnosticSlug }}
            >
              Execution Groups
            </Link>
          </TabsTrigger>
          <TabsTrigger value="values" asChild>
            <Link
              to="/diagnostics/$providerSlug/$diagnosticSlug/values"
              params={{ providerSlug, diagnosticSlug }}
            >
              Metric Values
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Outlet />
    </div>
  );
};

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug",
)({
  component: DiagnosticInfoLayout,
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
