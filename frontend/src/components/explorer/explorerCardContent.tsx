import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  EnsembleChartContent,
  FigureGalleryContent,
  SeriesChartContent,
} from "./content";
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

  console.log("Rendering ExplorerCardContent:", contentItem);

  return (
    <div
      className={cn(
        "relative group",
        spanClass,
        contentItem.placeholder ? "border-red-500" : "",
      )}
    >
      <Card>
        <CardHeader>
          <CardTitle>
            {contentItem.placeholder ? "PLACEHOLDER: " : ""} {contentItem.title}
          </CardTitle>
          {contentItem.description && (
            <CardDescription>{contentItem.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <ExplorerCardContentInner contentItem={contentItem} />
        </CardContent>
        <CardFooter>
          {contentItem.interpretation && (
            <div className="text-sm text-muted-foreground">
              <span className="text-sm text-muted-foreground font-semibold">
                Interpretation:
              </span>{" "}
              {contentItem.interpretation}
            </div>
          )}
        </CardFooter>
      </Card>
      <ExplorerTooltip contentItem={contentItem} showOnHover={true} />
    </div>
  );
}
