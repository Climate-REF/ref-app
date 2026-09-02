import { AlertTriangle, Info } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { useSelectedMipEra } from "@/components/charts/mipEraContext";
import type { DimensionedData } from "@/components/explorer/grouping";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  MIN_FAMILIES_FOR_CONFIDENCE,
  MIN_MODELS_FOR_CHART,
  sampleSize,
  splitByMipEra,
} from "@/lib/mipEras";

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
    if (!selectedMipEra) return null;
    return (
      <Alert>
        <Info />
        <AlertTitle>No {selectedMipEra} results</AlertTitle>
        <AlertDescription>
          This diagnostic has no {selectedMipEra} data yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      {visible.map(({ mipEra, values: mipEraValues }) => (
        <section key={mipEra ?? "unattributed"} className="space-y-3">
          {/* A badge is what names an era, so it is dropped only where nothing is ambiguous:
              the section the page's selector already names, or a lone unattributed one. */}
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
 * Suppress a chart drawn from too few models, and warn when too few families contributed.
 */
function SampleSizeGate<T extends DimensionedData>({
  values,
  children,
}: SampleSizeGateProps<T>) {
  const { models, families, enoughModels, sparseFamilies } = useMemo(
    () => sampleSize(values),
    [values],
  );

  if (!enoughModels) {
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
      {sparseFamilies ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Small and correlated sample</AlertTitle>
          <AlertDescription>
            These {models} models come from only {families}{" "}
            {families === 1 ? "family" : "families"}. Models sharing a family
            share code and biases, so fewer than {MIN_FAMILIES_FOR_CONFIDENCE}{" "}
            families is not a spread of independent evidence. Read the spread
            with care.
          </AlertDescription>
        </Alert>
      ) : null}
      {children}
    </>
  );
}
