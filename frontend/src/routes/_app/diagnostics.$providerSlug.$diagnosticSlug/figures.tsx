import { createFileRoute } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { MipEraBar } from "@/components/charts/mipEraBar";
import { MipEraProvider } from "@/components/charts/mipEraContext";
import { FigureGallery } from "@/components/diagnostics/figureGallery";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMipEra } from "@/hooks/useMipEra";
import { mipEraSearchFields } from "@/lib/mipEras";

const figuresSchema = z.object(mipEraSearchFields);

// Figures tab as nested route
const Figures = () => {
  const { providerSlug, diagnosticSlug } = Route.useParams();
  const { mip_era } = Route.useSearch();
  const { mipEra, setMipEra } = useMipEra(mip_era);
  return (
    <div className="space-y-4">
      <title>{`Figures (${mipEra}) - ${diagnosticSlug} - Climate-REF`}</title>
      <Card>
        <CardHeader>
          <CardTitle>Figures Gallery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <MipEraBar mipEra={mipEra} onChange={setMipEra} />
          <MipEraProvider mipEra={mipEra} setMipEra={setMipEra}>
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
