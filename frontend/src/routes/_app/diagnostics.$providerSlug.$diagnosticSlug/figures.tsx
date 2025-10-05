import { createFileRoute } from "@tanstack/react-router";
import { FigureGallery } from "@/components/diagnostics/figureGallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Figures tab as nested route
export const Figures = () => {
  const { providerSlug, diagnosticSlug } = Route.useParams();
  return (
    <div className="space-y-4">
      <title>{`Figures - ${diagnosticSlug} - Climate REF`}</title>
      <Card>
        <CardHeader>
          <CardTitle>Figures Gallery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FigureGallery
            providerSlug={providerSlug}
            diagnosticSlug={diagnosticSlug}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/figures",
)({
  component: Figures,
});
