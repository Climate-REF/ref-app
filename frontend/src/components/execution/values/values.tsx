import { BarChart, Download, Table } from "lucide-react";
import * as React from "react";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useValuesProcessor, type Filter } from "@/hooks/useValuesProcessor";
import { FilterControls } from "./filterControls.tsx"; // Import the new FilterControls component
import type { Facet, MetricValue } from "./types";
import ValuesDataTable from "./valuesDataTable.tsx";

const ValuesFigure = React.lazy(() =>
  import("./valuesFigure.tsx").then((module) => ({
    default: module.ValuesFigure,
  })),
);

type ValuesProps = {
  values: MetricValue[];
  facets: Facet[];
  loading: boolean;
  onDownload?: () => void;
  initialFilters?: Filter[];
  onFiltersChange?: (filters: Filter[]) => void;
};

type ViewType = "bar" | "table";

export function Values(props: ValuesProps) {
  const [viewType, setViewType] = useState<ViewType>("table");

  const {
    filters,
    setFilters,
    finalDisplayedValues,
    setRowSelection,
    rowSelection,
    excludedRowIds,
    setExcludedRowIds,
  } = useValuesProcessor({
    initialValues: props.values,
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
              onClick={() => setViewType("bar")}
            >
              <BarChart className="h-4 w-4 mr-2" />
              Chart
            </Button>
            <Button
              variant={viewType === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewType("table")}
            >
              <Table className="h-4 w-4 mr-2" />
              Table
            </Button>
            {viewType === "table" && props.onDownload && (
              <Button variant="outline" size="sm" onClick={props.onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
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
                defaultXAxis="statistic"
                values={finalDisplayedValues}
                facets={props.facets}
                loading={props.loading}
              />
            </Suspense>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
