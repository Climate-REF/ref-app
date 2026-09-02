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
 * A page's selection hides the other era, but never the values no era could be settled for.
 * Dropping those would silently lose data rather than label it.
 */
function visibleSections<T extends DimensionedData>(
  sections: { mipEra: MipEra | null; values: T[] }[],
  selected: MipEra | null,
) {
  if (!selected) return sections;
  return sections.filter(
    (section) => section.mipEra === selected || section.mipEra === null,
  );
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
  const sections = useMemo(() => splitByMipEra(values), [values]);
  const visible = visibleSections(sections, selectedMipEra);

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

  // A selected era is already named by the page's selector, so only the leftovers need a badge.
  const badged = visible.length > 1 || !selectedMipEra;

  return (
    <div className="space-y-8">
      {visible.map(({ mipEra, values: mipEraValues }) => (
        <section key={mipEra ?? "unattributed"} className="space-y-3">
          {badged && (visible.length > 1 || mipEra) ? (
            <Badge variant="outline">{mipEra ?? "MIP era not recorded"}</Badge>
          ) : null}
          <SampleSizeGate values={mipEraValues}>
            {children(mipEraValues, mipEra)}
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
