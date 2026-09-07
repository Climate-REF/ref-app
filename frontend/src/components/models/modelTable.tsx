import { Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { SquareArrowOutUpRight } from "lucide-react";
import type { ModelSummary } from "@/client";
import { DataTable } from "@/components/dataTable/dataTable";
import { RunOutcomeBar } from "@/components/models/runOutcomeBar";
import { Badge } from "@/components/ui/badge";
import { formatCount } from "@/lib/format";

export const columns: ColumnDef<ModelSummary>[] = [
  {
    accessorKey: "source_id",
    header: "Model",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.source_id}</span>
    ),
  },
  {
    id: "institution_ids",
    header: "Institution",
    accessorFn: (row) => row.institution_ids.join(", "),
    cell: ({ getValue }) => {
      const value = String(getValue() ?? "");
      return (
        <span className="block max-w-[200px] truncate" title={value}>
          {value || "—"}
        </span>
      );
    },
  },
  {
    id: "mip_eras",
    header: "MIP era",
    accessorFn: (row) => row.mip_eras.join(", "),
    cell: ({ row }) => (
      <div className="flex gap-1">
        {row.original.mip_eras.map((era) => (
          <Badge key={era} variant="outline">
            {era}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    accessorKey: "dataset_count",
    header: "Datasets",
    cell: ({ getValue }) => formatCount(getValue<number>()),
  },
  {
    accessorKey: "diagnostic_count",
    header: "Diagnostics",
    cell: ({ getValue }) => formatCount(getValue<number>()),
  },
  {
    id: "runs",
    header: () => (
      <span title="Execution groups this model took part in, by the outcome of their latest execution.">
        Runs
      </span>
    ),
    accessorFn: (row) => row.execution_groups.success_rate_percentage,
    cell: ({ row }) => <RunOutcomeBar counts={row.original.execution_groups} />,
  },
  {
    id: "link",
    cell: ({ row }) => (
      <Link
        to="/models/$sourceId"
        params={{ sourceId: row.original.source_id }}
        aria-label={`Open ${row.original.source_id}`}
        title={`Open ${row.original.source_id}`}
      >
        <SquareArrowOutUpRight className="text-blue-500 hover:text-blue-300 dark:text-blue-400 dark:hover:text-blue-300" />
      </Link>
    ),
  },
];

export function ModelTable({
  models,
  loading,
}: {
  models: ModelSummary[];
  loading?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <DataTable
      data={models}
      columns={columns}
      loading={loading}
      initialSorting={[{ id: "source_id", desc: false }]}
      onRowClick={(row) =>
        navigate({
          to: "/models/$sourceId",
          params: { sourceId: row.source_id },
        })
      }
    />
  );
}
