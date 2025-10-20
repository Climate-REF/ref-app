import { Check, Link2 } from "lucide-react";
import { Suspense, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
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

// Generate a URL-friendly ID from the card title
function generateCardId(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// The ExplorerCard component renders a card with a header and content area.
// Each card may contain multiple content items, which are rendered using the ExplorerCardContent component.
export function ExplorerCard({ card }: ExplorerCardProps) {
  const cardId = generateCardId(card.title);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    // Update the URL in the browser
    const newUrl = `${window.location.pathname}${window.location.search}#${cardId}`;
    window.history.pushState(null, "", newUrl);

    // Copy the full URL to clipboard
    const fullUrl = `${window.location.origin}${newUrl}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [cardId]);

  return (
    <Card id={cardId} className={cn(card.placeholder ? "border-red-500" : "")}>
      <CardHeader className="flex-none">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex-1">
            {card.placeholder && "PLACEHOLDER:"} {card.title}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyLink}
            className={cn(
              "h-8 w-8 shrink-0",
              copied && "text-green-600 dark:text-green-400",
            )}
            title={copied ? "Link copied!" : "Copy link to this card"}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="h-min-32">
          {card.description && (
            <CardDescription>{card.description}</CardDescription>
          )}
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
