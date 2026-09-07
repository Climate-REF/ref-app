import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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

interface UseFilterControlsArgs {
  provider: string;
  diagnostic: string;
  otherFilters: Record<string, string> | undefined;
  filterControls: FilterControl[] | undefined;
  valueType: "scalar" | "series";
}

function buildInitialFilterValues(
  filterControls: FilterControl[] | undefined,
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const control of filterControls ?? []) {
    if (control.defaultValue) {
      values[control.filterKey] = control.defaultValue;
    }
  }
  return values;
}

/**
 * Manage the user-facing filter dropdowns for a card.
 * Facets are fetched without the controlled keys so every dropdown lists all its options,
 * and any control without a value is set to the first option it can use.
 */
export function useFilterControls({
  provider,
  diagnostic,
  otherFilters,
  filterControls,
  valueType,
}: UseFilterControlsArgs) {
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() =>
    buildInitialFilterValues(filterControls),
  );
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

  const { data: facetData } = useQuery({
    ...diagnosticsListMetricValuesOptions({
      path: { provider_slug: provider, diagnostic_slug: diagnostic },
      query: {
        ...facetQueryFilters,
        value_type: valueType,
        limit: 1,
        mip_era: selectedMipEra ?? undefined,
      },
    }),
    enabled: hasFilterControls,
  });

  const facetMap = useMemo(() => {
    const map = new Map<string, string[]>();
    const facets = (facetData as MetricValueCollection | undefined)?.facets;
    for (const facet of facets ?? []) {
      map.set(facet.key, facet.values);
    }
    return map;
  }, [facetData]);

  useEffect(() => {
    if (!facetData) return;
    const updates: Record<string, string> = {};
    for (const control of filterControls ?? []) {
      if (filterValues[control.filterKey]) continue;
      const excludeSet = new Set(control.excludeValues ?? []);
      const firstValid = (facetMap.get(control.filterKey) ?? []).find(
        (v) => !excludeSet.has(v),
      );
      if (firstValid) {
        updates[control.filterKey] = firstValid;
      }
    }
    if (Object.keys(updates).length > 0) {
      setFilterValues((prev) => ({ ...prev, ...updates }));
    }
  }, [facetData, facetMap, filterControls, filterValues]);

  const setFilterValue = (key: string, value: string) =>
    setFilterValues((prev) => ({ ...prev, [key]: value }));

  return {
    hasFilterControls,
    filterValues,
    setFilterValue,
    facetMap,
    queryFilters: { ...(otherFilters ?? {}), ...filterValues },
  };
}

function optionLabel(filterKey: string, value: string): string {
  return filterKey === "region" ? ipccRegionName(value) : value;
}

interface FilterControlBarProps {
  controls: FilterControl[];
  filterValues: Record<string, string>;
  facetMap: Map<string, string[]>;
  onFilterChange: (key: string, value: string) => void;
}

export function FilterControlBar({
  controls,
  filterValues,
  facetMap,
  onFilterChange,
}: FilterControlBarProps) {
  return (
    <div className="flex items-center gap-3">
      {controls.map((control) => {
        const excludeSet = new Set(control.excludeValues ?? []);
        const options = (facetMap.get(control.filterKey) ?? [])
          .filter((v) => !excludeSet.has(v))
          .map((v) => ({ value: v, label: optionLabel(control.filterKey, v) }))
          .sort((a, b) => a.label.localeCompare(b.label));

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
