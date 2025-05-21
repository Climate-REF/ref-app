import type { Facet, MetricValue } from "@/client";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";

import { useValuesProcessor } from "@/hooks/useValuesProcessor";
import { BarChart, Table } from "lucide-react";
import { useState } from "react";
import { FilterControls } from "./filterControls.tsx"; // Import the new FilterControls component
import ValuesDataTable from "./valuesDataTable.tsx";
import { ValuesFigure } from "./valuesFigure.tsx";

type ValuesProps = {
  values: MetricValue[];
  facets: Facet[];
  loading: boolean;
};

type ViewType = "bar" | "table";

export function Values(props: ValuesProps) {
  const [viewType, setViewType] = useState<ViewType>("table");

  const { filters, setFilters, finalDisplayedValues, handleExcludeRows } =
    useValuesProcessor({
      initialValues: props.values,
      loading: props.loading,
    });

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-4">
          {/* Filter UI is now handled by FilterControls */}
          <FilterControls
            facets={props.facets}
            filters={filters}
            setFilters={setFilters}
          />

          <div className="flex items-center justify-end space-x-2">
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
          </div>
          {/* Content: Table or Chart */}
          {viewType === "table" && (
            <ValuesDataTable
              values={finalDisplayedValues}
              facets={props.facets}
              loading={props.loading}
              onExcludeRows={handleExcludeRows}
            />
          )}
          {viewType === "bar" && (
            <ValuesFigure
              defaultGroupby="source_id"
              defaultXAxis="statistic"
              values={finalDisplayedValues}
              facets={props.facets}
              loading={props.loading}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
