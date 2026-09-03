import type { DiagnosticSummary } from "@/client";

const COLUMNS = [
  "provider",
  "diagnostic",
  "slug",
  "timed_execution_count",
  "wall_seconds_total",
  "wall_seconds_mean",
  "wall_seconds_max",
  "cpu_seconds_total",
  "cpu_seconds_mean",
  "peak_memory_bytes_max",
];

function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Serialises the per-diagnostic resource roll-up as CSV, with raw seconds and bytes.
 *
 * Rows are ordered by core hours to match the table, with diagnostics that recorded no CPU time last.
 */
export function resourceUsageCsv(diagnostics: DiagnosticSummary[]): string {
  const rows = [...diagnostics]
    .sort(
      (a, b) =>
        (b.resource_usage?.cpu_seconds_total ?? -1) -
        (a.resource_usage?.cpu_seconds_total ?? -1),
    )
    .map((d) =>
      [
        d.provider.name,
        d.name,
        d.slug,
        d.resource_usage?.timed_execution_count,
        d.resource_usage?.wall_seconds_total,
        d.resource_usage?.wall_seconds_mean,
        d.resource_usage?.wall_seconds_max,
        d.resource_usage?.cpu_seconds_total,
        d.resource_usage?.cpu_seconds_mean,
        d.resource_usage?.peak_memory_bytes_max,
      ]
        .map(csvField)
        .join(","),
    );
  return [COLUMNS.join(","), ...rows].join("\n");
}
