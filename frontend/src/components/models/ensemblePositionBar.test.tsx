import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EnsembleComparison } from "@/client";
import { EnsemblePositionBar } from "./ensemblePositionBar";

const comparison = (
  overrides: Partial<EnsembleComparison> = {},
): EnsembleComparison => ({
  diagnostic_id: 1,
  diagnostic_slug: "ecs",
  diagnostic_name: "Equilibrium Climate Sensitivity",
  provider_slug: "esmvaltool",
  dimensions: { metric: "ecs" },
  units: "K",
  model_value: 4,
  model_member_count: 1,
  ensemble: {
    count: 5,
    min: 2,
    lower_quartile: 3,
    median: 3.5,
    upper_quartile: 4.5,
    max: 6,
    mean: 3.8,
    std_dev: 1,
  },
  percentile: 60,
  z_score: 0.2,
  is_outlier: false,
  ...overrides,
});

/** The marker's left offset, as the percentage the component wrote inline. */
function markerLeft(container: HTMLElement): string | undefined {
  const marker = container.querySelector<HTMLElement>(".rounded-full");
  return marker?.style.left;
}

describe("EnsemblePositionBar", () => {
  it("places the model on the ensemble's min to max scale", () => {
    const { container } = render(
      <EnsemblePositionBar comparison={comparison()} />,
    );
    // 4 sits halfway between a min of 2 and a max of 6.
    expect(markerLeft(container)).toBe("50%");
  });

  it("centres the marker when every model reported the same value", () => {
    const { container } = render(
      <EnsemblePositionBar
        comparison={comparison({
          model_value: 3,
          ensemble: {
            count: 3,
            min: 3,
            lower_quartile: 3,
            median: 3,
            upper_quartile: 3,
            max: 3,
            mean: 3,
            std_dev: 0,
          },
        })}
      />,
    );
    expect(markerLeft(container)).toBe("50%");
  });

  it("marks an outlier in the destructive colour", () => {
    const { container } = render(
      <EnsemblePositionBar comparison={comparison({ is_outlier: true })} />,
    );
    expect(container.querySelector(".rounded-full")?.className).toContain(
      "bg-destructive",
    );
  });
});
