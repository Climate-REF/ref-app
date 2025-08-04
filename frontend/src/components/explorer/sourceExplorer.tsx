"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { diagnosticsFacetsOptions } from "@/client/@tanstack/react-query.gen";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Route } from "@/routes/_app/explorer";
import { SourceExplorerContent } from "./sourceExplorerContent";
import { SourceSelect } from "./sourceSelect.tsx";

export const SourceExplorer = () => {
  const { sourceId } = Route.useSearch();
  const { data } = useSuspenseQuery(diagnosticsFacetsOptions());

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <SourceSelect options={data?.dimensions.source_id ?? []} />
        </CardContent>
      </Card>

      {sourceId ? (
        <SourceExplorerContent sourceId={sourceId} />
      ) : (
        <div className="text-center">Please select a model to continue</div>
      )}
    </div>
  );
};
