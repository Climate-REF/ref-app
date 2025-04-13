import type { MetricExecutionGroup } from "@/client";
import { metricsGetMetricExecutionsOptions } from "@/client/@tanstack/react-query.gen.ts";
import { DataTable } from "@/components/dataTable/dataTable.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { useSuspenseQuery } from "@tanstack/react-query";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";

import { Link } from "@tanstack/react-router";
import { SquareArrowOutUpRight } from "lucide-react";

const columnHelper = createColumnHelper<MetricExecutionGroup>();

export const columns: ColumnDef<MetricExecutionGroup>[] = [
  {
    accessorKey: "key",
    header: "Key",
    cell: (cell) => (
      <div className={"max-w-1/3 text-ellipsis"}>
        {cell.getValue() as string}
      </div>
    ),
  },
  {
    header: "Successful",
    accessorKey: "latest_result.successful",
    cell: (cell) =>
      cell.getValue() ? (
        <Badge variant={"outline"}>Yes</Badge>
      ) : (
        <Badge variant={"destructive"}>No</Badge>
      ),
  },
  {
    id: "updated_at",
    header: "Updated At",
    accessorFn: (row) => format(new Date(row.updated_at), "yyyy-MM-dd HH:mm"),
  },
  columnHelper.display({
    id: "link",
    cell: (cell) => (
      <Link
        to="/executions/$groupId"
        params={{ groupId: cell.row.original.id.toString() }}
      >
        <SquareArrowOutUpRight className="hover:text-blue-300 text-blue-500" />
      </Link>
    ),
  }),
];

interface ExecutionListTableProps {
  providerSlug: string;
  metricSlug: string;
}

function ExecutionGroupTable({
  providerSlug,
  metricSlug,
}: ExecutionListTableProps) {
  const { data, isLoading } = useSuspenseQuery(
    metricsGetMetricExecutionsOptions({
      path: { provider_slug: providerSlug, metric_slug: metricSlug },
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Metric Execution Groups</CardTitle>
        <CardDescription className={"max-w-1/2"}>
          A Metric Execution Group in the REF represents a unique combination of
          datasets used to execute a specific metric. Each group can have
          multiple results associated with it as new datasets are added or
          removed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          data={data?.data ?? []}
          columns={columns}
          loading={isLoading}
        />
      </CardContent>
    </Card>
  );
}
export default ExecutionGroupTable;
