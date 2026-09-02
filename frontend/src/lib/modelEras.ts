/**
 * Keeping CMIP6 and CMIP7 apart, and deciding when a chart has enough models to be worth drawing.
 */

import {
  type DimensionedData,
  isReferenceItem,
} from "@/components/explorer/grouping";

export const MIP_ERAS = ["CMIP6", "CMIP7"] as const;

export type MipEra = (typeof MIP_ERAS)[number];

/** A chart needs at least this many distinct models before it is drawn at all. */
export const MIN_MODELS_FOR_CHART = 4;

/** A chart drawn from fewer than this many distinct model families carries a sparse-sample warning. */
export const MIN_FAMILIES_FOR_CONFIDENCE = 10;

/**
 * The era a value belongs to, from the `mip_era` dimension the API stamps on each model value.
 *
 * It is absent when the execution's inputs did not settle an era, so callers must not read a null
 * era as meaning observational data.
 */
export function eraOf(value: DimensionedData): MipEra | null {
  const label = value.dimensions.mip_era?.toUpperCase();
  return MIP_ERAS.find((era) => era === label) ?? null;
}

/**
 * The model family a `source_id` belongs to, taken as the segment before the first hyphen.
 *
 * ACCESS-CM2 and ACCESS-ESM1-5 are both ACCESS, so a centre contributing several models does not
 * read as several independent lines of evidence.
 */
export function modelFamily(sourceId: string): string {
  return sourceId.split("-")[0];
}

export interface SampleSize {
  models: number;
  families: number;
  /** False when too few models contributed for the chart to be worth drawing. */
  enoughModels: boolean;
  /** True when the models that did contribute come from too few families to be independent. */
  sparseFamilies: boolean;
}

export function sampleSize(values: DimensionedData[]): SampleSize {
  const models = new Set<string>();
  const families = new Set<string>();

  for (const value of values) {
    if (isReferenceItem(value)) continue;
    const sourceId = value.dimensions.source_id;
    if (!sourceId) continue;
    models.add(sourceId);
    families.add(modelFamily(sourceId));
  }

  // A diagnostic that reports one value per region rather than per model has nothing to gate on.
  const gated = models.size > 0;

  return {
    models: models.size,
    families: families.size,
    enoughModels: !gated || models.size >= MIN_MODELS_FOR_CHART,
    sparseFamilies: gated && families.size < MIN_FAMILIES_FOR_CONFIDENCE,
  };
}

/**
 * Split values into one chart's worth per era.
 *
 * Only reference values are shared across eras, because they are the baseline every chart needs.
 * A model value carrying no era gets its own unlabelled section rather than being repeated, since
 * repeating it would put CMIP6 results on the CMIP7 chart.
 */
export function splitByEra<T extends DimensionedData>(
  values: T[],
): { era: MipEra | null; values: T[] }[] {
  const buckets = new Map<MipEra | null, T[]>();
  const references: T[] = [];

  for (const value of values) {
    if (isReferenceItem(value)) {
      references.push(value);
      continue;
    }
    const era = eraOf(value);
    const bucket = buckets.get(era);
    if (bucket) bucket.push(value);
    else buckets.set(era, [value]);
  }

  if (buckets.size === 0) {
    return references.length ? [{ era: null, values: references }] : [];
  }

  // Unlabelled data sorts last, behind the eras it could not be attributed to.
  const order: (MipEra | null)[] = [...MIP_ERAS, null];
  return order
    .filter((era) => buckets.has(era))
    .map((era) => ({
      era,
      values: [...(buckets.get(era) ?? []), ...references],
    }));
}
