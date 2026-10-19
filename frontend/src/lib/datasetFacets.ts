import type { Dataset } from "@/client";

/** The values each metadata facet takes across `datasets`, each value once, in the order they first appear. */
export function collectFacets(
  datasets: Pick<Dataset, "metadata">[],
): Record<string, string[]> {
  const facets = new Map<string, Set<string>>();
  for (const { metadata } of datasets) {
    for (const [key, value] of Object.entries(metadata ?? {})) {
      const values = facets.get(key) ?? new Set<string>();
      values.add(value);
      facets.set(key, values);
    }
  }
  return Object.fromEntries(
    [...facets].map(([key, values]) => [key, [...values]]),
  );
}
