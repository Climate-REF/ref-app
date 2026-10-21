import { useSuspenseQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen";
import { useSelectedMipEra } from "@/components/charts/mipEraContext";
import type { MetricValueCollection } from "@/components/execution/values/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  facets: Map<string, string[]>,
): FilterOption[] {
  const excludeSet = new Set(control.excludeValues ?? []);
  return (facets.get(control.filterKey) ?? [])
    .filter((v) => !excludeSet.has(v))
    .map((v) => ({ value: v, label: optionLabel(control.filterKey, v) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * The value each control filters by
 *
 * The chosen value is used if it is one of the control's options, then the default value,
 * and otherwise the first option. A control with no options is left out.
 */
export function resolveFilterValues(
  controls: FilterControl[],
  chosen: Record<string, string>,
  facets: Map<string, string[]>,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const control of controls) {
    const options = optionsFor(control, facets).map((o) => o.value);
    const value = [chosen[control.filterKey], control.defaultValue].find(
      (v) => v !== undefined && options.includes(v),
    );
    if (value !== undefined || options.length > 0) {
      values[control.filterKey] = value ?? options[0];
    }
  }
  return values;
}

/**
 * Facets are fetched without the controlled keys so every dropdown lists all its options.
 * They are fetched before the values, so the values are only queried once a control is set.
 */
export function useFilterControls(
  { provider, diagnostic, otherFilters, filterControls }: FilterableCard,
  valueType: "scalar" | "series",
) {
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const selectedMipEra = useSelectedMipEra();

  const controls = filterControls ?? [];
  const hasFilterControls = controls.length > 0;

  const controlledKeys = new Set(controls.map((c) => c.filterKey));
  const facetQueryFilters: Record<string, string> = {};
  for (const [key, value] of Object.entries(otherFilters ?? {})) {
    if (!controlledKeys.has(key)) {
      facetQueryFilters[key] = value;
    }
  }

  const facetQuery = diagnosticsListMetricValuesOptions({
    path: { provider_slug: provider, diagnostic_slug: diagnostic },
    query: {
      ...facetQueryFilters,
      value_type: valueType,
      limit: 1,
      mip_era: selectedMipEra ?? undefined,
    },
  });
  // Suspends until the facets are in, and fetches nothing for a card without controls.
  const [facetResult] = useSuspenseQueries({
    queries: hasFilterControls ? [facetQuery] : ([] as (typeof facetQuery)[]),
  });
  const facetData = facetResult?.data;

  const facetMap = useMemo(() => {
    const map = new Map<string, string[]>();
    const facets = (facetData as MetricValueCollection | undefined)?.facets;
    for (const facet of facets ?? []) {
      map.set(facet.key, facet.values);
    }
    return map;
  }, [facetData]);

  const filterValues = resolveFilterValues(controls, chosen, facetMap);

  const filterBar = hasFilterControls ? (
    <FilterControlBar
      controls={controls}
      filterValues={filterValues}
      facetMap={facetMap}
      onFilterChange={(key, value) =>
        setChosen((prev) => ({ ...prev, [key]: value }))
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
  facetMap: Map<string, string[]>;
  onFilterChange: (key: string, value: string) => void;
}

function FilterControlBar({
  controls,
  filterValues,
  facetMap,
  onFilterChange,
}: FilterControlBarProps) {
  return (
    <div className="flex items-center gap-3">
      {controls.map((control) => {
        const options = optionsFor(control, facetMap);

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
                {options.map((option) => (
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
