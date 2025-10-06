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
  executionsExecutionOptions,
  executionsGetOptions,
} from "@/client/@tanstack/react-query.gen";
import { DownloadOutputs } from "@/components/execution/downloadOutputs.tsx";
import { Badge } from "@/components/ui/badge";

import { DetailsPanel } from "@/components/ui/detailsPanel.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ExecutionInfoLayout = () => {
  const { groupId } = Route.useParams();
  // const { executionId } = Route.useSearch();
  const location = useLocation();
  const navigate = useNavigate();

  const { data } = useSuspenseQuery(
    executionsGetOptions({
      path: { group_id: groupId },
    }),
  );

  const { data: execution } = useSuspenseQuery(
    executionsExecutionOptions({
      path: { group_id: groupId },
      // query: { execution_id: executionId },
    }),
  );

  const executionId = undefined;

  const hasScalar = data.diagnostic.has_scalar_values;
  const hasSeries = data.diagnostic.has_series_values;

  // Determine the active tab based on the current URL pathname
  const activeTab = location.pathname.split("/").pop() || "datasets";

  return (
    <>
      <title>{`${data?.diagnostic?.name} - ${data?.key} - Climate REF`}</title>
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
                    providerSlug: data.diagnostic.provider.slug,
                    diagnosticSlug: data.diagnostic.slug,
                  }}
                >
                  {data.diagnostic.name}
                </Link>
              </>
            }
            action={
              <DownloadOutputs
                executionGroup={groupId}
                executionId={(
                  executionId ??
                  data.latest_execution?.id ??
                  ""
                ).toString()}
              />
            }
            items={[
              {
                label: "Date",
                value: format(
                  new Date(execution.updated_at as string),
                  "yyyy-MM-dd HH:mm",
                ),
              },
              {
                label: "Execution Group Key",
                value: (
                  <span title="A canonical identifier summarizing the selected datasets and parameters for this execution group.">
                    {data?.key}
                  </span>
                ),
                className: "col-span-2",
              },
              {
                label: "Status",
                value: (
                  <Badge
                    className="mt-1"
                    title="Whether the selected execution completed without errors."
                  >
                    {execution.successful ? "Success" : "Failed"}
                  </Badge>
                ),
              },
              {
                label: "Execution Time",
                value:
                  // Currently not implemented in backend
                  execution.updated_at
                    ? (() => {
                        return "—";
                      })()
                    : "—",
              },
              {
                label: "Number of outputs",
                value: execution.outputs.length,
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
              <TabsTrigger
                value="scalar"
                disabled={!hasScalar}
                data-disabled={!hasScalar ? "true" : undefined}
                onClick={() =>
                  navigate({
                    to: "/executions/$groupId/scalar",
                    params: { groupId },
                  })
                }
              >
                Scalar Values
              </TabsTrigger>
              <TabsTrigger
                value="series"
                disabled={!hasSeries}
                data-disabled={!hasSeries ? "true" : undefined}
                onClick={() =>
                  navigate({
                    to: "/executions/$groupId/series",
                    params: { groupId },
                  })
                }
              >
                Series Values
              </TabsTrigger>
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
