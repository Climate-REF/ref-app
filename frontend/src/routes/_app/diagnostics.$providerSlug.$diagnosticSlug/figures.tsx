import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { MipEraProvider } from "@/components/charts/mipEraContext";
import { MipEraSelector } from "@/components/charts/mipEraSelector";
import { FigureGallery } from "@/components/diagnostics/figureGallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mipEraSearchFields } from "@/lib/mipEras";

const figuresSchema = z.object(mipEraSearchFields);

// Figures tab as nested route
const Figures = () => {
  const { providerSlug, diagnosticSlug } = Route.useParams();
  const { mip_era: mipEra } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <div className="space-y-4">
      <title>{`Figures - ${diagnosticSlug} - Climate-REF`}</title>
      <Card>
        <CardHeader>
          <CardTitle>Figures Gallery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MipEraSelector
            mipEra={mipEra}
            onChange={(next) =>
              navigate({ search: (prev) => ({ ...prev, mip_era: next }) })
            }
          />
          <MipEraProvider mipEra={mipEra}>
            <FigureGallery
              providerSlug={providerSlug}
              diagnosticSlug={diagnosticSlug}
            />
          </MipEraProvider>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createFileRoute(
  "/_app/diagnostics/$providerSlug/$diagnosticSlug/figures",
)({
  component: Figures,
  validateSearch: zodValidator(figuresSchema),
});
