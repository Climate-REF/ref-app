import {
  Card,
  CardContent,
  CardDescription,
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
  if (contentItem.type === "ensemble-chart") {
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
          <ExplorerCardContentInner contentItem={contentItem} />
        </CardContent>
      </Card>
      <ExplorerTooltip contentItem={contentItem} showOnHover={true} />
    </div>
  );
}
