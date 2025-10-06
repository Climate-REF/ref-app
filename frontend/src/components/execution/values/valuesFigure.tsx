import { Download } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  EmptyEnsembleChart,
  EnsembleChart,
} from "@/components/diagnostics/ensembleChart";
import type { Facet, ScalarValue } from "@/components/execution/values/types";
import type { ChartGroupingConfig } from "@/components/explorer/grouping";
import {
  extractAvailableDimensions,
  GroupingControls,
  initializeGroupingConfig,
} from "@/components/explorer/grouping";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox";

interface ValuesFigureProps {
  values: ScalarValue[];
  facets: Facet[];
  defaultGroupby: string;
  loading?: boolean; // Add loading as an optional prop
  onGroupingChange?: (config: ChartGroupingConfig) => void;
}

const getValidDefault = (
  facets: Facet[],
  preferredDefault: string,
  fallbacks: string[] = [],
) => {
  // Check if preferred default exists in facets
  if (facets.some((f) => f.key === preferredDefault)) {
    return preferredDefault;
  }
  // Try each fallback in order
  for (const fallback of fallbacks) {
    if (facets.some((f) => f.key === fallback)) {
      return fallback;
    }
  }
  // Return first available facet or empty string if no facets
  return facets.length > 0 ? facets[0].key : "";
};

export function ValuesFigure({
  values,
  facets,
  defaultGroupby,
  loading, // Destructure loading
  onGroupingChange,
}: ValuesFigureProps) {
  // Extract available dimensions from the metric values
  const availableDimensions = useMemo(
    () => extractAvailableDimensions(values),
    [values],
  );

  // Initialize grouping configuration with defaults based on facets
  const initialGroupingConfig = useMemo(() => {
    const validDefaultGroupBy = getValidDefault(facets, defaultGroupby, [
      "statistic",
      "metric",
      "variable",
      "region",
    ]);
    const validDefaultHue = getValidDefault(facets, defaultGroupby, [
      "source_id",
      "model",
      "experiment",
    ]);

    return initializeGroupingConfig(availableDimensions, {
      groupBy: validDefaultGroupBy,
      hue: validDefaultHue,
      style: "none",
    });
  }, [availableDimensions, facets, defaultGroupby]);

  // State for grouping configuration
  const [groupingConfig, setGroupingConfig] = useState<ChartGroupingConfig>(
    initialGroupingConfig,
  );

  // State for symmetrical axes
  const [symmetricalAxes, setSymmetricalAxes] = useState(false);

  // Handle grouping configuration changes
  const handleGroupingChange = useCallback(
    (newConfig: ChartGroupingConfig) => {
      setGroupingConfig(newConfig);
      // Notify parent component of the change
      if (onGroupingChange) {
        onGroupingChange(newConfig);
      }
    },
    [onGroupingChange],
  );

  if (loading) {
    return <div className="text-center p-4">Loading chart data...</div>;
  }

  if (values.length === 0) {
    return <EmptyEnsembleChart />;
  }

  return (
    <>
      {facets.length ? (
        <div className="space-y-4">
          <GroupingControls
            config={groupingConfig}
            availableDimensions={availableDimensions}
            onChange={handleGroupingChange}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="symmetrical-axes"
                checked={symmetricalAxes}
                onCheckedChange={(checked) =>
                  setSymmetricalAxes(checked === true)
                }
              />
              <label htmlFor="symmetrical-axes" className="text-sm">
                Symmetrical Axes
              </label>
            </div>
            <Button variant={"outline"} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      ) : null}
      <EnsembleChart
        data={values}
        metricName="Values"
        metricUnits="unitless"
        groupingConfig={groupingConfig}
        showZeroLine={true}
        symmetricalAxes={symmetricalAxes}
      />
    </>
  );
}
