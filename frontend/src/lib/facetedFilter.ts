export type FacetSelections = Record<string, string[]>;

export interface FacetOption {
  value: string;
  /** How many items match the base filter, every other facet, and this value. */
  count: number;
}

export interface FacetDescriptor<T> {
  key: string;
  /** The values an item offers for this facet; empty when it offers none. */
  valuesOf: (item: T) => readonly string[];
  /**
   * Whether an item matches this facet's selection.
   * Defaults to "at least one of the selected values is in valuesOf(item)".
   * A descriptor can override this for special semantics such as tri-state values.
   */
  matches?: (item: T, selected: readonly string[]) => boolean;
}

/** The values an item offers for a descriptor, without duplicates. */
function offeredValues<T>(
  descriptor: FacetDescriptor<T>,
  item: T,
): Set<string> {
  return new Set(descriptor.valuesOf(item));
}

/** Whether an item matches a single facet's selection, where selecting nothing keeps everything. */
function matchesFacet<T>(
  item: T,
  descriptor: FacetDescriptor<T>,
  selected: readonly string[],
): boolean {
  if (selected.length === 0) {
    return true;
  }
  if (descriptor.matches) {
    return descriptor.matches(item, selected);
  }
  const values = offeredValues(descriptor, item);
  return selected.some((value) => values.has(value));
}

/** Whether an item matches every active facet; an empty selection keeps everything. */
export function matchesFacetSelections<T>(
  item: T,
  descriptors: readonly FacetDescriptor<T>[],
  selections: FacetSelections,
): boolean {
  return descriptors.every((descriptor) =>
    matchesFacet(item, descriptor, selections[descriptor.key] ?? []),
  );
}

/** A copy of selections without the given key, so a facet does not narrow its own options. */
export function withoutFacet(
  selections: FacetSelections,
  key: string,
): FacetSelections {
  const copy = { ...selections };
  delete copy[key];
  return copy;
}

/**
 * The options of every facet, each counted against the base filter and every *other*
 * active facet. Values are sorted and deduplicated.
 *
 * baseFilter is a non-facet constraint such as a text search; it applies before facets.
 * Every option offered therefore keeps at least one item (assuming the base filter and
 * the other selections are unchanged). Options of a facet are not narrowed by that
 * facet's own selection, so multi-select can add and remove values freely.
 */
export function facetOptions<T>(
  items: readonly T[],
  descriptors: readonly FacetDescriptor<T>[],
  selections: FacetSelections,
  baseFilter?: (item: T) => boolean,
): Record<string, FacetOption[]> {
  const options: Record<string, FacetOption[]> = {};
  // The base filter does not depend on the facet, so it runs once for all of them.
  const baseItems = baseFilter ? items.filter(baseFilter) : items;
  for (const descriptor of descriptors) {
    const otherSelections = withoutFacet(selections, descriptor.key);
    // Facet `descriptor` has no selection of its own, so the remaining
    // descriptors narrow the items its values are counted against.
    const candidates = baseItems.filter((item) =>
      matchesFacetSelections(item, descriptors, otherSelections),
    );

    const counts = new Map<string, number>();
    for (const item of candidates) {
      for (const value of offeredValues(descriptor, item)) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
    options[descriptor.key] = [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, count }));
  }
  return options;
}

/**
 * Merge selected values that the available options no longer contain into the options,
 * with count 0, so a selection does not silently vanish. Keeps the original order of
 * the options and appends retained values in selection order.
 */
export function withUnavailableSelections(
  options: readonly FacetOption[],
  selected: readonly string[],
): FacetOption[] {
  const available = new Set(options.map((option) => option.value));
  const retained: FacetOption[] = [];
  for (const value of selected) {
    if (
      !available.has(value) &&
      !retained.some((option) => option.value === value)
    ) {
      retained.push({ value, count: 0 });
    }
  }
  return [...options, ...retained];
}
