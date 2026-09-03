import { createFileRoute, Outlet } from "@tanstack/react-router";

import { PageHeader } from "@/components/app/pageHeader";
import { Card, CardContent } from "@/components/ui/card";
import DataHealthWarning from "@/content/data-health-warning.mdx";

/** What the explorer offers that the theme tabs and the catalog link do not already say. */
const EXPLORER_FEATURES = [
  {
    term: "Visualizations",
    detail:
      "Interactive charts, time series and spatial plots. One MIP era at a time, because CMIP6 and CMIP7 are not directly comparable.",
  },
  {
    term: "Model comparisons",
    detail: "Side by side across models, experiments and realizations.",
  },
];

// One line each, so the panel does not tower over the column beside it.
const STEPS = [
  "Pick a thematic area.",
  "Browse its diagnostics.",
  "Open a result to chart it.",
  "Download figures and data.",
];

const ExplorerLayout = () => {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="space-y-6 border-b pb-6">
        <PageHeader
          title="Data Explorer"
          description="Explore and visualize climate model evaluation diagnostics across different Earth system components and scientific themes."
          actions={
            <>
              <a
                href="/diagnostics"
                className="text-sm text-primary hover:underline font-medium whitespace-nowrap"
              >
                Full diagnostic catalog →
              </a>
              <a
                href="https://github.com/Climate-REF/ref-app/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline font-medium whitespace-nowrap"
              >
                Feedback on GitHub →
              </a>
            </>
          }
        />

        <div className="grid gap-8 md:grid-cols-[340px_minmax(0,1fr)]">
          <Card className="bg-muted/40 h-fit max-w-md">
            <CardContent className="space-y-4 py-2">
              <h2 className="font-semibold">Getting started</h2>
              <ol className="space-y-1.5 text-sm text-muted-foreground">
                {STEPS.map((step, index) => (
                  <li key={step} className="flex items-center gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <dl className="grid gap-x-8 gap-y-3 text-sm text-muted-foreground sm:grid-cols-2">
              {EXPLORER_FEATURES.map((item) => (
                <div key={item.term}>
                  <dt className="font-medium text-foreground">{item.term}</dt>
                  <dd>{item.detail}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Note: </span>
              <DataHealthWarning
                components={{
                  p(props: React.ComponentProps<"p">) {
                    return <span {...props} />;
                  },
                  // The note sits outside a prose block, so the link needs its own styling.
                  a(props: React.ComponentProps<"a">) {
                    return (
                      <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                      />
                    );
                  },
                }}
              />
            </p>
          </div>
        </div>
      </div>
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
