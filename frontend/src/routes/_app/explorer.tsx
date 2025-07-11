import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { MetricsExplorer } from "@/components/explorer/metricExplorer.tsx";
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
              different dimensions
            </p>
          </CardContent>
        </Card>
      </div>
      <div>
        <Tabs
          value={tab}
          className="space-y-4"
          onValueChange={(value) =>
            navigate({
              search: (prev) => ({ ...prev, tab: value }),
            })
          }
        >
          <TabsList className="w-full">
            <TabsTrigger value="themes">Thematic Areas</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          </TabsList>

          <TabsContent value="themes">
            <ThematicContent />
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <div />
          </TabsContent>

          <TabsContent value="diagnostics">
            <MetricsExplorer />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

const explorerSchema = z.object({
  tab: z.enum(["themes", "models", "diagnostics"]).default("themes"),
  theme: z
    .enum([
      "atmosphere",
      "earth-system",
      "impact-and-adaptation",
      "land",
      "sea",
    ])
    .default("atmosphere"),
});

export const Route = createFileRoute("/_app/explorer")({
  component: Explorer,
  validateSearch: zodValidator(explorerSchema),
  staticData: {},
});
