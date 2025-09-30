import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";

import type { GroupBy } from "@/client";
import { diagnosticsGetOptions } from "@/client/@tanstack/react-query.gen.ts";
import { DiagnosticInfoSkeleton } from "@/components/diagnostics/diagnosticInfoSkeleton";
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
  const location = useLocation();

  // Determine the active tab based on the current URL pathname
  const activeTab = location.pathname.split("/").pop() || "figures"; // Default to 'figures'

  return (
    <div className="flex flex-col gap-4">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="mb-6">
            <span className="text-sm font-medium text-muted-foreground">
              {data.aft_link?.name}
            </span>
            <br />
            {data.name}
          </CardTitle>
          <CardDescription>{data.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.aft_link && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">CMIP7 AFT ID</p>
                <p className="font-medium">{data.aft_link.id}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-sm text-muted-foreground">
                  CMIP7 AFT Description
                </p>
                <p className="font-medium">{data.aft_link.short_description}</p>
              </div>
              {data.aft_link.provider_link && (
                <div className="space-y-1 col-span-2">
                  <p className="text-sm text-muted-foreground">
                    Diagnostic Description
                  </p>
                  <a
                    className="font-medium underline underline-offset-4"
                    href={data.aft_link.provider_link}
                    target="_blank"
                  >
                    Link to provider
                  </a>
                </div>
              )}
            </div>
          )}
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
      <Tabs value={activeTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="groups" asChild>
            <Link
              to="/diagnostics/$providerSlug/$diagnosticSlug/groups"
              params={{ providerSlug, diagnosticSlug }}
            >
              Execution Groups
            </Link>
          </TabsTrigger>
          <TabsTrigger value="scalars" asChild>
            <Link
              to="/diagnostics/$providerSlug/$diagnosticSlug/scalars"
              params={{ providerSlug, diagnosticSlug }}
            >
              Scalar Values
            </Link>
          </TabsTrigger>
          <TabsTrigger value="series" asChild>
            <Link
              to="/diagnostics/$providerSlug/$diagnosticSlug/series"
              params={{ providerSlug, diagnosticSlug }}
            >
              Series Values
            </Link>
          </TabsTrigger>
          <TabsTrigger value="figures" asChild>
            <Link
              to="/diagnostics/$providerSlug/$diagnosticSlug/figures"
              params={{ providerSlug, diagnosticSlug }}
            >
              Figures
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
  pendingComponent: DiagnosticInfoSkeleton,
  pendingMs: 200,
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
