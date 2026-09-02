import { AlertTriangle, Info } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { useSelectedMipEra } from "@/components/charts/mipEraContext";
import type { DimensionedData } from "@/components/explorer/grouping";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  MIN_FAMILIES_FOR_CONFIDENCE,
  MIN_MODELS_FOR_CHART,
  type MipEra,
  sampleSize,
  splitByMipEra,
} from "@/lib/mipEras";

interface MipEraSectionsProps<T extends DimensionedData> {
  values: T[];
  /** Rendered once per MIP era, with only that era's values. */
  children: (values: T[], mipEra: MipEra | null) => ReactNode;
}

/**
 * Render a chart per MIP era, gated on how many models contributed.
 *
 * CMIP6 and CMIP7 never share a chart because the two ensembles are not directly comparable.
 * A page that selects a MIP era narrows this to that era alone, so the badge and the stacking
 * fall away and the page's own selector carries the labelling.
 */
export function MipEraSections<T extends DimensionedData>({
  values,
  children,
}: MipEraSectionsProps<T>) {
  const selectedMipEra = useSelectedMipEra();
  // Stable section identity keeps the charts from re-deriving on unrelated parent state.
  const sections = useMemo(() => splitByMipEra(values), [values]);

  if (selectedMipEra) {
    const selected = sections.find(
      (section) => section.mipEra === selectedMipEra,
    );
    if (!selected) {
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
      <SampleSizeGate values={selected.values}>
        {children(selected.values, selectedMipEra)}
      </SampleSizeGate>
    );
  }

  if (sections.length === 0) return null;

  return (
    <div className="space-y-8">
      {sections.map(({ mipEra, values: eraValues }) => (
        <section key={mipEra ?? "unattributed"} className="space-y-3">
          {sections.length > 1 || mipEra ? (
            <Badge variant="outline">{mipEra ?? "MIP era not recorded"}</Badge>
          ) : null}
          <SampleSizeGate values={eraValues}>
            {children(eraValues, mipEra)}
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
