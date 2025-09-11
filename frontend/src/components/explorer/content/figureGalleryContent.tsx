import { Suspense } from "react";
import {
  DiagnosticFigureGalleryCard,
  DiagnosticFigureGalleryCardSkeleton,
} from "@/components/diagnostics/diagnosticFigureGalleryCard";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CopyButton } from "@/components/ui/copyButton";
import { Info } from "lucide-react";
import type { ExplorerCardContent } from "../types";

interface FigureGalleryContentProps {
  contentItem: Extract<ExplorerCardContent, { type: "figure-gallery" }>;
}

export function FigureGalleryContent({
  contentItem,
}: FigureGalleryContentProps) {
  const spanClass = contentItem.span === 2 ? "lg:col-span-2" : "lg:col-span-1";

  // Create the template for this content item
  const contentTemplate = {
    type: contentItem.type,
    provider: contentItem.provider,
    diagnostic: contentItem.diagnostic,
    title: contentItem.title,
    ...(contentItem.description && {
      description: contentItem.description,
    }),
    ...(contentItem.span && { span: contentItem.span }),
  };

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
