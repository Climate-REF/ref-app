import { AlertTriangle, Info } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  MIN_FAMILIES_FOR_CONFIDENCE,
  MIN_MODELS_FOR_CHART,
  type MipEra,
  sampleSize,
  splitByEra,
} from "@/lib/modelEras";

type Dimensioned = {
  dimensions: { [key: string]: string };
  kind?: "model" | "reference";
};

interface EraSectionsProps<T extends Dimensioned> {
  values: T[];
  /** Rendered once per era, with only that era's values. */
  children: (values: T[], era: MipEra | null) => ReactNode;
}

/**
 * Render a chart once per MIP era, gated on how many models contributed.
 *
 * CMIP6 and CMIP7 get separate charts because the two ensembles are not directly comparable.
 */
export function EraSections<T extends Dimensioned>({
  values,
  children,
}: EraSectionsProps<T>) {
  const sections = splitByEra(values);

  if (sections.length === 0) return null;

  return (
    <div className="space-y-8">
      {sections.map(({ era, values: eraValues }) => (
        <section key={era ?? "unknown"} className="space-y-3">
          {era ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline">{era}</Badge>
            </div>
          ) : null}
          <SampleSizeGate values={eraValues}>
            {children(eraValues, era)}
          </SampleSizeGate>
        </section>
      ))}
    </div>
  );
}

interface SampleSizeGateProps<T extends Dimensioned> {
  values: T[];
  children: ReactNode;
}

/**
 * Suppress a chart drawn from too few models, and warn when too few families contributed.
 */
export function SampleSizeGate<T extends Dimensioned>({
  values,
  children,
}: SampleSizeGateProps<T>) {
  const { models, families, enoughModels, sparseFamilies } = sampleSize(values);

  if (!enoughModels) {
    return (
      <Alert>
        <Info />
        <AlertTitle>Not enough models to plot</AlertTitle>
        <AlertDescription>
          {models === 1
            ? "Only 1 model has results here."
            : `Only ${models} models have results here.`}{" "}
          A chart is shown once more than {MIN_MODELS_FOR_CHART} models are
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
