import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { SquareArrowOutUpRight } from "lucide-react";
import type { DiagnosticRuns } from "@/client";
import { DataTable } from "@/components/dataTable/dataTable";
import { RunOutcomeBar } from "@/components/models/runOutcomeBar";

export const columns: ColumnDef<DiagnosticRuns>[] = [
  {
    accessorKey: "diagnostic_name",
    header: "Diagnostic",
    cell: ({ getValue }) => {
      const value = String(getValue() ?? "");
      return (
        <span
          className="block max-w-[320px] truncate font-medium"
          title={value}
        >
          {value}
        </span>
      );
    },
  },
  {
    accessorKey: "provider_name",
    header: "Provider",
  },
  {
    id: "runs",
    header: "Runs",
    accessorFn: (row) => row.execution_groups.success_rate_percentage,
    cell: ({ row }) => <RunOutcomeBar counts={row.original.execution_groups} />,
  },
  {
    id: "failed",
    header: "Failed",
    accessorFn: (row) => row.execution_groups.failed,
    cell: ({ getValue }) => {
      const failed = getValue<number>();
      return failed ? (
        <span className="font-medium text-destructive tabular-nums">
          {failed}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    id: "link",
    cell: ({ row }) => (
      <Link
        to="/diagnostics/$providerSlug/$diagnosticSlug"
        params={{
          providerSlug: row.original.provider_slug,
          diagnosticSlug: row.original.diagnostic_slug,
        }}
        aria-label={`Open ${row.original.diagnostic_name}`}
        title={`Open ${row.original.diagnostic_name}`}
      >
        <SquareArrowOutUpRight className="text-blue-500 hover:text-blue-300 dark:text-blue-400 dark:hover:text-blue-300" />
      </Link>
    ),
  },
];

export function DiagnosticRunsTable({
  diagnostics,
}: {
  diagnostics: DiagnosticRuns[];
}) {
  return (
    <DataTable
      data={diagnostics}
      columns={columns}
      initialSorting={[{ id: "failed", desc: true }]}
    />
  );
}
