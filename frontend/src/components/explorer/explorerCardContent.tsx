import type { ReferenceDatasetLink } from "@/client/types.gen";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
  EnsembleChartContent,
  FigureGalleryContent,
  SeriesChartContent,
  TaylorDiagramContentWrapper,
} from "./content";
import { ExplorerCardDropdown } from "./explorerCardDropdown";
import { ExplorerTooltip } from "./explorerTooltip";
import type { ExplorerCardContent as ExplorerCardContentType } from "./types";

interface ExplorerCardContentProps {
  contentItem: ExplorerCardContentType;
}

function ExplorerCardContentInner({ contentItem }: ExplorerCardContentProps) {
  if (contentItem.type === "box-whisker-chart") {
    return <EnsembleChartContent contentItem={contentItem} />;
  }

  if (contentItem.type === "figure-gallery") {
    return <FigureGalleryContent contentItem={contentItem} />;
  }

  if (contentItem.type === "series-chart") {
    return <SeriesChartContent contentItem={contentItem} />;
  }

  if (contentItem.type === "taylor-diagram") {
    return <TaylorDiagramContentWrapper contentItem={contentItem} />;
  }

  return null;
}

export const ExplorerCardContentSkeleton = () => {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-3/4 bg-gray-200 dark:bg-muted animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-64 bg-gray-200 dark:bg-muted animate-pulse" />
      </CardContent>
    </Card>
  );
};

// Main component to render different types of Explorer Card Content
// Each is a card in itself, but it is wrapped in a suspense and error boundary in the parent ExplorerCard component
export function ExplorerCardContent({ contentItem }: ExplorerCardContentProps) {
  const spanClass = contentItem.span === 2 ? "lg:col-span-2" : "lg:col-span-1";

  return (
    <div className={cn("relative group", spanClass)}>
      <Card
        className={cn(
          "h-full flex flex-col",
          contentItem.placeholder ? "border-red-500" : "",
        )}
      >
        <CardHeader className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <CardTitle>
              {contentItem.placeholder ? "PLACEHOLDER: " : ""}{" "}
              {contentItem.title}
            </CardTitle>
            <div className="min-h-8">
              {contentItem.description && (
                <CardDescription>{contentItem.description}</CardDescription>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <ExplorerTooltip contentItem={contentItem} showOnHover={true} />
            {contentItem.type === "box-whisker-chart" ||
            contentItem.type === "series-chart" ? (
              <ExplorerCardDropdown
                contentItem={contentItem}
                // Hardcode for now, may add a global toggle later
                includeUnverified={false}
              />
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="flex-auto flex flex-col justify-end">
          <ExplorerCardContentInner contentItem={contentItem} />
        </CardContent>
        <CardFooter className="min-h-8 flex-none flex-col items-start gap-2">
          {contentItem.interpretation && (
            <div className="text-sm text-muted-foreground">
              <span className="text-sm text-muted-foreground font-semibold">
                Interpretation:
              </span>{" "}
              {contentItem.interpretation}
            </div>
          )}
          {contentItem.referenceDatasets &&
            contentItem.referenceDatasets.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  Reference datasets:
                </span>
                {contentItem.referenceDatasets.map(
                  (ref: ReferenceDatasetLink) => (
                    <Tooltip key={ref.slug}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant={
                            ref.type === "primary" ? "outline" : "secondary"
                          }
                          className="text-xs cursor-help"
                        >
                          {ref.slug.split(".").pop()}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <div className="text-sm space-y-1">
                          <div className="font-semibold">{ref.slug}</div>
                          {ref.description && (
                            <div className="text-muted-foreground">
                              {ref.description}
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ),
                )}
              </div>
            )}
        </CardFooter>
      </Card>
    </div>
  );
}
