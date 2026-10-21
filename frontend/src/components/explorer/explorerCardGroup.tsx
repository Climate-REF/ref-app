import { Suspense } from "react";
import { ErrorBoundary } from "../app";
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
    <>
      {card.content.map((contentItem) => (
        <ErrorBoundary
          key={`${card.title}:${contentItem.diagnostic}:${contentItem.title}`}
        >
          <Suspense fallback={<ExplorerCardContentSkeleton />}>
            <ExplorerCardContent contentItem={contentItem} />
          </Suspense>
        </ErrorBoundary>
      ))}
    </>
  );
}
