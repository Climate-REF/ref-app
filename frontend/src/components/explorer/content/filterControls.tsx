import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useDeferredValue, useMemo } from "react";
import { diagnosticsListMetricValueFacetsOptions } from "@/client/@tanstack/react-query.gen";
import type { Facet } from "@/client/types.gen";
import { useSelectedMipEra } from "@/components/charts/mipEraContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFacetedFilter } from "@/hooks/useFacetedFilter";
import { ipccRegionName } from "@/lib/ipccRegions";
import type { FilterControl } from "../types";

/** A card whose values can be narrowed by its filters and filter controls. */
export interface FilterableCard {
  provider: string;
  diagnostic: string;
  otherFilters?: Record<string, string>;
  filterControls?: FilterControl[];
}

/** A value a filter control can be set to, with the label its dropdown shows. */
interface FilterOption {
  value: string;
  label: string;
}

function optionLabel(filterKey: string, value: string): string {
  return filterKey === "region" ? ipccRegionName(value) : value;
}

/** The options of a control: its facet values without the excluded ones, sorted by label. */
export function optionsFor(
  control: FilterControl,
  facets: ReadonlyMap<string, readonly string[]>,
): FilterOption[] {
  const excludeSet = new Set(control.excludeValues ?? []);
  return (facets.get(control.filterKey) ?? [])
    .filter((v) => !excludeSet.has(v))
    .map((v) => ({ value: v, label: optionLabel(control.filterKey, v) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * The value a control filters by, from the values its options offer.
 *
 * The chosen value is used if it is one of the options, then the default value, and
 * otherwise the first option. Undefined when the control has no options.
 */
export function resolveControlValue(
  control: FilterControl,
  chosen: Record<string, string>,
  options: readonly FilterOption[],
): string | undefined {
  const values = options.map((option) => option.value);
  return (
    [chosen[control.filterKey], control.defaultValue].find(
      (v) => v !== undefined && values.includes(v),
    ) ?? values[0]
  );
}

/** The options each control offers and the value each one filters by. */
export interface ResolvedFilterControls {
  /** The options of each control, in the order of the controls */
  options: FilterOption[][];
  /** The value of each control that has options, by filter key */
  values: Record<string, string>;
}

/**
 * Resolve the controls one after another, each narrowed by the values of the ones before.
 *
 * The first control's facets are read with the card's filters only. Each later control's
 * facets are read with the values already resolved added, so it offers only values that
 * still keep results. Every option of every control therefore leads to values that exist
 * together: picking one re-resolves the controls after it.
 *
 * A control's own key is never in the filters its facets are read with, and the card's
 * other filters on a controlled key are left out, so a control lists all its values.
 */
export async function resolveFilterCascade(
  controls: readonly FilterControl[],
  chosen: Record<string, string>,
  otherFilters: Record<string, string> | undefined,
  fetchFacets: (filters: Record<string, string>) => Promise<Facet[]>,
): Promise<ResolvedFilterControls> {
  const controlledKeys = new Set(controls.map((c) => c.filterKey));
  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(otherFilters ?? {})) {
    if (!controlledKeys.has(key)) {
      filters[key] = value;
    }
  }

  const options: FilterOption[][] = [];
  const values: Record<string, string> = {};
  for (const control of controls) {
    const controlOptions = optionsFor(
      control,
      facetMapOf(await fetchFacets({ ...filters })),
    );
    options.push(controlOptions);
    const value = resolveControlValue(control, chosen, controlOptions);
    if (value !== undefined) {
      values[control.filterKey] = value;
      filters[control.filterKey] = value;
    }
  }
  return { options, values };
}

function facetMapOf(
  facets: Facet[] | undefined,
): Map<string, readonly string[]> {
  const map = new Map<string, readonly string[]>();
  for (const facet of facets ?? []) {
    map.set(facet.key, facet.values);
  }
  return map;
}

/**
 * The filters stored in the URL under a namespace derived from `parts`.
 *
 * Lowercase, with every run of characters that are not alphanumerics replaced by one dash,
 * so the namespace is safe to use as a search param prefix.
 */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The search namespace of one card content item, built from its labels. */
export function cardSearchNamespace(...parts: Array<string | number>): string {
  const stem = parts
    .map((part) => slugify(String(part)))
    .filter((part) => part !== "")
    .join("-");
  return stem === "" ? "card" : `card-${stem}`;
}

/** The namespaces made unique on a page by numbering later duplicates. */
export function uniqueSearchNamespaces(
  namespaces: readonly string[],
): string[] {
  const used = new Set<string>();
  return namespaces.map((namespace) => {
    let candidate = namespace;
    let suffix = 2;
    while (used.has(candidate)) {
      candidate = `${namespace}-${suffix}`;
      suffix += 1;
    }
    used.add(candidate);
    return candidate;
  });
}

const NO_FILTER_CONTROLS: ResolvedFilterControls = { options: [], values: {} };

/**
 * The filter controls of a card and the filters they apply.
 *
 * The controls are resolved in order, each offering only the values that keep results
 * given the card's other filters and the controls before it (see `resolveFilterCascade`),
 * so a card with one control reads its facets once. Choices are stored in the URL under
 * `searchNamespace`. Suspends until the facets are in; after a choice the card keeps
 * showing the current values while the next ones load.
 */
export function useFilterControls(
  { provider, diagnostic, otherFilters, filterControls }: FilterableCard,
  valueType: "scalar" | "series",
  searchNamespace: string,
) {
  const selectedMipEra = useSelectedMipEra();
  const queryClient = useQueryClient();
  const { filter, updateFilter } = useFacetedFilter(searchNamespace);

  const controls = filterControls ?? [];
  const hasFilterControls = controls.length > 0;

  // A control writes one value under its key; its own key is read back from the URL.
  const chosen: Record<string, string> = {};
  for (const control of controls) {
    const value = filter.selections[control.filterKey]?.[0];
    if (value !== undefined) {
      chosen[control.filterKey] = value;
    }
  }

  // The choices that reach the queries are deferred, so a new choice renders in the
  // background: if its facets or values are not loaded yet, the card keeps showing the
  // current ones instead of falling back to its skeleton. Compared as text, so the same
  // choices rebuilt on a render are not a change.
  const chosenKey = JSON.stringify(chosen);
  const deferredChosenKey = useDeferredValue(chosenKey);
  const deferredChosen = useMemo(
    () => JSON.parse(deferredChosenKey) as Record<string, string>,
    [deferredChosenKey],
  );
  const isPending = chosenKey !== deferredChosenKey;

  const { data: resolved } = useSuspenseQuery({
    queryKey: [
      "explorerFilterControls",
      {
        provider,
        diagnostic,
        valueType,
        mipEra: selectedMipEra,
        otherFilters,
        controls,
        chosen: deferredChosen,
      },
    ],
    // A card without controls has nothing to resolve, so it does not suspend for it.
    initialData: hasFilterControls ? undefined : NO_FILTER_CONTROLS,
    // Each facet read is its own cached query, so a later choice reuses the facets of the
    // controls before it.
    queryFn: () =>
      resolveFilterCascade(controls, deferredChosen, otherFilters, (filters) =>
        queryClient.ensureQueryData(
          diagnosticsListMetricValueFacetsOptions({
            path: { provider_slug: provider, diagnostic_slug: diagnostic },
            query: {
              ...filters,
              value_type: valueType,
              mip_era: selectedMipEra ?? undefined,
            },
          }),
        ),
      ),
  });
  const filterValues = resolved.values;

  const filterBar = hasFilterControls ? (
    <FilterControlBar
      controls={controls}
      // While a choice loads, its dropdown shows it rather than the value still applied.
      filterValues={isPending ? { ...filterValues, ...chosen } : filterValues}
      options={resolved.options}
      isPending={isPending}
      onFilterChange={(key, value) =>
        updateFilter({
          selections: { ...filter.selections, [key]: value ? [value] : [] },
        })
      }
    />
  ) : null;

  return {
    filterBar,
    queryFilters: { ...(otherFilters ?? {}), ...filterValues },
  };
}

interface FilterControlBarProps {
  controls: FilterControl[];
  filterValues: Record<string, string>;
  options: FilterOption[][];
  /** Whether a choice is still loading */
  isPending: boolean;
  onFilterChange: (key: string, value: string) => void;
}

function FilterControlBar({
  controls,
  filterValues,
  options,
  isPending,
  onFilterChange,
}: FilterControlBarProps) {
  return (
    <div
      className="flex items-center gap-3 transition-opacity data-[pending=true]:opacity-60"
      data-pending={isPending}
      aria-busy={isPending}
    >
      {controls.map((control, index) => {
        const controlOptions = options[index] ?? [];

        return (
          <div key={control.filterKey} className="flex items-center gap-2">
            {control.label && (
              <span className="text-sm text-muted-foreground">
                {control.label}:
              </span>
            )}
            <Select
              value={filterValues[control.filterKey] ?? ""}
              onValueChange={(value) =>
                onFilterChange(control.filterKey, value)
              }
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {controlOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
