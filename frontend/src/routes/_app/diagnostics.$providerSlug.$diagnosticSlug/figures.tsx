import { createFileRoute } from "@tanstack/react-router";
import { DiagnosticFigureGallery } from "@/components/diagnostics/diagnosticFigureGallery";

// Figures tab as nested route
export const Figures = () => {
  const { providerSlug, diagnosticSlug } = Route.useParams();
  return (
    <div className="space-y-4">
      <DiagnosticFigureGallery
        providerSlug={providerSlug}
        diagnosticSlug={diagnosticSlug}
      />
    </div>
  );
};

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/figures",
)({
  component: Figures,
});
