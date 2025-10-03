import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  type Filter,
  type ProcessedMetricValue,
  type ProcessedSeriesValue,
  useValuesProcessor,
} from "@/hooks/useValuesProcessor";
import { FilterControls } from "./filterControls.tsx";
import ScalarDataTable from "./scalarDataTable.tsx";
import SeriesDataTable from "./seriesDataTable.tsx";
import type { Facet, MetricValue, SeriesValue } from "./types";
import { isScalarValue, isSeriesValue } from "./types";

type ValuesProps = {
  values: (MetricValue | SeriesValue)[];
  facets: Facet[];
  loading: boolean;
  onDownload?: () => void;
  initialFilters?: Filter[];
  onFiltersChange?: (filters: Filter[]) => void;
  // Callback to expose current grouping configuration
  onCurrentGroupingChange?: (config: {
    groupBy?: string;
    hue?: string;
    style?: string;
  }) => void;
  // Callback to expose filtered data
  onFilteredDataChange?: (filteredData: (MetricValue | SeriesValue)[]) => void;
  // Outlier detection parameters
  hadOutliers?: boolean;
  outlierCount?: number;
  initialDetectOutliers?: "off" | "iqr";
  onDetectOutliersChange?: (value: "off" | "iqr") => void;
  initialIncludeUnverified?: boolean;
  onIncludeUnverifiedChange?: (value: boolean) => void;
  valueType: ViewType;
};

type ViewType = "scalars" | "series";

export function Values({ valueType, ...props }: ValuesProps) {
  const [detectOutliers, setDetectOutliers] = useState<"off" | "iqr">(
    props.initialDetectOutliers || "iqr",
  );
  const [includeUnverified, setIncludeUnverified] = useState<boolean>(
    props.initialIncludeUnverified || false,
  );

  // Separate scalar and series values with correct typing
  const filteredValues = useMemo(
    () =>
      props.values.filter(
        valueType === "scalars" ? isScalarValue : isSeriesValue,
      ),
    [props.values, valueType],
  );
  type Value = MetricValue | SeriesValue;

  const {
    filters,
    setFilters,
    finalDisplayedValues,
    setRowSelection,
    rowSelection,
    excludedRowIds,
    setExcludedRowIds,
  } = useValuesProcessor<Value>({
    initialValues: filteredValues,
    loading: props.loading,
    initialFilters: props.initialFilters,
    onFiltersChange: props.onFiltersChange,
  });

  // Notify parent component when filtered data changes
  useEffect(() => {
    if (props.onFilteredDataChange) {
      props.onFilteredDataChange(finalDisplayedValues);
    }
  }, [finalDisplayedValues, props.onFilteredDataChange]);

  // Handle outlier control changes
  const handleDetectOutliersChange = (value: "off" | "iqr") => {
    setDetectOutliers(value);
    if (props.onDetectOutliersChange) {
      props.onDetectOutliersChange(value);
    }
  };

  const handleIncludeUnverifiedChange = (value: boolean) => {
    setIncludeUnverified(value);
    if (props.onIncludeUnverifiedChange) {
      props.onIncludeUnverifiedChange(value);
    }
  };

  // Outlier banner
  const showBanner = detectOutliers !== "off" && props.hadOutliers;
  const bannerText = includeUnverified
    ? `Showing unverified values (${props.outlierCount ?? 0} outliers)`
    : `Outliers detected (${props.outlierCount ?? 0} filtered values)`;

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Outlier Banner */}
          {showBanner && (
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {bannerText}
              </p>
            </div>
          )}
          {/* Outlier Controls */}
          <div className="flex items-center space-x-2">
            <Button
              variant={includeUnverified ? "default" : "outline"}
              size="sm"
              onClick={() => handleIncludeUnverifiedChange(!includeUnverified)}
            >
              {includeUnverified ? "Hide unverified" : "Show unverified"}
            </Button>
            <div className="flex items-center space-x-1">
              <span className="text-sm">Detection:</span>
              <Button
                variant={detectOutliers === "iqr" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDetectOutliersChange("iqr")}
              >
                IQR
              </Button>
              <Button
                variant={detectOutliers === "off" ? "default" : "outline"}
                size="sm"
                onClick={() => handleDetectOutliersChange("off")}
              >
                Off
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-end space-x-2">
            <div className="grow">
              <FilterControls
                facets={props.facets}
                filters={filters}
                setFilters={setFilters}
                rowSelection={rowSelection}
                excludedRowIds={excludedRowIds}
                setExcludedRowIds={setExcludedRowIds}
              />
            </div>
            <Button variant="outline" size="sm" onClick={props.onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>

          {valueType === "scalars" ? (
            <ScalarDataTable
              values={finalDisplayedValues as ProcessedMetricValue[]}
              facets={props.facets}
              loading={props.loading}
              rowSelection={rowSelection}
              setRowSelection={setRowSelection}
            />
          ) : (
            <SeriesDataTable
              values={finalDisplayedValues as ProcessedSeriesValue[]}
              facets={props.facets}
              loading={props.loading}
              rowSelection={rowSelection}
              setRowSelection={setRowSelection}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
