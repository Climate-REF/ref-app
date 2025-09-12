import { BarChart, Table, TrendingUp } from "lucide-react";
import * as React from "react";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { type Filter, useValuesProcessor } from "@/hooks/useValuesProcessor";
import { FilterControls } from "./filterControls.tsx"; // Import the new FilterControls component
import { SeriesVisualization } from "./series/seriesVisualization.tsx";
import type { Facet, MetricValue, SeriesValue } from "./types";
import { isScalarValue, isSeriesValue } from "./types";
import ValuesDataTable from "./valuesDataTable.tsx";

const ValuesFigure = React.lazy(() =>
  import("./valuesFigure.tsx").then((module) => ({
    default: module.ValuesFigure,
  })),
);

type ValuesProps = {
  values: (MetricValue | SeriesValue)[];
  facets: Facet[];
  loading: boolean;
  onDownload?: () => void;
  initialFilters?: Filter[];
  onFiltersChange?: (filters: Filter[]) => void;
  // View type and series visualization URL parameters
  initialViewType?: ViewType;
  onViewTypeChange?: (viewType: ViewType) => void;
  seriesParams?: {
    groupBy?: string;
    hue?: string;
    style?: string;
  };
  onSeriesParamsChange?: (params: {
    groupBy?: string;
    hue?: string;
    style?: string;
  }) => void;
  // Callback to expose current grouping configuration
  onCurrentGroupingChange?: (config: {
    groupBy?: string;
    hue?: string;
    style?: string;
  }) => void;
};

type ViewType = "bar" | "table" | "series";

export function Values(props: ValuesProps) {
  const [viewType, setViewType] = useState<ViewType>(
    props.initialViewType || "table",
  );

  // Handle view type changes and sync with URL
  const handleViewTypeChange = (newViewType: ViewType) => {
    console.log("handleViewTypeChange called with:", newViewType);
    console.log("onViewTypeChange callback exists:", !!props.onViewTypeChange);
    setViewType(newViewType);
    if (props.onViewTypeChange) {
      props.onViewTypeChange(newViewType);
    }
  };

  // Separate scalar and series values
  const scalarValues = props.values.filter(isScalarValue);
  const seriesValues = props.values.filter(isSeriesValue);
  const hasSeriesData = seriesValues.length > 0;

  const {
    filters,
    setFilters,
    finalDisplayedValues,
    setRowSelection,
    rowSelection,
    excludedRowIds,
    setExcludedRowIds,
  } = useValuesProcessor({
    initialValues: scalarValues, // Only pass scalar values to the processor for now
    loading: props.loading,
    initialFilters: props.initialFilters,
    onFiltersChange: props.onFiltersChange,
  });

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-end space-x-2">
            <div className="grow">
              <FilterControls
                values={finalDisplayedValues}
                facets={props.facets}
                filters={filters}
                setFilters={setFilters}
                rowSelection={rowSelection}
                excludedRowIds={excludedRowIds}
                setExcludedRowIds={setExcludedRowIds}
              />
            </div>
            <Button
              variant={viewType === "bar" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                console.log("Bar button clicked");
                handleViewTypeChange("bar");
              }}
            >
              <BarChart className="h-4 w-4 mr-2" />
              Chart
            </Button>
            <Button
              variant={viewType === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                console.log("Table button clicked");
                handleViewTypeChange("table");
              }}
            >
              <Table className="h-4 w-4 mr-2" />
              Table
            </Button>
            {hasSeriesData && (
              <Button
                variant={viewType === "series" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  console.log("Series button clicked");
                  handleViewTypeChange("series");
                }}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Series
              </Button>
            )}
          </div>
          {/* Content: Table or Chart */}
          {viewType === "table" && (
            <ValuesDataTable
              values={finalDisplayedValues}
              facets={props.facets}
              loading={props.loading}
              rowSelection={rowSelection}
              setRowSelection={setRowSelection}
              onDownload={props.onDownload}
            />
          )}
          {viewType === "bar" && (
            <Suspense
              fallback={
                <Skeleton className="w-full h-[500px] rounded-md border" />
              }
            >
              <ValuesFigure
                defaultGroupby="source_id"
                values={finalDisplayedValues}
                facets={props.facets}
                loading={props.loading}
                onGroupingChange={props.onCurrentGroupingChange}
              />
            </Suspense>
          )}
          {viewType === "series" && hasSeriesData && (
            <SeriesVisualization
              seriesValues={seriesValues}
              initialGroupBy={props.seriesParams?.groupBy}
              initialHue={props.seriesParams?.hue}
              initialStyle={props.seriesParams?.style}
              onParamsChange={props.onSeriesParamsChange}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
