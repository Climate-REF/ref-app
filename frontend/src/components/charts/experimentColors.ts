// Fixed colours so the same experiment looks the same on every chart on a page.
// Blue is the concentration driven run, orange the emissions driven one.
const EXPERIMENT_COLORS: Record<string, string> = {
  historical: "#4e79a7",
  "esm-hist": "#f28e2b",
};

export const EXPERIMENT_ORDER = Object.keys(EXPERIMENT_COLORS);

/** The palette without the reserved colours, so other values never borrow one. */
export function unreservedPalette(palette: string[]): string[] {
  const reserved = new Set(Object.values(EXPERIMENT_COLORS));
  return palette.filter((color) => !reserved.has(color));
}

/** Legend entries for the experiments present, in their reserved order. */
export function experimentLegend(
  experimentIds: Iterable<string | undefined>,
): { label: string; color: string }[] {
  const present = new Set(experimentIds);
  return EXPERIMENT_ORDER.filter((id) => present.has(id)).map((id) => ({
    label: id,
    color: EXPERIMENT_COLORS[id],
  }));
}

/** Fixed colour for a dimension value, or undefined when the value has no reserved colour. */
export function getFixedDimensionColor(
  dimension: string | undefined,
  value: string | undefined,
): string | undefined {
  if (dimension !== "experiment_id" || !value) return undefined;
  return EXPERIMENT_COLORS[value];
}
