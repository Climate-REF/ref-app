import type { ColumnDef } from "@tanstack/react-table";
import type { EnsembleComparison } from "@/client";
import { DataTable } from "@/components/dataTable/dataTable";
import { EnsemblePositionBar } from "@/components/models/ensemblePositionBar";
import { Badge } from "@/components/ui/badge";

/** Render a metric value at a fixed precision, so a column of them lines up. */
function formatValue(value: number, units: string | null): string {
  const rendered =
    Math.abs(value) >= 1e-3 && Math.abs(value) < 1e6
      ? value.toPrecision(4)
      : value.toExponential(2);
  return units ? `${rendered} ${units}` : rendered;
}

export const columns: ColumnDef<EnsembleComparison>[] = [
  {
    accessorKey: "diagnostic_name",
    header: "Diagnostic",
    cell: ({ getValue }) => {
      const value = String(getValue() ?? "");
      return (
        <span className="block max-w-[200px] truncate" title={value}>
          {value}
        </span>
      );
    },
  },
  {
    id: "metric",
    header: "Metric",
    accessorFn: (row) => Object.values(row.dimensions).join(" · "),
    cell: ({ row }) => (
      <div className="flex max-w-[280px] flex-wrap gap-1">
        {Object.entries(row.original.dimensions).map(([key, value]) => (
          <Badge key={key} variant="secondary" title={`${key} = ${value}`}>
            {value}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    id: "model_value",
    header: "This model",
    accessorFn: (row) => row.model_value,
    cell: ({ row }) => (
      <span className="tabular-nums whitespace-nowrap">
        {formatValue(row.original.model_value, row.original.units)}
      </span>
    ),
  },
  {
    id: "ensemble_median",
    header: "Ensemble median",
    accessorFn: (row) => row.ensemble.median,
    cell: ({ row }) => (
      <span className="tabular-nums whitespace-nowrap text-muted-foreground">
        {formatValue(row.original.ensemble.median, row.original.units)}
      </span>
    ),
  },
  {
    id: "position",
    meta: { label: "Position" },
    header: () => (
      <span title="The ensemble's inter-quartile box on its own min to max scale, with this model marked.">
        Position
      </span>
    ),
    accessorFn: (row) => row.percentile,
    cell: ({ row }) => <EnsemblePositionBar comparison={row.original} />,
  },
  {
    id: "z_score",
    meta: { label: "z-score" },
    header: () => (
      <span title="Distance from the ensemble mean, in standard deviations.">
        z-score
      </span>
    ),
    accessorFn: (row) => (row.z_score === null ? 0 : Math.abs(row.z_score)),
    cell: ({ row }) => {
      const { z_score, is_outlier } = row.original;
      if (z_score === null) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <Badge variant={is_outlier ? "destructive" : "outline"}>
          {z_score > 0 ? "+" : ""}
          {z_score.toFixed(2)}
        </Badge>
      );
    },
  },
  {
    id: "ensemble_count",
    meta: { label: "Models" },
    header: () => (
      <span title="Models reporting this metric, this one included.">
        Models
      </span>
    ),
    accessorFn: (row) => row.ensemble.count,
  },
];

export function EnsembleComparisonTable({
  comparisons,
  loading,
}: {
  comparisons: EnsembleComparison[];
  loading?: boolean;
}) {
  return (
    <DataTable
      data={comparisons}
      columns={columns}
      loading={loading}
      canHideColumns
      initialSorting={[{ id: "z_score", desc: true }]}
    />
  );
}
