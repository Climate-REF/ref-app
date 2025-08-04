"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { diagnosticsFacetsOptions } from "@/client/@tanstack/react-query.gen";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Route } from "@/routes/_app/explorer/sources";
import { SourceExplorerContent } from "./sourceExplorerContent";
import { SourceSelect } from "./sourceSelect.tsx";

export const SourceExplorer = () => {
  const { sourceId } = Route.useSearch();
  const { data } = useSuspenseQuery(diagnosticsFacetsOptions());

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-2">
          <label htmlFor="source-id-select" className="text-sm font-medium">
            Source ID
          </label>
          <p className="text-xs text-muted-foreground">
            Choose a model or dataset source. This will scope the explorer to results for the selected source.
          </p>
          {/* Wrap the select with an associated label using aria-labelledby for accessibility since SourceSelect doesn't accept id */}
          <div role="group" aria-labelledby="source-id-select-label">
            <SourceSelect options={data?.dimensions.source_id ?? []} />
          </div>
        </CardContent>
      </Card>

      {sourceId ? (
        <SourceExplorerContent sourceId={sourceId} />
      ) : (
        <div className="text-center text-sm text-muted-foreground">Please select a model to continue</div>
      )}
    </div>
  );
};
