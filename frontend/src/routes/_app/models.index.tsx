import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { modelsListOptions } from "@/client/@tanstack/react-query.gen";
import { PageHeader } from "@/components/app/pageHeader";
import { MipEraEmptyState, MipEraScope } from "@/components/charts/mipEraBar";
import { ModelTable } from "@/components/models/modelTable";
import { RunOutcomeLegend } from "@/components/models/runOutcomeBar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMipEra } from "@/hooks/useMipEra";
import { mipEraSearchFields } from "@/lib/mipEras";

const ModelsSearchSchema = z.object({
  source_id_contains: z.string().optional(),
  ...mipEraSearchFields,
});

export const Route = createFileRoute("/_app/models/")({
  component: ModelsIndexPage,
  validateSearch: zodValidator(ModelsSearchSchema),
  staticData: {
    title: "Models",
  },
});

function ModelsIndexPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { mipEra, setMipEra } = useMipEra(search.mip_era);

  const { data, isLoading, error } = useQuery(
    modelsListOptions({
      query: {
        mip_era: mipEra,
        source_id_contains: search.source_id_contains || undefined,
      },
    }),
  );

  const models = data?.data ?? [];

  return (
    <div className="container mx-auto space-y-6 p-4">
      <PageHeader
        title="Models"
        description="Every model the REF has run, with how its executions turned out. Open one to see which diagnostics it failed and where it sits against the rest of the ensemble."
      />

      <Card>
        <CardContent className="space-y-4">
          <title>{`Models (${mipEra}) - Climate-REF`}</title>
          <MipEraScope mipEra={mipEra} setMipEra={setMipEra}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Input
                className="max-w-xs"
                placeholder="Filter by source_id"
                value={search.source_id_contains ?? ""}
                onChange={(event) =>
                  navigate({
                    search: {
                      ...search,
                      source_id_contains: event.target.value || undefined,
                    },
                  })
                }
              />
              <RunOutcomeLegend />
            </div>

            {error && (
              <div className="text-destructive">
                Error loading models: {String(error)}
              </div>
            )}
            {!isLoading && models.length === 0 && !search.source_id_contains ? (
              <MipEraEmptyState what="models" />
            ) : (
              <ModelTable models={models} loading={isLoading} />
            )}
          </MipEraScope>
        </CardContent>
      </Card>
    </div>
  );
}
