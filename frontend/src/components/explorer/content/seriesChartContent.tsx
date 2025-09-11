import { useSuspenseQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { diagnosticsListMetricValuesOptions } from "@/client/@tanstack/react-query.gen";
import { SeriesVisualization } from "@/components/execution/values/series/seriesVisualization";
import type {
  MetricValueCollection,
  SeriesValue,
} from "@/components/execution/values/types";
import { isSeriesValue } from "@/components/execution/values/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copyButton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ExplorerCardContent } from "../types";

interface SeriesChartContentProps {
  contentItem: Extract<ExplorerCardContent, { type: "series-chart" }>;
}

export function SeriesChartContent({ contentItem }: SeriesChartContentProps) {
  const spanClass = contentItem.span === 2 ? "lg:col-span-2" : "lg:col-span-1";

  const { data } = useSuspenseQuery(
    diagnosticsListMetricValuesOptions({
      path: {
        provider_slug: contentItem.provider,
        diagnostic_slug: contentItem.diagnostic,
      },
      query: { ...contentItem.otherFilters },
    }),
  );

  // Extract series values from the data
  const collection = data as MetricValueCollection;
  const seriesValues = (collection?.data ?? []).filter(
    isSeriesValue,
  ) as SeriesValue[];

  // Create the template for this content item
  const contentTemplate = {
    type: contentItem.type,
    provider: contentItem.provider,
    diagnostic: contentItem.diagnostic,
    title: contentItem.title,
    ...(contentItem.description && {
      description: contentItem.description,
    }),
    ...(contentItem.metricUnits && {
      metricUnits: contentItem.metricUnits,
    }),
    ...(contentItem.otherFilters && {
      otherFilters: contentItem.otherFilters,
    }),
    ...(contentItem.seriesConfig && {
      seriesConfig: contentItem.seriesConfig,
    }),
    ...(contentItem.span && { span: contentItem.span }),
  };

  return (
    <div className={`${spanClass} relative group`}>
      <Card>
        <CardHeader>
          <CardTitle>{contentItem.title}</CardTitle>
          {contentItem.description && (
            <CardDescription>{contentItem.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {seriesValues.length > 0 ? (
            <SeriesVisualization
              seriesValues={seriesValues}
              initialGroupBy={contentItem.seriesConfig?.groupBy}
              initialHue={contentItem.seriesConfig?.hue}
              initialStyle={contentItem.seriesConfig?.style}
              maxSeriesLimit={100} // Limit for performance in preview
              maxLegendItems={10}
              enableZoom={false} // Disable zoom in preview
              maxVisibleGroups={5}
              hideControls={true} // Hide the groupBy/hue/style controls for explorer cards
            />
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
              <div className="text-center text-sm text-gray-500">
                <p>No series data available</p>
                <p className="text-xs mt-1">
                  This diagnostic may not have series data or filters may be too
                  restrictive
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="absolute top-2 right-2 p-1 bg-white/80 hover:bg-white rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <Info className="h-3 w-3 text-gray-600" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-md">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Series Chart Configuration</p>
              <CopyButton
                text={JSON.stringify(contentTemplate, null, 2)}
                label="Copy"
              />
            </div>
            <pre className="text-xs bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">
              {JSON.stringify(contentTemplate, null, 2)}
            </pre>
          </div>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
