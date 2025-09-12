import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorBoundary, ErrorFallback } from "../app";
import {
  ExplorerCardContent,
  ExplorerCardContentSkeleton,
} from "./explorerCardContent";
import type { ExplorerCard as ExplorerCardType } from "./types";

// import { ExplorerTooltip } from "./explorerTooltip";

interface ExplorerCardProps {
  card: ExplorerCardType;
}

// The ExplorerCard component renders a card with a header and content area.
// Each card may contain multiple content items, which are rendered using the ExplorerCardContent component.
export function ExplorerCard({ card }: ExplorerCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle>{card.title}</CardTitle>
            {card.description && (
              <CardDescription>{card.description}</CardDescription>
            )}
          </div>

          {/* Not working properly with TooltipProvider
          <div>
            <ExplorerTooltip
              contentItem={{
                title: card.title,
                description: card.description,
                content: card.content,
              }}
            />
          </div> */}
        </div>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
