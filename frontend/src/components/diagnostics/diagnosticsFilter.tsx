import { Filter, Search, X } from "lucide-react";
import { type ReactNode, useMemo } from "react";
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
import type { CatalogDiagnostic } from "@/lib/diagnosticCatalog";
import {
  type DiagnosticFilterState,
  diagnosticFilterOptions,
  hasActiveFilters,
  hasSelections,
  NO_DIAGNOSTIC_FILTERS,
} from "@/lib/diagnosticFilters";

interface CheckboxFilterPopoverProps {
  label: string;
  title: string;
  /** Prefix of the checkbox ids, which must be unique on the page */
  idPrefix: string;
  options: { value: string; label: string }[];
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

const METRIC_VALUE_OPTIONS = [
  { value: "true", label: "Has metric values" },
  { value: "false", label: "No metric values" },
];

interface DiagnosticsFilterProps {
  /** The diagnostics to offer filter options from */
  diagnostics: CatalogDiagnostic[];
  value: DiagnosticFilterState;
  onChange: (value: DiagnosticFilterState) => void;
}

export function DiagnosticsFilter({
  diagnostics,
  value,
  onChange,
}: DiagnosticsFilterProps) {
  const options = useMemo(
    () => diagnosticFilterOptions(diagnostics),
    [diagnostics],
  );
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
          options={options.providers.map((p) => ({ value: p, label: p }))}
          selected={value.providers}
          onToggle={toggleProvider}
        />

        {options.aftLinks.length > 0 && (
          <CheckboxFilterPopover
            label="CMIP7 AFT Diagnostics"
            title="Filter by AFT Diagnostics"
            idPrefix="aft"
            options={options.aftLinks.map((aft) => ({
              value: aft.id,
              label: `${aft.id} - ${aft.name}`,
            }))}
            selected={value.aftIds}
            onToggle={toggleAftId}
            className="w-120"
          />
        )}

        {options.themes.length > 0 && (
          <CheckboxFilterPopover
            label="Themes"
            title="Filter by Themes"
            idPrefix="theme"
            options={options.themes.map((t) => ({ value: t, label: t }))}
            selected={value.themes}
            onToggle={toggleTheme}
          />
        )}

        <CheckboxFilterPopover
          label="Metric Values"
          title="Filter by Metric Values"
          idPrefix="metric-values"
          options={METRIC_VALUE_OPTIONS}
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
            const aft = options.aftLinks.find((a) => a.id === aftId);
            return (
              <ActiveFilterBadge
                key={`aft-${aftId}`}
                onRemove={() => toggleAftId(aftId)}
              >
                CMIP7 AFT: {aftId}
                {aft ? ` - ${aft.name}` : ""}
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
