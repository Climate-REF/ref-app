import { Info } from "lucide-react";
import { Suspense } from "react";
import {
  DiagnosticFigureGalleryCard,
  DiagnosticFigureGalleryCardSkeleton,
} from "@/components/diagnostics/diagnosticFigureGalleryCard";
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
import type { ExplorerCardContent as ExplorerCardContentType } from "../../types";

interface ExplorerCardContentProps {
  contentItem: ExplorerCardContentType;
}

export function ExplorerCardContent({ contentItem }: ExplorerCardContentProps) {
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
    ...(contentItem.span && { span: contentItem.span }),
  };

  if (contentItem.type === "ensemble-chart") {
    return (
      <div className={`${spanClass} relative group`}>
        <Suspense fallback={<EnsembleChartCardSkeleton />}>
          <EnsembleChartCard
            providerSlug={contentItem.provider}
            diagnosticSlug={contentItem.diagnostic}
            metricName={contentItem.title}
            metricUnits={contentItem.metricUnits ?? "unitless"}
            title={contentItem.title}
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
                <p className="text-sm font-medium">Content Configuration</p>
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
        <Suspense fallback={<DiagnosticFigureGalleryCardSkeleton />}>
          <DiagnosticFigureGalleryCard
            providerSlug={contentItem.provider}
            diagnosticSlug={contentItem.diagnostic}
            title={contentItem.title}
            description={contentItem.description}
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
                <p className="text-sm font-medium">Content Configuration</p>
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
