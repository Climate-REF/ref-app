import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { SquareArrowOutUpRight } from "lucide-react";
import type { FailedRun } from "@/client";
import { DataTable } from "@/components/dataTable/dataTable";
import { Badge } from "@/components/ui/badge";

const OUTCOME_LABELS: Record<
  string,
  { label: string; variant: "destructive" | "secondary" }
> = {
  failed: { label: "Failed", variant: "destructive" },
  running: { label: "Running", variant: "secondary" },
  not_started: { label: "Not started", variant: "secondary" },
};

export const columns: ColumnDef<FailedRun>[] = [
  {
    accessorKey: "key",
    header: () => (
      <span title="The selectors that identify this execution group.">Key</span>
    ),
    cell: ({ getValue }) => {
      const value = String(getValue() ?? "");
      return (
        <span className="block max-w-[320px] truncate" title={value}>
          {value}
        </span>
      );
    },
  },
  {
    accessorKey: "diagnostic_name",
    header: "Diagnostic",
    cell: ({ getValue }) => {
      const value = String(getValue() ?? "");
      return (
        <span className="block max-w-[260px] truncate" title={value}>
          {value}
        </span>
      );
    },
  },
  {
    accessorKey: "outcome",
    header: "Outcome",
    cell: ({ getValue }) => {
      const outcome = String(getValue() ?? "");
      const display = OUTCOME_LABELS[outcome] ?? {
        label: outcome,
        variant: "secondary" as const,
      };
      return <Badge variant={display.variant}>{display.label}</Badge>;
    },
  },
  {
    id: "updated_at",
    header: "Updated",
    accessorFn: (row) => format(new Date(row.updated_at), "yyyy-MM-dd HH:mm"),
  },
  {
    id: "link",
    cell: ({ row }) => (
      <Link
        to="/executions/$groupId"
        params={{ groupId: row.original.execution_group_id.toString() }}
        aria-label="Open execution group"
        title="Open execution group"
      >
        <SquareArrowOutUpRight className="text-blue-500 hover:text-blue-300 dark:text-blue-400 dark:hover:text-blue-300" />
      </Link>
    ),
  },
];

export function FailedRunsTable({ failures }: { failures: FailedRun[] }) {
  if (failures.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Every run of this model succeeded.
      </p>
    );
  }

  return (
    <DataTable
      data={failures}
      columns={columns}
      initialSorting={[{ id: "updated_at", desc: true }]}
    />
  );
}
