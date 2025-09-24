import { FigureGallery } from "@/components/diagnostics/figureGallery";
import type { ExplorerCardContent } from "../types";

interface FigureGalleryContentProps {
  contentItem: Extract<ExplorerCardContent, { type: "figure-gallery" }>;
}

export function FigureGalleryContent({
  contentItem,
}: FigureGalleryContentProps) {
  return (
    <FigureGallery
      providerSlug={contentItem.provider}
      diagnosticSlug={contentItem.diagnostic}
    />
  );
}
