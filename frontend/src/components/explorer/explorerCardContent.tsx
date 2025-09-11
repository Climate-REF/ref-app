import {
  EnsembleChartContent,
  FigureGalleryContent,
  SeriesChartContent,
} from "./content";
import type { ExplorerCardContent as ExplorerCardContentType } from "./types";

interface ExplorerCardContentProps {
  contentItem: ExplorerCardContentType;
}

export function ExplorerCardContent({ contentItem }: ExplorerCardContentProps) {
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
