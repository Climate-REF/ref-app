import { Card, CardContent, CardHeader } from "../ui/card";
import {
  EnsembleChartContent,
  FigureGalleryContent,
  SeriesChartContent,
  TaylorDiagramContentWrapper,
} from "./content";
import { ExplorerCardFrame } from "./explorerCardFrame";
import type { ExplorerCardContent as ExplorerCardContentType } from "./types";

interface ExplorerCardContentProps {
  contentItem: ExplorerCardContentType;
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
// The charts with a menu frame themselves, as the menu acts on the values they query.
export function ExplorerCardContent({ contentItem }: ExplorerCardContentProps) {
  switch (contentItem.type) {
    case "box-whisker-chart":
      return <EnsembleChartContent contentItem={contentItem} />;
    case "series-chart":
      return <SeriesChartContent contentItem={contentItem} />;
    case "figure-gallery":
      return (
        <ExplorerCardFrame contentItem={contentItem}>
          <FigureGalleryContent contentItem={contentItem} />
        </ExplorerCardFrame>
      );
    case "taylor-diagram":
      return (
        <ExplorerCardFrame contentItem={contentItem}>
          <TaylorDiagramContentWrapper contentItem={contentItem} />
        </ExplorerCardFrame>
      );
  }
}
