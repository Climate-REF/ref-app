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
            different Earth system components and scientific themes.
          </p>

          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <h3 className="font-semibold text-foreground mb-2">
                What's Available
              </h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Thematic Areas:</strong> Curated entry points
                  organized by scientific domains (Atmosphere, Sea, Land, Earth
                  System, Impact & Adaptation)
                </li>
                <li>
                  <strong>Diagnostics:</strong> Standardized evaluation metrics
                  and analyses from multiple providers (PMP, ESMValTool, and
                  ILAMB/IOMB)
                </li>
                <li>
                  <strong>Visualizations:</strong> Interactive charts, time
                  series, spatial plots, and comparison views across CMIP6
                  models and observations. CMIP7 coming soon!
                </li>
                <li>
                  <strong>Model Comparisons:</strong> Side-by-side evaluation of
                  different models, experiments, and realizations
                </li>
              </ul>
            </div>

            <div className="text-sm text-muted-foreground">
              <h3 className="font-semibold text-foreground mb-2">How to Use</h3>
              <ol className="list-decimal pl-5 space-y-1">
                <li>
                  Select a <strong>Thematic Area</strong> that matches your
                  scientific interest
                </li>
                <li>Browse available metrics and diagnostics for that theme</li>
                <li>
                  Explore execution results with interactive visualizations
                </li>
                <li>
                  Compare model performance across different datasets and
                  experiments
                </li>
                <li>
                  Download figures and data for your own analysis and reporting
                  (example Jupyter notebooks coming soon)
                </li>
              </ol>
            </div>

            <div className="text-sm text-muted-foreground pt-4">
              <p>
                For detailed information about individual diagnostics, including
                methodology, validation data, and technical specifications,
                visit the{" "}
                <a
                  href="/diagnostics"
                  className="text-primary hover:underline font-medium"
                >
                  full diagnostic catalog →
                </a>
              </p>
            </div>

            <div className="text-sm text-muted-foreground border-t pt-4">
              <p>
                <strong>Note:</strong> This Data Explorer is under active
                development. We welcome your feedback, suggestions, and ideas
                for improvement.{" "}
                <a
                  href="https://github.com/Climate-REF/ref-app/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  Share your thoughts on GitHub →
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Outlet />
    </div>
  );
};

export const Route = createFileRoute("/_app/explorer")({
  component: ExplorerLayout,
  staticData: {
    title: "Data Explorer",
  },
});
