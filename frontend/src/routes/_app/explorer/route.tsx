import { createFileRoute, Outlet } from "@tanstack/react-router";

import { Card, CardContent } from "@/components/ui/card";

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
              diagnostics.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Thematic Areas: Curated entry points for common scientific
                topics (e.g., atmosphere, sea, land).
              </li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            Explore diagnostics by scientific theme. Select a theme to view
            relevant metrics and example analyses.
          </p>
        </CardContent>
      </Card>
      <Outlet />
    </div>
  );
};

export const Route = createFileRoute("/_app/explorer")({
  component: ExplorerLayout,
});
