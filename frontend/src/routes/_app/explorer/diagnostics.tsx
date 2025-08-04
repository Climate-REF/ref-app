import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card.tsx";

const Diagnostics = () => {
  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Browse diagnostics across providers, or jump directly from a theme
            or source. Open a diagnostic to see execution groups, runs, files,
            and metric values.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border p-4">
              <h3 className="font-medium">Search</h3>
              <p className="text-sm text-muted-foreground">
                Use the Diagnostics page to search by provider, slug, or
                keyword. Coming soon: inline search here.
              </p>
            </div>
            <div className="rounded-md border p-4">
              <h3 className="font-medium">Popular Themes</h3>
              <p className="text-sm text-muted-foreground">
                Not sure where to start? Try Atmosphere or Sea to see common
                diagnostics and metrics.
              </p>
            </div>
            <div className="rounded-md border p-4">
              <h3 className="font-medium">Next Steps</h3>
              <p className="text-sm text-muted-foreground">
                After selecting a diagnostic, review its Execution Groups, then
                open a group to view runs, files, logs, and metric values.
              </p>
            </div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Tip: Results reflect the latest available executions for each group.
          Older runs remain accessible in context.
        </div>
      </CardContent>
    </Card>
  );
};

export const Route = createFileRoute("/_app/explorer/diagnostics")({
  component: Diagnostics,
});
