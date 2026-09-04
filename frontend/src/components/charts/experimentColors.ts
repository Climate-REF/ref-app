// Fixed colours so the same experiment looks the same on every chart on a page.
// Blue is the concentration driven run, orange the emissions driven one.
const EXPERIMENT_COLORS: Record<string, string> = {
  historical: "#4e79a7",
  "esm-hist": "#f28e2b",
};

const EXPERIMENT_ORDER = Object.keys(EXPERIMENT_COLORS);

/** Fixed colour for a dimension value, or undefined when the value has no reserved colour. */
export function getFixedDimensionColor(
  dimension: string | undefined,
  value: string | undefined,
): string | undefined {
  if (dimension !== "experiment_id" || !value) return undefined;
  return EXPERIMENT_COLORS[value];
}

/** Sort so experiments with a reserved colour come first, in their reserved order. */
export function compareDimensionValues(
  dimension: string | undefined,
  a: string,
  b: string,
): number {
  if (dimension === "experiment_id") {
    const ia = EXPERIMENT_ORDER.indexOf(a);
    const ib = EXPERIMENT_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    }
  }
  return a.localeCompare(b);
}
