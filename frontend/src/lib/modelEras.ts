/**
 * Keeping CMIP6 and CMIP7 apart, and deciding when a chart has enough models to be worth drawing.
 */

export const MIP_ERAS = ["CMIP6", "CMIP7"] as const;

export type MipEra = (typeof MIP_ERAS)[number];

/** Charts below this many distinct models are suppressed entirely. */
export const MIN_MODELS_FOR_CHART = 3;

/** Charts below this many distinct model families carry a sparse-sample warning. */
export const MIN_FAMILIES_FOR_CONFIDENCE = 10;

type Dimensioned = {
  dimensions: { [key: string]: string };
  kind?: "model" | "reference";
};

/**
 * The era a value belongs to, taken from the `mip_id` dimension.
 *
 * Reference (observational) values carry no era, so they belong on every era's chart.
 */
export function eraOf(value: Dimensioned): MipEra | null {
  const mipId = value.dimensions.mip_id?.toUpperCase();
  return MIP_ERAS.find((era) => era === mipId) ?? null;
}

/**
 * The model family a `source_id` belongs to, taken as the segment before the first hyphen.
 *
 * ACCESS-CM2 and ACCESS-ESM1-5 are both ACCESS, so a centre contributing several models does not
 * read as several independent lines of evidence.
 */
export function modelFamily(sourceId: string): string {
  return sourceId.split("-")[0] || sourceId;
}

function isReference(value: Dimensioned): boolean {
  return (value.kind ?? value.dimensions.kind) === "reference";
}

export interface SampleSize {
  models: number;
  families: number;
  /** Charts below `MIN_MODELS_FOR_CHART` models are not shown at all. */
  enoughModels: boolean;
  /** Charts below `MIN_FAMILIES_FOR_CONFIDENCE` families are shown with a warning. */
  sparseFamilies: boolean;
}

export function sampleSize(values: Dimensioned[]): SampleSize {
  const models = new Set<string>();
  const families = new Set<string>();

  for (const value of values) {
    if (isReference(value)) continue;
    const sourceId = value.dimensions.source_id;
    if (!sourceId) continue;
    models.add(sourceId);
    families.add(modelFamily(sourceId));
  }

  return {
    models: models.size,
    families: families.size,
    enoughModels: models.size > MIN_MODELS_FOR_CHART,
    sparseFamilies: families.size < MIN_FAMILIES_FOR_CONFIDENCE,
  };
}

/**
 * Split values into one bucket per era, dropping eras with no model data.
 *
 * Values with no era (references, and anything predating the `mip_id` dimension) are repeated in
 * every bucket so each chart keeps its baseline.
 */
export function splitByEra<T extends Dimensioned>(
  values: T[],
): { era: MipEra | null; values: T[] }[] {
  const buckets = new Map<MipEra, T[]>();
  const shared: T[] = [];

  for (const value of values) {
    const era = eraOf(value);
    if (era === null) {
      shared.push(value);
      continue;
    }
    const bucket = buckets.get(era);
    if (bucket) bucket.push(value);
    else buckets.set(era, [value]);
  }

  if (buckets.size === 0) {
    // No era recorded anywhere, so keep the single unlabelled chart rather than inventing an era.
    return shared.length ? [{ era: null, values: shared }] : [];
  }

  return MIP_ERAS.filter((era) => buckets.has(era)).map((era) => ({
    era,
    values: [...(buckets.get(era) ?? []), ...shared],
  }));
}
