import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { format } from "date-fns";
import { SquareArrowOutUpRight } from "lucide-react";
import type { ExecutionGroup } from "@/client";
import { diagnosticsListExecutionGroupsOptions } from "@/client/@tanstack/react-query.gen.ts";
import { DataTable } from "@/components/dataTable/dataTable.tsx";
import { Badge, SourceTypeBadge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";

const columnHelper = createColumnHelper<ExecutionGroup>();

export const columns: ColumnDef<ExecutionGroup>[] = [
  {
    id: "selectors",
    header: "Selectors",
    cell: (cell) => {
      const selectors = cell.row.original.selectors;

      return (
        <div className="flex flex-col gap-2">
          {Object.entries(selectors).map(([sourceType, values]) => (
            <div className="flex gap-2" key={sourceType}>
              {values.map(([key, value]) => (
                <SourceTypeBadge sourceType={sourceType} key={key}>
                  {value}
                </SourceTypeBadge>
              ))}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    accessorKey: "diagnostic.name",
    header: "Diagnostic",
  },
  {
    accessorKey: "diagnostic.provider.name",
    header: "Provider",
  },
  {
    accessorKey: "key",
    header: "Key",
  },
  {
    header: "Datasets",
    accessorFn: (row) => row.latest_execution?.dataset_count,
  },
  {
    header: "Dirty",
    accessorKey: "dirty",
    cell: (cell) =>
      cell.getValue() ? (
        <Badge variant="destructive">Yes</Badge>
      ) : (
        <Badge variant="outline">No</Badge>
      ),
  },
  {
    header: "Successful",
    accessorKey: "latest_execution.successful",
    cell: (cell) =>
      cell.getValue() ? (
        <Badge variant="outline">Yes</Badge>
      ) : (
        <Badge variant="destructive">No</Badge>
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

interface ExecutionGroupTableProps {
  executionGroups?: ExecutionGroup[];
  providerSlug?: string;
  diagnosticSlug?: string;
}

function ExecutionGroupTable({
  executionGroups,
  providerSlug,
  diagnosticSlug,
}: ExecutionGroupTableProps) {
  const navigate = useNavigate();

  const handleRowClick = (row: ExecutionGroup) => {
    navigate({
      to: "/executions/$groupId",
      params: { groupId: row.id.toString() },
    });
  };

  if (providerSlug && diagnosticSlug) {
    const { data, isLoading } = useSuspenseQuery(
      diagnosticsListExecutionGroupsOptions({
        path: { provider_slug: providerSlug, diagnostic_slug: diagnosticSlug },
      }),
    );
    return (
      <Card>
        <CardHeader>
          <CardTitle>Execution Groups</CardTitle>
          <CardDescription className={"max-w-3/4"}>
            An Execution Group represents a unique combination of datasets used to
            execute a specific diagnostic. Each group can have multiple results
            associated with it as new datasets are added or removed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={data?.data ?? []}
            columns={columns}
            loading={isLoading}
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>
    );
  }

  return <DataTable data={executionGroups ?? []} columns={columns} />;
}
export default ExecutionGroupTable;