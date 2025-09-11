import { Info } from "lucide-react";
import { Suspense } from "react";
import {
  EnsembleChartCard,
  EnsembleChartCardSkeleton,
} from "@/components/diagnostics/ensembleChartCard";
import { CopyButton } from "@/components/ui/copyButton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ExplorerCardContent } from "../types";

interface EnsembleChartContentProps {
  contentItem: Extract<ExplorerCardContent, { type: "ensemble-chart" }>;
}

export function EnsembleChartContent({
  contentItem,
}: EnsembleChartContentProps) {
  const spanClass = contentItem.span === 2 ? "lg:col-span-2" : "lg:col-span-1";

  console.log(contentItem);

  // Create the template for this content item
  const contentTemplate = {
    type: contentItem.type,
    provider: contentItem.provider,
    diagnostic: contentItem.diagnostic,
    title: contentItem.title,
    description: contentItem.description,
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
    ...(contentItem.span && { span: contentItem.span }),
  };

  return (
    <div className={`${spanClass} relative group`}>
      <Suspense fallback={<EnsembleChartCardSkeleton />}>
        <EnsembleChartCard
          providerSlug={contentItem.provider}
          diagnosticSlug={contentItem.diagnostic}
          metricName={contentItem.title}
          metricUnits={contentItem.metricUnits ?? "unitless"}
          title={contentItem.title}
          description={contentItem.description}
          xAxis={contentItem.xAxis}
          otherFilters={contentItem.otherFilters}
          clipMin={contentItem.clipMin}
          clipMax={contentItem.clipMax}
        />
      </Suspense>
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
