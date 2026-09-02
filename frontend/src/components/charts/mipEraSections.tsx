import { AlertTriangle, Info } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { MipEraEmptyState } from "@/components/charts/mipEraBar";
import { useSelectedMipEra } from "@/components/charts/mipEraContext";
import type { DimensionedData } from "@/components/explorer/grouping";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useStagingMode } from "@/hooks/useStagingMode";
import { MIN_MODELS_FOR_CHART, sampleSize, splitByMipEra } from "@/lib/mipEras";

interface MipEraSectionsProps<T extends DimensionedData> {
  values: T[];
  /** Rendered once per MIP era, with only that era's values. */
  children: (values: T[]) => ReactNode;
}

/**
 * Render a chart per MIP era, gated on how many models contributed.
 *
 * CMIP6 and CMIP7 never share a chart because the two ensembles are not directly comparable.
 */
export function MipEraSections<T extends DimensionedData>({
  values,
  children,
}: MipEraSectionsProps<T>) {
  const selectedMipEra = useSelectedMipEra();
  // Stable section identity keeps the charts from re-deriving on unrelated parent state.
  const visible = useMemo(() => {
    const sections = splitByMipEra(values);
    if (!selectedMipEra) return sections;
    // A selection hides the other era, but never values no era could be settled for. Dropping
    // those would lose data rather than label it.
    return sections.filter(
      (section) => section.mipEra === selectedMipEra || section.mipEra === null,
    );
  }, [values, selectedMipEra]);

  if (visible.length === 0) {
    return <MipEraEmptyState what="results" />;
  }

  return (
    <div className="space-y-8">
      {visible.map(({ mipEra, values: mipEraValues }) => (
        <section key={mipEra ?? "unattributed"} className="space-y-3">
          {/* A badge is what names an era, so it is dropped only for the one section the page
              itself already names. */}
          {mipEra !== selectedMipEra || visible.length > 1 ? (
            <Badge variant="outline">{mipEra ?? "MIP era not recorded"}</Badge>
          ) : null}
          <SampleSizeGate values={mipEraValues}>
            {children(mipEraValues)}
          </SampleSizeGate>
        </section>
      ))}
    </div>
  );
}

interface SampleSizeGateProps<T extends DimensionedData> {
  values: T[];
  children: ReactNode;
}

/**
 * Suppress a chart drawn from too few models, and warn when only a few contributed.
 *
 * Staging drops the suppression so a chart can be eyeballed before enough models have run,
 * and the banner at the top of the page is what says the floor is off.
 */
function SampleSizeGate<T extends DimensionedData>({
  values,
  children,
}: SampleSizeGateProps<T>) {
  const { models, enoughModels, sparseSample } = useMemo(
    () => sampleSize(values),
    [values],
  );
  const isStaging = useStagingMode();

  if (!enoughModels && !isStaging) {
    return (
      <Alert>
        <Info />
        <AlertTitle>Not enough models to plot</AlertTitle>
        <AlertDescription>
          {models === 1
            ? "Only 1 model has results here."
            : `Only ${models} models have results here.`}{" "}
          A chart is shown once at least {MIN_MODELS_FOR_CHART} models are
          available.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {sparseSample ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Small sample</AlertTitle>
          <AlertDescription>
            {models === 1 ? "Only 1 model has" : `Only ${models} models have`}{" "}
            results. The spread may not be indicative of the full ensemble.
          </AlertDescription>
        </Alert>
      ) : null}
      {children}
    </>
  );
}
