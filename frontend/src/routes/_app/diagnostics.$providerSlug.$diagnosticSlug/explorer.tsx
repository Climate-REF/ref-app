import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { Suspense } from "react";
import { explorerGetCollectionOptions } from "@/client/@tanstack/react-query.gen";
import type { AftCollectionCard } from "@/client/types.gen";
import { ErrorBoundary, ErrorFallback } from "@/components/app";
import {
  ExplorerCardContent,
  ExplorerCardContentSkeleton,
} from "@/components/explorer/explorerCardContent";
import { toExplorerCardContent } from "@/components/explorer/thematicContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Filter explorer cards to only content items matching a specific diagnostic,
 * then convert to frontend types.
 */
export function filterExplorerContentForDiagnostic(
  cards: AftCollectionCard[],
  providerSlug: string,
  diagnosticSlug: string,
) {
  return cards
    .flatMap((card) => card.content)
    .filter(
      (c) =>
        c.provider === providerSlug &&
        c.diagnostic === diagnosticSlug &&
        !c.placeholder,
    )
    .map(toExplorerCardContent);
}

const parentRoute = getRouteApi(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug",
);

const Explorer = () => {
  const { providerSlug, diagnosticSlug } = Route.useParams();
  const parentData = parentRoute.useLoaderData();

  const { data: collection } = useSuspenseQuery(
    explorerGetCollectionOptions({
      path: { collection_id: parentData.aft_link!.id },
    }),
  );

  const matchingContentItems = filterExplorerContentForDiagnostic(
    collection.explorer_cards,
    providerSlug,
    diagnosticSlug,
  );

  return (
    <div className="space-y-4">
      <title>{`Explorer - ${diagnosticSlug} - Climate REF`}</title>
      <Card>
        <CardHeader>
          <CardTitle>Explorer</CardTitle>
        </CardHeader>
        <CardContent>
          {matchingContentItems.length === 0 ? (
            <p className="text-muted-foreground">
              No explorer visualizations reference this diagnostic.
            </p>
          ) : (
            <TooltipProvider>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {matchingContentItems.map((contentItem) => (
                  <ErrorBoundary
                    key={contentItem.title}
                    fallback={<ErrorFallback />}
                  >
                    <Suspense fallback={<ExplorerCardContentSkeleton />}>
                      <ExplorerCardContent contentItem={contentItem} />
                    </Suspense>
                  </ErrorBoundary>
                ))}
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/explorer",
)({
  component: Explorer,
});
