import { Link, useNavigate } from "@tanstack/react-router";
import { type ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { SquareArrowOutUpRight } from "lucide-react";
import type { DiagnosticSummary } from "@/client";
import { DataTableColumnHeader } from "@/components/dataTable/columnHeader.tsx";
import { DataTable } from "@/components/dataTable/dataTable.tsx";

const columnHelper = createColumnHelper<DiagnosticSummary>();

export const columns: ColumnDef<DiagnosticSummary>[] = [
  {
    accessorKey: "name",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Name" />
    ),
  },
  {
    accessorKey: "provider.name",
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Provider" />
    ),
  },
  {
    accessorKey: "description",
    header: "Description",
    enableSorting: false,
    cell: ({ getValue }) => {
      const val = String(getValue() ?? "");
      return (
        <span className="text-foreground/80 dark:text-foreground/70 max-w[500px]">
          {val}
        </span>
      );
    },
  },
  {
    id: "has_metric_values",
    accessorFn: (row) => row.has_metric_values,
    enableSorting: true,
    sortingFn: (rowA, rowB, columnId) => {
      const a = rowA.getValue<boolean>(columnId) ? 1 : 0;
      const b = rowB.getValue<boolean>(columnId) ? 1 : 0;
      return a - b;
    },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Scalar Values" />
    ),
    cell: (cell) =>
      cell.getValue() ? (
        <span
          className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"
          title="This diagnostic has scalar metric values available."
        >
          ● Available
        </span>
      ) : (
        <span
          className="inline-flex items-center gap-1 text-muted-foreground"
          title="No scalar metric values available."
        >
          ○ None
        </span>
      ),
  },
  {
    accessorKey: "successful_execution_group_count",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Execution Groups" />
    ),
    enableSorting: true,
    cell: (cell) => {
      const successful = cell.getValue<number>();
      const total = cell.row.original.execution_group_count ?? 0;
      const allSuccessful = total > 0 && successful === total;
      const className = allSuccessful
        ? "text-emerald-600 dark:text-emerald-400 font-medium"
        : "text-muted-foreground";
      return (
        <span
          className={className}
          title={`${successful} successful out of ${total} groups`}
        >
          {successful}/{total}
        </span>
      );
    },
  },
  {
    id: "aft_link",
    accessorFn: (row) => row.aft_link?.id || null,
    enableSorting: true,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="AFT ID" />
    ),
    cell: (cell) => {
      const aftId = cell.getValue<string | null>();
      return aftId ? (
        <span className="text-foreground font-medium">{aftId}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },

  columnHelper.display({
    id: "link",
    cell: (cell) => (
      <Link
        to="/diagnostics/$providerSlug/$diagnosticSlug"
        params={{
          providerSlug: cell.row.original.provider.slug,
          diagnosticSlug: cell.row.original.slug,
        }}
      >
        <SquareArrowOutUpRight className="text-blue-500 hover:text-blue-300 dark:text-blue-400 dark:hover:text-blue-300" />
      </Link>
    ),
  }),
];

interface DiagnosticSummaryTableProps {
  summaries: DiagnosticSummary[];
}

function DiagnosticSummaryTable({ summaries }: DiagnosticSummaryTableProps) {
  const navigate = useNavigate();

  const handleRowClick = (row: DiagnosticSummary) => {
    navigate({
      to: "/diagnostics/$providerSlug/$diagnosticSlug",
      params: { providerSlug: row.provider.slug, diagnosticSlug: row.slug },
    });
  };
  return (
    <DataTable data={summaries} columns={columns} onRowClick={handleRowClick} />
  );
}
export default DiagnosticSummaryTable;
