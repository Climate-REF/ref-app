import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";
import type { GroupBy, ReferenceDatasetLink } from "@/client";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const navigate = useNavigate();

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
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground">CMIP7 AFT ID</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        The unique identifier for the Associated Forcing Task
                        (AFT) in the CMIP7 framework. AFTs define specific model
                        evaluation tasks that address key climate science
                        questions.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="font-medium">{data.aft_link.id}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground">
                    Diagnostic Collection Description (CMIP7 AFT)
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        The description of the scientific objective this
                        diagnostic addresses as defined by the CMIP Model
                        Benchmarking Task Team.
                      </p>
                      <p className="mt-2">
                        Multiple diagnostics may be associated with a single
                        collection.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
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
                    Link to provider documentation
                  </a>
                </div>
              )}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Metric Provider</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      The software package or tool that implements and executes
                      this diagnostic. Each provider may offer multiple
                      diagnostics.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="font-medium">
                <Badge>{data?.provider.name}</Badge>
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Slug</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>A unique identifier for this diagnostic.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="font-medium">{data?.slug}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">Groupings</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      The dataset attributes (such as model name, experiment ID,
                      or variable name) that are used to organize datasets into
                      groups before running this diagnostic. Each unique
                      combination of these attributes creates a separate
                      execution group.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex flex-col gap-2">
                {data.group_by.map((groups: GroupBy) => (
                  <GroupByItem key={groups.source_type} {...groups} />
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-sm text-muted-foreground">
                  Execution groups (successful/total)
                </p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      A collection of diagnostic runs that share the same
                      combination of dataset grouping values. For example, if
                      grouped by model and experiment, all runs for "CESM2" and
                      "historical" form one execution group. The counter shows
                      how many groups completed successfully versus the total
                      number of groups.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="font-medium">
                {data.successful_execution_group_count}/
                {data.execution_group_count}
              </p>
            </div>
          </div>

          {/* Reference Datasets Section */}
          {data.reference_datasets && data.reference_datasets.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Reference Datasets
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Observational or reference datasets that this diagnostic
                        uses for comparison. Primary references are essential
                        for the diagnostic to run, while secondary references
                        provide additional context.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.reference_datasets.map((ref: ReferenceDatasetLink) => (
                    <Card key={ref.slug} className="p-3">
                      <div className="flex items-start gap-2">
                        <Badge
                          variant={
                            ref.type === "primary" ? "default" : "secondary"
                          }
                          className="mt-0.5"
                        >
                          {ref.type}
                        </Badge>
                        <div className="flex-1 space-y-1">
                          <code className="text-sm font-medium">
                            {ref.slug}
                          </code>
                          {ref.description && (
                            <p className="text-xs text-muted-foreground">
                              {ref.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Tags Section */}
          {data.tags && data.tags.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
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
          <TabsTrigger
            value="scalars"
            disabled={!data.has_scalar_values}
            data-disabled={!data.has_scalar_values ? "true" : undefined}
            onClick={() =>
              navigate({
                to: "/diagnostics/$providerSlug/$diagnosticSlug/scalars",
                params: { providerSlug, diagnosticSlug },
              })
            }
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <span>Scalar Values</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Single numeric values calculated from the data, such as global
                  means, root mean square errors, or correlation coefficients.
                </p>
              </TooltipContent>
            </Tooltip>
          </TabsTrigger>
          <TabsTrigger
            value="series"
            disabled={!data.has_series_values}
            data-disabled={!data.has_series_values ? "true" : undefined}
            onClick={() =>
              navigate({
                to: "/diagnostics/$providerSlug/$diagnosticSlug/series",
                params: { providerSlug, diagnosticSlug },
              })
            }
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <span>Series Values</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Time series or multi-dimensional data values, such as monthly
                  means over multiple years or values across different
                  latitudes.
                </p>
              </TooltipContent>
            </Tooltip>
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
