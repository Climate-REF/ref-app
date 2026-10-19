import { useSuspenseQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { format } from "date-fns";
import {
  diagnosticsGetOptions,
  executionsExecutionOptions,
  executionsGetOptions,
} from "@/client/@tanstack/react-query.gen";
import { DownloadOutputs } from "@/components/execution/downloadOutputs.tsx";
import { ExecutionStatusBadge } from "@/components/execution/executionStatusBadge";

import { DetailsPanel } from "@/components/ui/detailsPanel.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { executionStatus } from "@/lib/executionStatus";
import { formatBytes, formatDuration } from "@/lib/format";

/**
 * A tab that only some groups have
 *
 * It navigates on click rather than being a link, as a disabled link could still be followed.
 */
const NavTab = ({
  value,
  label,
  disabled,
}: {
  value: "scalar" | "series";
  label: string;
  disabled: boolean;
}) => {
  const { groupId } = Route.useParams();
  const navigate = useNavigate();
  return (
    <TabsTrigger
      value={value}
      disabled={disabled}
      data-disabled={disabled ? "true" : undefined}
      onClick={() =>
        navigate({ to: `/executions/$groupId/${value}`, params: { groupId } })
      }
    >
      {label}
    </TabsTrigger>
  );
};

const ExecutionInfoLayout = () => {
  const { groupId } = Route.useParams();
  const location = useLocation();

  const { data } = useSuspenseQuery(
    executionsGetOptions({
      path: { group_id: groupId },
    }),
  );

  const { data: execution } = useSuspenseQuery(
    executionsExecutionOptions({
      path: { group_id: groupId },
    }),
  );

  const { data: diagnostic } = useSuspenseQuery(
    diagnosticsGetOptions({
      path: {
        provider_slug: data.provider_slug,
        diagnostic_slug: data.diagnostic_slug,
      },
    }),
  );

  // Determine the active tab based on the current URL pathname
  const activeTab = location.pathname.split("/").pop() || "datasets";

  return (
    <>
      <title>{`${diagnostic.name} - ${data.key} - Climate-REF`}</title>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <DetailsPanel
            title="Execution Summary"
            description={
              <>
                Overview of the execution of a group for{" "}
                <Link
                  to="/diagnostics/$providerSlug/$diagnosticSlug"
                  className="underline"
                  params={{
                    providerSlug: data.provider_slug,
                    diagnosticSlug: data.diagnostic_slug,
                  }}
                >
                  {diagnostic.name}
                </Link>
              </>
            }
            action={
              <DownloadOutputs
                executionGroup={groupId}
                executionId={String(data.executions.at(-1)?.id ?? "")}
              />
            }
            items={[
              {
                label: "Date",
                value: format(
                  new Date(execution.updated_at),
                  "yyyy-MM-dd HH:mm",
                ),
              },
              {
                label: "Execution Group Key",
                value: (
                  <span title="A canonical identifier summarizing the selected datasets and parameters for this execution group.">
                    {data.key}
                  </span>
                ),
                className: "col-span-2",
              },
              {
                label: "Status",
                value: (
                  <ExecutionStatusBadge
                    className="mt-1"
                    status={executionStatus(execution)}
                  />
                ),
              },
              {
                label: "Wall time",
                value: (
                  <span title="Wall clock time taken by the selected execution.">
                    {formatDuration(execution.wall_seconds)}
                  </span>
                ),
              },
              {
                label: "CPU time",
                value: (
                  <span title="CPU time used by the selected execution and its child processes.">
                    {formatDuration(execution.cpu_seconds)}
                  </span>
                ),
              },
              {
                label: "Peak memory",
                value: (
                  <span title="Peak resident memory observed during the selected execution.">
                    {formatBytes(execution.peak_memory_bytes)}
                  </span>
                ),
              },
              {
                label: "Number of outputs",
                value: execution.outputs?.length ?? 0,
              },
            ]}
          />
        </div>

        <div>
          <Tabs value={activeTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="datasets" asChild>
                <Link to="/executions/$groupId/datasets" params={{ groupId }}>
                  Datasets
                </Link>
              </TabsTrigger>
              <TabsTrigger value="executions" asChild>
                <Link to="/executions/$groupId/executions" params={{ groupId }}>
                  Executions
                </Link>
              </TabsTrigger>
              <TabsTrigger value="files" asChild>
                <Link to="/executions/$groupId/files" params={{ groupId }}>
                  Files
                </Link>
              </TabsTrigger>
              <NavTab
                value="scalar"
                label="Scalar Values"
                disabled={!diagnostic.has_scalar_values}
              />
              <NavTab
                value="series"
                label="Series Values"
                disabled={!diagnostic.has_series_values}
              />
              <TabsTrigger value="logs" asChild>
                <Link to="/executions/$groupId/logs" params={{ groupId }}>
                  Logs
                </Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Outlet />
      </div>
    </>
  );
};

export const Route = createFileRoute("/_app/executions/$groupId")({
  component: ExecutionInfoLayout,
  staticData: {
    title: "Execution Details",
  },
});
