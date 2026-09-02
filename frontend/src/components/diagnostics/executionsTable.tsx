import { useNavigate } from "@tanstack/react-router";
import {
  type CellContext,
  type ColumnDef,
  createColumnHelper,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { SquareArrowOutUpRight } from "lucide-react";
import type { Execution } from "@/client";
import { DataTable } from "@/components/dataTable/dataTable";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatBytes, formatDuration } from "@/lib/format";
import { Route } from "@/routes/_app/executions.$groupId/index";

const columnHelper = createColumnHelper<Execution>();

function OpenCell({
  row: {
    original: { id },
  },
}: CellContext<Execution, unknown>) {
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <button
      type="button"
      aria-label="Open execution in context"
      title="Open execution in context"
      onClick={() => {
        return navigate({
          search: (prev) => ({
            ...prev,
            resultId: id.toString(),
          }),
        });
      }}
      className="inline-flex items-center text-blue-500 hover:text-blue-300"
    >
      <SquareArrowOutUpRight className="pointer-events-none" />
    </button>
  );
}

function LatestSelectedCell({ row }: CellContext<Execution, unknown>) {
  if (row.index === 0) {
    return (
      <Badge variant="outline" title="This is the most recent execution.">
        Latest
      </Badge>
    );
  }
  return null;
}

export const columns: ColumnDef<Execution>[] = [
  {
    accessorKey: "dataset_hash",
    header: () => (
      <span title="Signature of dataset inputs used for this execution.">
        Dataset Hash
      </span>
    ),
    cell: ({ getValue }) => (
      <span title="Unique signature of dataset inputs used for this execution.">
        {String(getValue() ?? "")}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    accessorFn: (row) => row.successful,
    cell: (cell) =>
      cell.getValue() ? (
        <Badge variant="outline" title="Execution succeeded.">
          Success
        </Badge>
      ) : (
        <Badge variant="destructive" title="Execution failed.">
          Failed
        </Badge>
      ),
  },
  {
    id: "latest",
    header: () => (
      <span title="Indicates the most recent or currently selected execution.">
        Latest/Selected
      </span>
    ),
    cell: (context) => <LatestSelectedCell {...context} />,
  },
  {
    id: "wall_seconds",
    header: () => (
      <span title="Wall clock time taken by this execution.">Wall time</span>
    ),
    accessorFn: (row) => row.wall_seconds,
    cell: ({ getValue }) => formatDuration(getValue<number | null>()),
  },
  {
    id: "cpu_seconds",
    header: () => (
      <span title="CPU time used by this execution and its child processes.">
        CPU time
      </span>
    ),
    accessorFn: (row) => row.cpu_seconds,
    cell: ({ getValue }) => formatDuration(getValue<number | null>()),
  },
  {
    id: "peak_memory_bytes",
    header: () => (
      <span title="Peak resident memory observed during this execution.">
        Peak memory
      </span>
    ),
    accessorFn: (row) => row.peak_memory_bytes,
    cell: ({ getValue }) => formatBytes(getValue<number | null>()),
  },
  {
    id: "updated_at",
    header: "Updated At",
    accessorFn: (row) => format(new Date(row.updated_at), "yyyy-MM-dd HH:mm"),
  },
  columnHelper.display({
    id: "open",
    cell: (context) => <OpenCell {...context} />,
  }),
];

interface ResultListTableProps {
  results: Execution[];
}

function ExecutionsTable({ results }: ResultListTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>History of recent diagnostic executions</CardTitle>
        <CardDescription>
          Latest is the most recent run. Selected indicates the execution
          currently in view for files, values, and logs.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          data={results.sort((a, b) =>
            b.updated_at.localeCompare(a.updated_at),
          )}
          columns={columns}
        />
      </CardContent>
    </Card>
  );
}
export default ExecutionsTable;
