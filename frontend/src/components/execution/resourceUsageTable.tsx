import { Link, useNavigate } from "@tanstack/react-router";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { SquareArrowOutUpRight } from "lucide-react";
import type { DiagnosticSummary } from "@/client";
import { DataTableColumnHeader } from "@/components/dataTable/columnHeader.tsx";
import { DataTable } from "@/components/dataTable/dataTable.tsx";
import {
  formatBytes,
  formatCoreHours,
  formatCount,
  formatDuration,
} from "@/lib/format";

const columnHelper = createColumnHelper<DiagnosticSummary>();

function numericColumn(
  id: string,
  title: string,
  description: string,
  accessor: (row: DiagnosticSummary) => number | null | undefined,
  render: (value: number | undefined) => string,
): ColumnDef<DiagnosticSummary> {
  return {
    id,
    accessorFn: (row) => accessor(row) ?? undefined,
    enableSorting: true,
    sortUndefined: "last",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={title} />
    ),
    cell: (cell) => (
      <span className="tabular-nums" title={description}>
        {render(cell.getValue<number | undefined>())}
      </span>
    ),
  };
}

export const columns: ColumnDef<DiagnosticSummary>[] = [
  {
    accessorKey: "name",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Diagnostic" />
    ),
    cell: ({ getValue }) => {
      const val = String(getValue() ?? "");
      return (
        <span className="block truncate max-w-[200px]" title={val}>
          {val}
        </span>
      );
    },
  },
  {
    accessorKey: "provider.name",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Provider" />
    ),
    cell: ({ getValue }) => {
      const val = String(getValue() ?? "");
      return (
        <span className="block truncate max-w-[110px]" title={val}>
          {val}
        </span>
      );
    },
  },
  numericColumn(
    "timed_executions",
    "Timed",
    "Executions that recorded a wall time, out of all executions.",
    (row) => row.resource_usage?.timed_execution_count,
    formatCount,
  ),
  numericColumn(
    "wall_mean",
    "Wall\nmean",
    "Mean wall clock time per timed execution.",
    (row) => row.resource_usage?.wall_seconds_mean,
    formatDuration,
  ),
  numericColumn(
    "wall_max",
    "Wall\nmax",
    "Longest wall clock time of any execution.",
    (row) => row.resource_usage?.wall_seconds_max,
    formatDuration,
  ),
  numericColumn(
    "core_hours",
    "Core\nhours",
    "Core hours consumed across the executions that recorded CPU time.",
    (row) => row.resource_usage?.cpu_seconds_total,
    formatCoreHours,
  ),
  numericColumn(
    "core_hours_mean",
    "Core hours\nmean",
    "Mean core hours per execution that recorded CPU time.",
    (row) => row.resource_usage?.cpu_seconds_mean,
    formatCoreHours,
  ),
  numericColumn(
    "memory_max",
    "Peak\nmemory",
    "Largest peak resident memory of any execution.",
    (row) => row.resource_usage?.peak_memory_bytes_max,
    formatBytes,
  ),
  columnHelper.display({
    id: "link",
    cell: (cell) => (
      <Link
        to="/diagnostics/$providerSlug/$diagnosticSlug"
        params={{
          providerSlug: cell.row.original.provider.slug,
          diagnosticSlug: cell.row.original.slug,
        }}
        aria-label="Open diagnostic"
        title="Open diagnostic"
      >
        <SquareArrowOutUpRight className="text-blue-500 hover:text-blue-300 dark:text-blue-400 dark:hover:text-blue-300" />
      </Link>
    ),
  }),
];

interface ResourceUsageTableProps {
  diagnostics: DiagnosticSummary[];
}

export function ResourceUsageTable({ diagnostics }: ResourceUsageTableProps) {
  const navigate = useNavigate();

  const handleRowClick = (row: DiagnosticSummary) => {
    navigate({
      to: "/diagnostics/$providerSlug/$diagnosticSlug",
      params: { providerSlug: row.provider.slug, diagnosticSlug: row.slug },
    });
  };

  return (
    <DataTable
      data={diagnostics}
      columns={columns}
      onRowClick={handleRowClick}
      initialSorting={[{ id: "core_hours", desc: true }]}
    />
  );
}
