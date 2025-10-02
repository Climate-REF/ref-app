import { useNavigate } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import { diagnosticsListMetricValues } from "@/client/sdk.gen";
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

interface ExplorerCardDropdownProps {
  contentItem: BoxWhiskerChartContent | SeriesChartContent;
  includeUnverified?: boolean;
}

export function ExplorerCardDropdown({
  contentItem,
  includeUnverified,
}: ExplorerCardDropdownProps) {
  const navigate = useNavigate();
  const searchParams: Record<string, string> = {
    ...(contentItem?.otherFilters ?? {}),
    detect_outliers: "iqr",
    include_unverified: String(includeUnverified),
    // Disable grouping for table view
    // ...(contentItem.groupingConfig?.groupBy
    //   ? { groupBy: contentItem.groupingConfig.groupBy }
    //   : {}),
    // ...(contentItem.groupingConfig?.hue
    //   ? { hue: contentItem.groupingConfig.hue }
    //   : {}),
    // ...(contentItem.groupingConfig?.style
    //   ? { style: contentItem.groupingConfig.style }
    //   : {}),
  };

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
              search: searchParams,
            })
          }
        >
          View chart values
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={async () => {
            try {
              const query: Record<string, string | boolean> = {
                ...(contentItem.otherFilters ?? {}),
                detect_outliers: "iqr",
                include_unverified: includeUnverified ?? false,
                // ...(contentItem.groupingConfig?.groupBy
                //   ? { groupBy: contentItem.groupingConfig.groupBy }
                //   : {}),
                // ...(contentItem.groupingConfig?.hue
                //   ? { hue: contentItem.groupingConfig.hue }
                //   : {}),
                // ...(contentItem.groupingConfig?.style
                //   ? { style: contentItem.groupingConfig.style }
                //   : {}),
                type: "scalar",
                format: "csv",
              };

              const { data, error } = await diagnosticsListMetricValues({
                path: {
                  provider_slug: contentItem.provider,
                  diagnostic_slug: contentItem.diagnostic,
                },
                query,
                parseAs: "blob",
              });

              if (error) throw error;
              const filename = `${contentItem.provider}-${contentItem.diagnostic}-values.csv`;
              const downloadUrl = window.URL.createObjectURL(data as Blob);
              const a = document.createElement("a");
              a.href = downloadUrl;
              a.setAttribute("download", filename);
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(downloadUrl);
            } catch (err) {
              console.error("Download failed:", err);
              alert("Failed to download data. Please try again.");
            }
          }}
        >
          Download values (CSV)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
