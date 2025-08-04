import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

const ExplorerLayout = () => {
  return (
    <div className="flex flex-col gap-4">
      <Card className="md:col-span-2">
        <CardContent className="space-y-6">
          <h1 className="text-3xl font-bold tracking-tight">Data Explorer</h1>
          <p className="text-muted-foreground">
            Explore and visualize climate model evaluation diagnostics across
            different dimensions.
          </p>
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              How to use: Start with a Thematic Area to discover relevant
              diagnostics, or browse Sources to focus on specific models and
              reference datasets. Switch to Diagnostics to search by
              provider/metric.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Thematic Areas: Curated entry points for common scientific
                topics (e.g., atmosphere, sea, land).
              </li>
              <li>
                Sources: Filter and select target models and reference datasets
                to scope results.
              </li>
              <li>
                Diagnostics: Browse and search diagnostics across providers,
                then open for details and results.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
      <Tabs defaultValue="themes" className="space-y-4">
        <TabsList className="w-full">
          <TabsTrigger value="themes" asChild>
            <Link to="/explorer/themes">Thematic Areas</Link>
          </TabsTrigger>
          <TabsTrigger value="sources" asChild>
            <Link to="/explorer/sources">Sources</Link>
          </TabsTrigger>
          <TabsTrigger value="diagnostics" asChild>
            <Link to="/explorer/diagnostics">Diagnostics</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Outlet />
    </div>
  );
};

export const Route = createFileRoute("/_app/explorer")({
  component: ExplorerLayout,
});
