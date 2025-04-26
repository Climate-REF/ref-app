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

type ViewType = "bar" | "table";

function getInner(viewType: ViewType, props: ValuesProps) {
  switch (viewType) {
    case "table":
      return <ValuesDataTable {...props} />;
    case "bar":
      return <ValuesFigure {...props} />;
  }
}

export function Values(props: ValuesProps) {
  const [viewType, setViewType] = useState<ViewType>("table");

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
          {getInner(viewType, props)}
        </div>
      </CardContent>
    </Card>
  );
}
