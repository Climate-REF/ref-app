import type { MetricExecution } from "@/client";
import { metricsGetMetricExecutionsOptions } from "@/client/@tanstack/react-query.gen.ts";
import { DataTable } from "@/components/dataTable/dataTable.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { useSuspenseQuery } from "@tanstack/react-query";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";

import { SquareArrowOutUpRight } from "lucide-react";
import { Link } from "react-router";

const columnHelper = createColumnHelper<MetricExecution>();

export const columns: ColumnDef<MetricExecution>[] = [
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
    accessorKey: "successful",
    cell: (cell) =>
      cell.getValue() ? (
        <Badge variant={"outline"}>Yes</Badge>
      ) : (
        <Badge variant={"destructive"}>No</Badge>
      ),
  },
  columnHelper.display({
    id: "link",
    cell: (cell) => (
      <Link to={`/executions/${cell.row.original.id}`}>
        <SquareArrowOutUpRight className="hover:text-blue-300 text-blue-500" />
      </Link>
    ),
  }),
];

interface ExecutionListTableProps {
  providerSlug: string;
  metricSlug: string;
}

function ExecutionListTable({
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
        <CardTitle>List of recent metric executions</CardTitle>
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
export default ExecutionListTable;
