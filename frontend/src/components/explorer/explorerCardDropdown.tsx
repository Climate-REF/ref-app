import { useNavigate } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import type {
  BoxWhiskerChartContent,
  SeriesChartContent,
} from "@/components/explorer/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { chartValuesSearch, downloadChartValues } from "./chartValues";
import type { MetricValuesQuery } from "./content/useExplorerMetricValues";

interface ExplorerCardDropdownProps {
  contentItem: BoxWhiskerChartContent | SeriesChartContent;
  /** The query of the values the chart shows, so the menu acts on the same values */
  query: MetricValuesQuery;
}

export function ExplorerCardDropdown({
  contentItem,
  query,
}: ExplorerCardDropdownProps) {
  const navigate = useNavigate();
  const uri = contentItem.type === "box-whisker-chart" ? "scalars" : "series";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-xs">
        <DropdownMenuItem
          onClick={() =>
            navigate({
              to: `/diagnostics/${contentItem.provider}/${contentItem.diagnostic}/${uri}`,
              search: chartValuesSearch(query),
            })
          }
        >
          View chart values
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            downloadChartValues(contentItem, query).catch((err) => {
              console.error("Download failed:", err);
              alert("Failed to download data. Please try again.");
            })
          }
        >
          Download values (CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
