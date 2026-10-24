import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";
import type { ReactNode } from "react";
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
import { LinkExternal } from "@/components/ui/link";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatBytes, formatCoreHours, formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

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

/** A help icon explaining the label next to it. */
const HelpTooltip = ({ children }: { children: ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
    </TooltipTrigger>
    <TooltipContent className="max-w-xs">{children}</TooltipContent>
  </Tooltip>
);

/** A labelled value, with an optional help tooltip on the label. */
const InfoField = ({
  label,
  help,
  className,
  children,
}: {
  label: string;
  help?: ReactNode;
  className?: string;
  children: ReactNode;
}) => (
  <div className={cn("space-y-1", className)}>
    <div className="flex items-center gap-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      {help && <HelpTooltip>{help}</HelpTooltip>}
    </div>
    {children}
  </div>
);

/** A titled section of the diagnostic's details, set off from the one above. */
const InfoSection = ({
  title,
  help,
  children,
}: {
  title: string;
  help?: ReactNode;
  children: ReactNode;
}) => (
  <>
    <Separator className="my-4" />
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        {help && <HelpTooltip>{help}</HelpTooltip>}
      </div>
      {children}
    </div>
  </>
);

/**
 * A tab that only some diagnostics have
 *
 * It navigates on click rather than being a link, as a disabled link could still be followed.
 */
const NavTab = ({
  value,
  label,
  help,
  disabled,
}: {
  value: "scalars" | "series" | "explorer";
  label: string;
  help: string;
  disabled: boolean;
}) => {
  const params = Route.useParams();
  const navigate = useNavigate();
  return (
    <TabsTrigger
      value={value}
      disabled={disabled}
      data-disabled={disabled ? "true" : undefined}
      onClick={() =>
        navigate({
          to: `/diagnostics/$providerSlug/$diagnosticSlug/${value}`,
          params,
        })
      }
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span>{label}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{help}</p>
        </TooltipContent>
      </Tooltip>
    </TabsTrigger>
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
      <title>{`${data?.name} - Climate-REF`}</title>
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
              <div className="space-y-4">
                <InfoField
                  label="CMIP7 AFT Collection ID"
                  help="The unique identifier for the Associated Forcing Task (AFT) in the CMIP7 framework. AFTs define specific model evaluation tasks that address key climate science questions."
                >
                  <p className="font-medium">{data.aft_link.id}</p>
                </InfoField>
                {data.aft_link.provider_link && (
                  <InfoField
                    label="Diagnostic Description"
                    className="col-span-2"
                  >
                    <LinkExternal href={data.aft_link.provider_link}>
                      Provider documentation
                    </LinkExternal>
                  </InfoField>
                )}
              </div>

              <InfoField
                label="Diagnostic Collection Description (CMIP7 AFT)"
                className="col-span-2"
                help={
                  <>
                    <p>
                      The description of the scientific objective this
                      diagnostic addresses as defined by the CMIP Model
                      Benchmarking Task Team.
                    </p>
                    <p className="mt-2">
                      Multiple diagnostics may be associated with a single
                      collection.
                    </p>
                  </>
                }
              >
                <p className="font-medium">{data.aft_link.short_description}</p>
              </InfoField>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <InfoField
              label="Metric Provider"
              help="The software package or tool that implements and executes this diagnostic. Each provider may offer multiple diagnostics."
            >
              <p className="font-medium">
                <Badge>{data?.provider.name}</Badge>
              </p>
            </InfoField>
            <InfoField
              label="Slug"
              help="A unique identifier for this diagnostic."
            >
              <p className="font-medium">{data?.slug}</p>
            </InfoField>
            <InfoField
              label="Groupings"
              help="The dataset attributes (such as model name, experiment ID, or variable name) that are used to organize datasets into groups before running this diagnostic. Each unique combination of these attributes creates a separate execution group."
            >
              <div className="flex flex-col gap-2">
                {data.group_by.map((groups: GroupBy) => (
                  <GroupByItem key={groups.source_type} {...groups} />
                ))}
              </div>
            </InfoField>
            <InfoField
              label="Execution groups (successful/total)"
              help='A collection of diagnostic runs that share the same combination of dataset grouping values. For example, if grouped by model and experiment, all runs for "CESM2" and "historical" form one execution group. The counter shows how many groups completed successfully versus the total number of groups.'
            >
              <p className="font-medium">
                {data.groups.successful}/{data.groups.total}
              </p>
            </InfoField>
            <InfoField
              label="Diagnostic version"
              help={
                <p>
                  The version of this diagnostic currently in use.
                  <br />
                  The version is updated when the diagnostic is updated. This
                  may differ between diagnostics for the same provider.
                </p>
              }
            >
              <p className="font-medium">v{data.promoted_version}</p>
            </InfoField>
          </div>

          {data.resource_usage && (
            <InfoSection
              title="Resource Usage"
              help={
                <>
                  <p>
                    Core hours consumed by the executions of this diagnostic,
                    alongside how long they took to run. A core hour is one CPU
                    core busy for an hour, so it measures the compute an
                    execution consumed rather than its elapsed time.
                  </p>
                  <p className="mt-2">
                    Core hours and peak memory are optional, so they roll up
                    over only the executions that recorded them.
                  </p>
                </>
              }
            >
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                <InfoField label="Mean wall time">
                  <p className="font-medium tabular-nums">
                    {formatDuration(data.resource_usage.wall_seconds_mean)}
                  </p>
                </InfoField>
                <InfoField label="Longest execution">
                  <p className="font-medium tabular-nums">
                    {formatDuration(data.resource_usage.wall_seconds_max)}
                  </p>
                </InfoField>
                <InfoField label="Core hours (sum / mean)">
                  <p className="font-medium tabular-nums">
                    {formatCoreHours(data.resource_usage.cpu_seconds_total)} /{" "}
                    {formatCoreHours(data.resource_usage.cpu_seconds_mean)}
                  </p>
                </InfoField>
                <InfoField label="Peak memory (min / max)">
                  <p className="font-medium tabular-nums">
                    {formatBytes(data.resource_usage.peak_memory_bytes_min)} /{" "}
                    {formatBytes(data.resource_usage.peak_memory_bytes_max)}
                  </p>
                </InfoField>
              </div>
            </InfoSection>
          )}

          {data.reference_datasets && data.reference_datasets.length > 0 && (
            <InfoSection
              title="Reference Datasets"
              help="Observational or reference datasets that this diagnostic uses for comparison. Primary references are essential for the diagnostic to run, while secondary references provide additional context."
            >
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
                        <code className="text-sm font-medium">{ref.slug}</code>
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
            </InfoSection>
          )}

          {data.tags && data.tags.length > 0 && (
            <InfoSection title="Tags">
              <div className="flex flex-wrap gap-2">
                {data.tags.map((tag: string) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </InfoSection>
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
          <NavTab
            value="scalars"
            label="Scalar Values"
            disabled={!data.has_scalar_values}
            help="Single numeric values calculated from the data, such as global means, root mean square errors, or correlation coefficients."
          />
          <NavTab
            value="series"
            label="Series Values"
            disabled={!data.has_series_values}
            help="Time series or multi-dimensional data values, such as monthly means over multiple years or values across different latitudes."
          />
          <TabsTrigger value="figures" asChild>
            <Link
              to="/diagnostics/$providerSlug/$diagnosticSlug/figures"
              params={{ providerSlug, diagnosticSlug }}
            >
              Figures
            </Link>
          </TabsTrigger>
          <NavTab
            value="explorer"
            label="Explorer"
            disabled={!data.aft_link}
            help="Interactive visualizations from the CMIP7 AFT collection that feature this diagnostic."
          />
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
  staticData: {
    title: "Diagnostic Details",
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
