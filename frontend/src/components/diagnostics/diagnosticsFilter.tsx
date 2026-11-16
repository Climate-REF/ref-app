import { Filter, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { DebouncedInput } from "@/components/app/debouncedInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  type DiagnosticFilterOptions,
  type DiagnosticFilterState,
  hasActiveFilters,
  hasSelections,
  NO_DIAGNOSTIC_FILTERS,
} from "@/lib/diagnosticFilters";
import {
  type FacetOption,
  withUnavailableSelections,
} from "@/lib/facetedFilter";

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface CheckboxFilterPopoverProps {
  label: string;
  title: string;
  /** Prefix of the checkbox ids, which must be unique on the page */
  idPrefix: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  className?: string;
}

/** A button opening a list of checkboxes, showing how many are checked. */
function CheckboxFilterPopover({
  label,
  title,
  idPrefix,
  options,
  selected,
  onToggle,
  className = "w-80",
}: CheckboxFilterPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={className}>
        <div className="space-y-2">
          <h4 className="font-medium">{title}</h4>
          <div className="max-h-60 overflow-y-auto space-y-2">
            {options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${idPrefix}-${option.value}`}
                  checked={selected.includes(option.value)}
                  onCheckedChange={() => onToggle(option.value)}
                />
                <Label
                  htmlFor={`${idPrefix}-${option.value}`}
                  className="text-sm"
                >
                  {option.label}
                  <span className="ml-1 text-muted-foreground">
                    ({option.count})
                  </span>
                </Label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ActiveFilterBadge({
  children,
  onRemove,
}: {
  children: ReactNode;
  onRemove: () => void;
}) {
  return (
    <Badge variant="secondary" className="cursor-pointer">
      {children}
      <X className="h-3 w-3 ml-1" onClick={onRemove} />
    </Badge>
  );
}

const toggled = (values: string[], value: string) =>
  values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value];

const METRIC_VALUE_LABELS: Record<string, string> = {
  true: "Has metric values",
  false: "No metric values",
};

/**
 * The options to show in a popover: drop unselected values no diagnostic offers, but
 * keep selected values so they can be unticked.
 */
function visibleOptions(
  options: readonly FacetOption[],
  selected: readonly string[],
): FacetOption[] {
  return withUnavailableSelections(options, selected).filter(
    (option) => option.count > 0 || selected.includes(option.value),
  );
}

interface DiagnosticsFilterProps {
  /** The filter options computed from the diagnostics matching the other filters */
  options: DiagnosticFilterOptions;
  value: DiagnosticFilterState;
  onChange: (value: DiagnosticFilterState) => void;
}

export function DiagnosticsFilter({
  options,
  value,
  onChange,
}: DiagnosticsFilterProps) {
  const providerOptions = visibleOptions(
    options.providers,
    value.providers,
  ).map((option) => ({ ...option, label: option.value }));

  const aftNames = new Map(options.aftLinks.map((aft) => [aft.id, aft.name]));
  const aftOptions = visibleOptions(
    options.aftLinks.map(({ id, count }) => ({ value: id, count })),
    value.aftIds,
  ).map((option) => {
    const name = aftNames.get(option.value);
    return {
      ...option,
      label: name ? `${option.value} - ${name}` : option.value,
    };
  });

  const themeOptions = visibleOptions(options.themes, value.themes).map(
    (option) => ({ ...option, label: option.value }),
  );

  const metricValueOptions = visibleOptions(
    options.metricValues,
    value.metricValues === null ? [] : [`${value.metricValues}`],
  ).map((option) => ({
    ...option,
    label: METRIC_VALUE_LABELS[option.value] ?? option.value,
  }));

  const update = (changes: Partial<DiagnosticFilterState>) =>
    onChange({ ...value, ...changes });
  const toggleProvider = (provider: string) =>
    update({ providers: toggled(value.providers, provider) });
  const toggleAftId = (aftId: string) =>
    update({ aftIds: toggled(value.aftIds, aftId) });
  const toggleTheme = (theme: string) =>
    update({ themes: toggled(value.themes, theme) });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <DebouncedInput
          placeholder="Search diagnostics by name, description, or provider..."
          value={value.search}
          onValueChange={(search) => update({ search })}
          className="pl-10"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <CheckboxFilterPopover
          label="Providers"
          title="Filter by Providers"
          idPrefix="provider"
          options={providerOptions}
          selected={value.providers}
          onToggle={toggleProvider}
        />

        {aftOptions.length > 0 && (
          <CheckboxFilterPopover
            label="CMIP7 AFT Diagnostics"
            title="Filter by AFT Diagnostics"
            idPrefix="aft"
            options={aftOptions}
            selected={value.aftIds}
            onToggle={toggleAftId}
            className="w-120"
          />
        )}

        {themeOptions.length > 0 && (
          <CheckboxFilterPopover
            label="Themes"
            title="Filter by Themes"
            idPrefix="theme"
            options={themeOptions}
            selected={value.themes}
            onToggle={toggleTheme}
          />
        )}

        <CheckboxFilterPopover
          label="Metric Values"
          title="Filter by Metric Values"
          idPrefix="metric-values"
          options={metricValueOptions}
          selected={
            value.metricValues === null ? [] : [`${value.metricValues}`]
          }
          // Checking one unchecks the other, and unchecking it shows all
          onToggle={(checked) =>
            update({
              metricValues:
                `${value.metricValues}` === checked ? null : checked === "true",
            })
          }
          className="w-60"
        />

        {hasActiveFilters(value) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(NO_DIAGNOSTIC_FILTERS)}
          >
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      {hasSelections(value) && (
        <div className="flex flex-wrap gap-2">
          {value.providers.map((provider) => (
            <ActiveFilterBadge
              key={`provider-${provider}`}
              onRemove={() => toggleProvider(provider)}
            >
              Provider: {provider}
            </ActiveFilterBadge>
          ))}
          {value.aftIds.map((aftId) => {
            const aftName = aftNames.get(aftId);
            return (
              <ActiveFilterBadge
                key={`aft-${aftId}`}
                onRemove={() => toggleAftId(aftId)}
              >
                CMIP7 AFT: {aftId}
                {aftName ? ` - ${aftName}` : ""}
              </ActiveFilterBadge>
            );
          })}
          {value.themes.map((theme) => (
            <ActiveFilterBadge
              key={`theme-${theme}`}
              onRemove={() => toggleTheme(theme)}
            >
              Theme: {theme}
            </ActiveFilterBadge>
          ))}
          {value.metricValues !== null && (
            <ActiveFilterBadge onRemove={() => update({ metricValues: null })}>
              {value.metricValues ? "Has values" : "No values"}
            </ActiveFilterBadge>
          )}
        </div>
      )}
    </div>
  );
}
