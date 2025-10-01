import { Filter, Search, X } from "lucide-react";
import { useState } from "react";
import type { DiagnosticSummary } from "@/client/types.gen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DiagnosticsFilterProps {
  diagnostics: DiagnosticSummary[];
  onFilterChange: (filteredDiagnostics: DiagnosticSummary[]) => void;
}

export function DiagnosticsFilter({
  diagnostics,
  onFilterChange,
}: DiagnosticsFilterProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedAftIds, setSelectedAftIds] = useState<string[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [showWithMetricValues, setShowWithMetricValues] = useState<
    boolean | null
  >(null);

  // Extract unique providers from diagnostics
  const allProviders = Array.from(
    new Set(diagnostics.map((d) => d.provider.slug)),
  ).sort();

  // Extract unique AFT diagnostics from diagnostics
  const allAftIds = Array.from(
    new Map(
      diagnostics
        .filter((d) => d.aft_link)
        .map((d) => [
          d.aft_link!.id,
          { id: d.aft_link!.id, name: d.aft_link!.name },
        ]),
    ).values(),
  ).sort((a, b) => a.id.localeCompare(b.id));

  // Extract unique themes from diagnostics
  const allThemes = Array.from(
    new Set(
      diagnostics
        .filter((d) => d.aft_link?.theme)
        .map((d) => d.aft_link!.theme!),
    ),
  ).sort();

  // Apply filters
  const applyFilters = (
    search: string,
    providers: string[],
    aftIds: string[],
    themes: string[],
    metricValuesFilter: boolean | null,
  ) => {
    let filtered = diagnostics;

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (diagnostic) =>
          diagnostic.name.toLowerCase().includes(searchLower) ||
          diagnostic.description?.toLowerCase().includes(searchLower) ||
          diagnostic.provider.name.toLowerCase().includes(searchLower) ||
          diagnostic.provider.slug.toLowerCase().includes(searchLower),
      );
    }

    // Provider filter
    if (providers.length > 0) {
      filtered = filtered.filter((diagnostic) =>
        providers.includes(diagnostic.provider.slug),
      );
    }

    // AFT ID filter
    if (aftIds.length > 0) {
      filtered = filtered.filter(
        (diagnostic) =>
          diagnostic.aft_link && aftIds.includes(diagnostic.aft_link.id),
      );
    }

    // Theme filter
    if (themes.length > 0) {
      filtered = filtered.filter(
        (diagnostic) =>
          diagnostic.aft_link?.theme &&
          themes.includes(diagnostic.aft_link.theme),
      );
    }

    // Metric values filter
    if (metricValuesFilter !== null) {
      filtered = filtered.filter(
        (diagnostic) => diagnostic.has_metric_values === metricValuesFilter,
      );
    }

    onFilterChange(filtered);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    applyFilters(
      value,
      selectedProviders,
      selectedAftIds,
      selectedThemes,
      showWithMetricValues,
    );
  };

  const handleProviderToggle = (provider: string) => {
    const newProviders = selectedProviders.includes(provider)
      ? selectedProviders.filter((p) => p !== provider)
      : [...selectedProviders, provider];
    setSelectedProviders(newProviders);
    applyFilters(
      searchTerm,
      newProviders,
      selectedAftIds,
      selectedThemes,
      showWithMetricValues,
    );
  };

  const handleAftIdToggle = (aftId: string) => {
    const newAftIds = selectedAftIds.includes(aftId)
      ? selectedAftIds.filter((id) => id !== aftId)
      : [...selectedAftIds, aftId];
    setSelectedAftIds(newAftIds);
    applyFilters(
      searchTerm,
      selectedProviders,
      newAftIds,
      selectedThemes,
      showWithMetricValues,
    );
  };

  const handleThemeToggle = (theme: string) => {
    const newThemes = selectedThemes.includes(theme)
      ? selectedThemes.filter((t) => t !== theme)
      : [...selectedThemes, theme];
    setSelectedThemes(newThemes);
    applyFilters(
      searchTerm,
      selectedProviders,
      selectedAftIds,
      newThemes,
      showWithMetricValues,
    );
  };

  const handleMetricValuesFilter = (value: boolean | null) => {
    setShowWithMetricValues(value);
    applyFilters(
      searchTerm,
      selectedProviders,
      selectedAftIds,
      selectedThemes,
      value,
    );
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedProviders([]);
    setSelectedAftIds([]);
    setSelectedThemes([]);
    setShowWithMetricValues(null);
    onFilterChange(diagnostics);
  };

  const hasActiveFilters =
    searchTerm ||
    selectedProviders.length > 0 ||
    selectedAftIds.length > 0 ||
    selectedThemes.length > 0 ||
    showWithMetricValues !== null;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search diagnostics by name, description, or provider..."
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Providers
              {selectedProviders.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedProviders.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-medium">Filter by Providers</h4>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {allProviders.map((provider) => (
                  <div key={provider} className="flex items-center space-x-2">
                    <Checkbox
                      id={`provider-${provider}`}
                      checked={selectedProviders.includes(provider)}
                      onCheckedChange={() => handleProviderToggle(provider)}
                    />
                    <Label htmlFor={`provider-${provider}`} className="text-sm">
                      {provider}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {allAftIds.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                CMIP7 AFT Diagnostics
                {selectedAftIds.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedAftIds.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-120">
              <div className="space-y-2">
                <h4 className="font-medium">Filter by AFT Diagnostics</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {allAftIds.map((aft) => (
                    <div key={aft.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`aft-${aft.id}`}
                        checked={selectedAftIds.includes(aft.id)}
                        onCheckedChange={() => handleAftIdToggle(aft.id)}
                      />
                      <Label htmlFor={`aft-${aft.id}`} className="text-sm">
                        {aft.id} - {aft.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {allThemes.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Themes
                {selectedThemes.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedThemes.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-2">
                <h4 className="font-medium">Filter by Themes</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {allThemes.map((theme) => (
                    <div key={theme} className="flex items-center space-x-2">
                      <Checkbox
                        id={`theme-${theme}`}
                        checked={selectedThemes.includes(theme)}
                        onCheckedChange={() => handleThemeToggle(theme)}
                      />
                      <Label htmlFor={`theme-${theme}`} className="text-sm">
                        {theme}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Metric Values
              {showWithMetricValues !== null && (
                <Badge variant="secondary" className="ml-2">
                  1
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60">
            <div className="space-y-2">
              <h4 className="font-medium">Filter by Metric Values</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has-values"
                    checked={showWithMetricValues === true}
                    onCheckedChange={() =>
                      handleMetricValuesFilter(
                        showWithMetricValues === true ? null : true,
                      )
                    }
                  />
                  <Label htmlFor="has-values" className="text-sm">
                    Has metric values
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="no-values"
                    checked={showWithMetricValues === false}
                    onCheckedChange={() =>
                      handleMetricValuesFilter(
                        showWithMetricValues === false ? null : false,
                      )
                    }
                  />
                  <Label htmlFor="no-values" className="text-sm">
                    No metric values
                  </Label>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {(selectedProviders.length > 0 ||
        selectedAftIds.length > 0 ||
        selectedThemes.length > 0 ||
        showWithMetricValues !== null) && (
        <div className="flex flex-wrap gap-2">
          {selectedProviders.map((provider) => (
            <Badge
              key={`provider-${provider}`}
              variant="secondary"
              className="cursor-pointer"
            >
              Provider: {provider}
              <X
                className="h-3 w-3 ml-1"
                onClick={() => handleProviderToggle(provider)}
              />
            </Badge>
          ))}
          {selectedAftIds.map((aftId) => {
            const aft = allAftIds.find((a) => a.id === aftId);
            return (
              <Badge
                key={`aft-${aftId}`}
                variant="secondary"
                className="cursor-pointer"
              >
                CMIP7 AFT: {aftId}
                {aft ? ` - ${aft.name}` : ""}
                <X
                  className="h-3 w-3 ml-1"
                  onClick={() => handleAftIdToggle(aftId)}
                />
              </Badge>
            );
          })}
          {selectedThemes.map((theme) => (
            <Badge
              key={`theme-${theme}`}
              variant="secondary"
              className="cursor-pointer"
            >
              Theme: {theme}
              <X
                className="h-3 w-3 ml-1"
                onClick={() => handleThemeToggle(theme)}
              />
            </Badge>
          ))}
          {showWithMetricValues !== null && (
            <Badge variant="secondary" className="cursor-pointer">
              {showWithMetricValues ? "Has values" : "No values"}
              <X
                className="h-3 w-3 ml-1"
                onClick={() => handleMetricValuesFilter(null)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
