import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, getRouteApi, Navigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { Suspense } from "react";
import { explorerGetCollectionOptions } from "@/client/@tanstack/react-query.gen";
import { ErrorBoundary, ErrorFallback } from "@/components/app";
import { MipEraScope } from "@/components/charts/mipEraBar";
import {
  ExplorerCardContent,
  ExplorerCardContentSkeleton,
} from "@/components/explorer/explorerCardContent";
import { filterExplorerContentForDiagnostic } from "@/components/explorer/thematicContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMipEra } from "@/hooks/useMipEra";
import { mipEraSearchSchema } from "@/lib/mipEras";

const parentRoute = getRouteApi(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug",
);

function ExplorerPanels({
  collectionId,
  providerSlug,
  diagnosticSlug,
}: {
  collectionId: string;
  providerSlug: string;
  diagnosticSlug: string;
}) {
  const { data: collection } = useSuspenseQuery(
    explorerGetCollectionOptions({
      path: { collection_id: collectionId },
    }),
  );

  const matchingContentItems = filterExplorerContentForDiagnostic(
    collection.explorer_cards,
    providerSlug,
    diagnosticSlug,
  );

  if (matchingContentItems.length === 0) {
    return (
      <p className="text-muted-foreground">
        No explorer visualizations reference this diagnostic.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {matchingContentItems.map((contentItem, index) => (
        <ErrorBoundary
          key={`${contentItem.type}:${contentItem.provider}:${contentItem.diagnostic}:${contentItem.title}:${index}`}
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

const Explorer = () => {
  const { providerSlug, diagnosticSlug } = Route.useParams();
  const { mip_era } = Route.useSearch();
  const { mipEra, setMipEra } = useMipEra(mip_era);
  const parentData = parentRoute.useLoaderData();

  if (!parentData.aft_link) {
    return (
      <Navigate
        to="/diagnostics/$providerSlug/$diagnosticSlug/figures"
        params={{ providerSlug, diagnosticSlug }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <title>{`Explorer (${mipEra}) - ${diagnosticSlug} - Climate-REF`}</title>
      <Card>
        <CardHeader>
          <CardTitle>Explorer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MipEraScope mipEra={mipEra} setMipEra={setMipEra}>
            <ExplorerPanels
              collectionId={parentData.aft_link.id}
              providerSlug={providerSlug}
              diagnosticSlug={diagnosticSlug}
            />
          </MipEraScope>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/explorer",
)({
  component: Explorer,
  validateSearch: zodValidator(mipEraSearchSchema),
});
