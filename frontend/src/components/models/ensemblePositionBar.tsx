import type { EnsembleComparison } from "@/client";

/** Place a value on the 0 to 100 scale spanning the ensemble's full range. */
function position(comparison: EnsembleComparison, value: number): number {
  const { min, max } = comparison.ensemble;
  const span = max - min;
  // Every model reported the same value, so there is no spread to place anything against.
  if (span === 0) return 50;
  return ((value - min) / span) * 100;
}

/**
 * A miniature box plot of the ensemble with this model marked on it.
 *
 * The scale is the ensemble's own min to max, so the marker says where the model sits
 * among its peers rather than on any absolute scale.
 */
export function EnsemblePositionBar({
  comparison,
}: {
  comparison: EnsembleComparison;
}) {
  const { ensemble } = comparison;
  const boxStart = position(comparison, ensemble.lower_quartile);
  const boxEnd = position(comparison, ensemble.upper_quartile);
  const median = position(comparison, ensemble.median);
  const model = position(comparison, comparison.model_value);

  return (
    <div
      className="relative h-6 w-40"
      title={`Model ${comparison.model_value.toPrecision(4)}, ensemble median ${ensemble.median.toPrecision(4)}`}
    >
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
      <div
        className="absolute top-1/2 h-3 -translate-y-1/2 rounded-sm bg-muted-foreground/25"
        style={{
          left: `${boxStart}%`,
          width: `${Math.max(boxEnd - boxStart, 0.5)}%`,
        }}
      />
      <div
        className="absolute top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-muted-foreground"
        style={{ left: `${median}%` }}
      />
      <div
        className={`absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background ${
          comparison.is_outlier ? "bg-destructive" : "bg-blue-500"
        }`}
        style={{ left: `${model}%` }}
      />
    </div>
  );
}
