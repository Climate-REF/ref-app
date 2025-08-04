import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { SourceExplorer } from "@/components/explorer/sourceExplorer.tsx";
import { ThematicContent } from "@/components/explorer/thematicContent.tsx";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";

const Explorer = () => {
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <>
      <div>
        <Card className="md:col-span-2">
          <CardContent className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Data Explorer</h1>
            <p className="text-muted-foreground">
              Explore and visualize climate model evaluation diagnostics across
              different dimensions.
            </p>
            <div className="text-sm text-muted-foreground">
              <p className="mb-2">
                How to use: Start with a Thematic Area to discover relevant diagnostics, or browse Sources to
                focus on specific models and reference datasets. Switch to Diagnostics to search by provider/metric.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Thematic Areas: Curated entry points for common scientific topics (e.g., atmosphere, sea, land).
                </li>
                <li>
                  Sources: Filter and select target models and reference datasets to scope results.
                </li>
                <li>
                  Diagnostics: Browse and search diagnostics across providers, then open for details and results.
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <Tabs
          value={tab}
          className="space-y-4"
          onValueChange={(value) =>
            navigate({
              search: (prev: any) => ({ ...prev, tab: value }),
            })
          }
        >
          <TabsList className="w-full">
            <TabsTrigger value="themes">Thematic Areas</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          </TabsList>

          <TabsContent value="themes">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <p className="text-sm text-muted-foreground">
                  Explore diagnostics by scientific theme. Select a theme to view relevant metrics and example analyses.
                </p>
                <ThematicContent />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources" className="space-y-4">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <p className="text-sm text-muted-foreground">
                  Browse target models and reference datasets available in this instance. Use the controls to narrow by
                  project, experiment, or variable. Selecting a source will tailor diagnostics to your scope.
                </p>
                <SourceExplorer />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="diagnostics" className="space-y-4">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Browse diagnostics across providers, or jump directly from a theme or source. Open a diagnostic to
                    see execution groups, runs, files, and metric values.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-md border p-4">
                      <h3 className="font-medium">Search</h3>
                      <p className="text-sm text-muted-foreground">
                        Use the Diagnostics page to search by provider, slug, or keyword. Coming soon: inline search here.
                      </p>
                    </div>
                    <div className="rounded-md border p-4">
                      <h3 className="font-medium">Popular Themes</h3>
                      <p className="text-sm text-muted-foreground">
                        Not sure where to start? Try Atmosphere or Sea to see common diagnostics and metrics.
                      </p>
                    </div>
                    <div className="rounded-md border p-4">
                      <h3 className="font-medium">Next Steps</h3>
                      <p className="text-sm text-muted-foreground">
                        After selecting a diagnostic, review its Execution Groups, then open a group to view runs, files,
                        logs, and metric values.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Tip: Results reflect the latest available executions for each group. Older runs remain accessible in context.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

const explorerSchema = z.object({
  tab: z.enum(["themes", "sources", "diagnostics"]).default("themes"),
  theme: z
    .enum([
      "atmosphere",
      "earth-system",
      "impact-and-adaptation",
      "land",
      "sea",
    ])
    .default("atmosphere"),
  sourceId: z.string().optional(),
});

export const Route = createFileRoute("/_app/explorer")({
  component: Explorer,
  validateSearch: zodValidator(explorerSchema),
});
