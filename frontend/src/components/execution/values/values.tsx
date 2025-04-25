import type { Facet, MetricValue } from "@/client";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { BarChart, Table } from "lucide-react";
import { useState } from "react";
import ValuesDataTable from "./valuesDataTable.tsx";
import { ValuesFigure } from "./valuesFigure.tsx";

type ValuesProps = {
  values: MetricValue[];
  facets: Facet[];
  loading: boolean;
};

export function Values({ values, facets, loading }: ValuesProps) {
  const [viewType, setViewType] = useState<"bar" | "table">("table");

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-end space-x-2">
            <Button
              variant={viewType === "bar" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewType("bar")}
            >
              <BarChart className="h-4 w-4 mr-2" />
              Bar Chart
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
          {viewType === "table" ? (
            <ValuesDataTable
              facets={facets}
              values={values}
              isLoading={loading}
            />
          ) : (
            <ValuesFigure values={values} facets={facets} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
