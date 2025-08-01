import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { SquareArrowOutUpRight } from "lucide-react";
import type { ExecutionGroup } from "@/client";
import { DataTable } from "@/components/dataTable/dataTable.tsx";

const columnHelper = createColumnHelper<ExecutionGroup>();

export const columns: ColumnDef<ExecutionGroup>[] = [
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
    accessorKey: "latest_execution.dataset_count",
    header: "Datasets",
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

interface ExecutionGroupListProps {
  executionGroups: ExecutionGroup[];
}

function ExecutionGroupList({ executionGroups }: ExecutionGroupListProps) {
  return <DataTable data={executionGroups} columns={columns} />;
}
export default ExecutionGroupList;