import { Suspense } from "react";
import { ErrorBoundary, ErrorFallback } from "../app";
import {
  ExplorerCardContent,
  ExplorerCardContentSkeleton,
} from "./explorerCardContent";
import type { ExplorerCard as ExplorerCardType } from "./types";

interface ExplorerCardGroupProps {
  card: ExplorerCardType;
}

export function ExplorerCardGroup({ card }: ExplorerCardGroupProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {card.content.map((contentItem) => (
        <ErrorBoundary
          key={`${card.title}:${contentItem.diagnostic}`}
          fallback={<ErrorFallback />}
        >
          <Suspense fallback={<ExplorerCardContentSkeleton />}>
            <ExplorerCardContent contentItem={contentItem} />
          </Suspense>
        </ErrorBoundary>
      ))}
    </div>
  );
}
