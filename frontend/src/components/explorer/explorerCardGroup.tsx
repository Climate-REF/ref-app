import { Suspense } from "react";
import { ErrorBoundary } from "../app";
import {
  ExplorerCardContent,
  ExplorerCardContentSkeleton,
} from "./explorerCardContent";
import type { ExplorerCard as ExplorerCardType } from "./types";

interface ExplorerCardGroupProps {
  card: ExplorerCardType;
  /** The URL search namespace of each content item, in order */
  searchNamespaces: string[];
}

export function ExplorerCardGroup({
  card,
  searchNamespaces,
}: ExplorerCardGroupProps) {
  return (
    <>
      {card.content.map((contentItem, index) => (
        <ErrorBoundary
          key={`${card.title}:${contentItem.diagnostic}:${contentItem.title}`}
        >
          <Suspense fallback={<ExplorerCardContentSkeleton />}>
            <ExplorerCardContent
              contentItem={contentItem}
              searchNamespace={searchNamespaces[index]}
            />
          </Suspense>
        </ErrorBoundary>
      ))}
    </>
  );
}
