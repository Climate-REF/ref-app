import type { DiagnosticCatalogEntry, DiagnosticValueFlags } from "@/client";

/**
 * A catalog entry with its metric value flags, which are null until those load.
 */
export type CatalogDiagnostic = DiagnosticCatalogEntry & {
  has_metric_values: boolean | null;
  has_scalar_values: boolean | null;
  has_series_values: boolean | null;
};

export function withValueFlags(
  entries: DiagnosticCatalogEntry[],
  flags: DiagnosticValueFlags[] | undefined,
): CatalogDiagnostic[] {
  const byId = new Map(flags?.map((f) => [f.id, f]));
  return entries.map((entry) => {
    const found = byId.get(entry.id);
    return {
      ...entry,
      has_metric_values: found?.has_metric_values ?? null,
      has_scalar_values: found?.has_scalar_values ?? null,
      has_series_values: found?.has_series_values ?? null,
    };
  });
}
