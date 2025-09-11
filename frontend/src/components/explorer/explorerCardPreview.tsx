import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CopyButton } from "@/components/ui/copyButton";
import { Info } from "lucide-react";
import type {
  ExplorerCard as ExplorerCardType,
  ExplorerCardContent,
} from "./types";
import type {
  MetricValue,
  SeriesValue,
} from "@/components/execution/values/types";
import { EnsembleChart } from "@/components/diagnostics/ensembleChart";
import { SeriesVisualization } from "@/components/execution/values/series/seriesVisualization";
import { isSeriesValue } from "@/components/execution/values/types";

interface ExplorerCardPreviewProps {
  card: ExplorerCardType;
  // Pass the actual data from the diagnostic page
  availableData?: (MetricValue | SeriesValue)[];
}

interface ContentPreviewProps {
  contentItem: ExplorerCardContent;
  availableData?: (MetricValue | SeriesValue)[];
}

function ContentPreview({
  contentItem,
  availableData = [],
}: ContentPreviewProps) {
  const spanClass = contentItem.span === 2 ? "lg:col-span-2" : "lg:col-span-1";

  // Create the template for this content item
  const contentTemplate = {
    type: contentItem.type,
    provider: contentItem.provider,
    diagnostic: contentItem.diagnostic,
    title: contentItem.title,
    ...(contentItem.type === "ensemble-chart" && {
      metricUnits: contentItem.metricUnits,
      xAxis: contentItem.xAxis,
      ...(contentItem.otherFilters && {
        otherFilters: contentItem.otherFilters,
      }),
      ...(contentItem.clipMin !== undefined && {
        clipMin: contentItem.clipMin,
      }),
      ...(contentItem.clipMax !== undefined && {
        clipMax: contentItem.clipMax,
      }),
    }),
    ...(contentItem.type === "figure-gallery" && {
      ...(contentItem.description && {
        description: contentItem.description,
      }),
    }),
    ...(contentItem.type === "series-chart" && {
      ...(contentItem.description && {
        description: contentItem.description,
      }),
      ...(contentItem.metricUnits && {
        metricUnits: contentItem.metricUnits,
      }),
      ...(contentItem.seriesConfig && {
        seriesConfig: contentItem.seriesConfig,
      }),
    }),
    ...(contentItem.span && { span: contentItem.span }),
  };

  if (contentItem.type === "ensemble-chart") {
    // Filter data for ensemble chart (scalar values only)
    const scalarData = availableData.filter(
      (item): item is MetricValue => !isSeriesValue(item)
    );

    return (
      <div className={`${spanClass} relative group`}>
        <Card>
          <CardHeader>
            <CardTitle>{contentItem.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {scalarData.length > 0 ? (
              <EnsembleChart
                data={scalarData}
                metricName={contentItem.title}
                metricUnits={contentItem.metricUnits ?? "unitless"}
                xAxis={contentItem.xAxis}
                clipMin={contentItem.clipMin}
                clipMax={contentItem.clipMax}
              />
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
                <div className="text-center text-sm text-gray-500">
                  <p>No ensemble data available</p>
                  <p className="text-xs mt-1">Preview with current page data</p>
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
                <p className="text-sm font-medium">
                  Ensemble Chart Configuration
                </p>
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

  if (contentItem.type === "figure-gallery") {
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
            <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
              <div className="text-center text-sm text-gray-500">
                <p>Figure Gallery Preview</p>
                <p className="text-xs mt-1">
                  Will show diagnostic plots and figures from{" "}
                  {contentItem.provider}/{contentItem.diagnostic}
                </p>
              </div>
            </div>
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
                <p className="text-sm font-medium">
                  Figure Gallery Configuration
                </p>
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

  if (contentItem.type === "series-chart") {
    // Filter data for series chart (series values only)
    const seriesData = availableData.filter(isSeriesValue);

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
            {seriesData.length > 0 ? (
              <SeriesVisualization
                seriesValues={seriesData}
                initialGroupBy={contentItem.seriesConfig?.groupBy}
                initialHue={contentItem.seriesConfig?.hue}
                initialStyle={contentItem.seriesConfig?.style}
                maxSeriesLimit={50} // Limit for performance in preview
                maxLegendItems={10}
                enableZoom={false} // Disable zoom in preview
                maxVisibleGroups={5}
              />
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-100 rounded">
                <div className="text-center text-sm text-gray-500">
                  <p>No series data available</p>
                  <p className="text-xs mt-1">
                    Preview with current page data - series config: Group:{" "}
                    {contentItem.seriesConfig?.groupBy || "none"} | Color:{" "}
                    {contentItem.seriesConfig?.hue || "none"} | Style:{" "}
                    {contentItem.seriesConfig?.style || "none"}
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
                <p className="text-sm font-medium">
                  Series Chart Configuration
                </p>
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

  return null;
}

export function ExplorerCardPreview({
  card,
  availableData,
}: ExplorerCardPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle>{card.title}</CardTitle>
            {card.description ? (
              <CardDescription>{card.description}</CardDescription>
            ) : null}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-md">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Card Configuration</p>
                  <CopyButton
                    text={JSON.stringify(
                      {
                        title: card.title,
                        description: card.description,
                        content: card.content,
                      },
                      null,
                      2
                    )}
                    label="Copy"
                  />
                </div>
                <pre className="text-xs bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">
                  {JSON.stringify(
                    {
                      title: card.title,
                      description: card.description,
                      content: card.content,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {card.content.map((contentItem) => (
            <ContentPreview
              key={`${card.title}:${contentItem.diagnostic}`}
              contentItem={contentItem}
              availableData={availableData}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
