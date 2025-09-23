import { useSuspenseQuery } from "@tanstack/react-query";
import { diagnosticsListExecutionGroupsOptions } from "@/client/@tanstack/react-query.gen";
import { FigureGallery } from "@/components/diagnostics/figureGallery";
import type { ExplorerCardContent } from "../types";

interface FigureGalleryContentProps {
  contentItem: Extract<ExplorerCardContent, { type: "figure-gallery" }>;
}

export function FigureGalleryContent({
  contentItem,
}: FigureGalleryContentProps) {
  const { data } = useSuspenseQuery(
    diagnosticsListExecutionGroupsOptions({
      path: {
        provider_slug: contentItem.provider,
        diagnostic_slug: contentItem.diagnostic,
      },
    }),
  );

  const executions = data.data.flatMap((group) => group.executions);

  return <FigureGallery executions={executions} />;
}
