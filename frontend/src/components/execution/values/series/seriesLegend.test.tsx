import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SeriesLegend } from "./seriesLegend";
import type { LegendItem } from "./utils";

const items: LegendItem[] = [
  { label: "Reference", color: "#000000", count: 1, isReference: true },
  { label: "CanESM5", color: "#4e79a7", count: 1, isReference: false },
];

/** The background colours of the legend's swatches, in the order they are listed */
function swatchColors(isDark: boolean, hidden: string[] = []) {
  const noop = () => {};
  const { container } = render(
    <SeriesLegend
      uniqueLabels={items}
      hiddenLabels={new Set(hidden)}
      hoveredLabel={null}
      soloedLabel={null}
      onToggleLabel={noop}
      onSetLabelsHidden={noop}
      onHoverLabel={noop}
      onSoloLabel={noop}
      onShowAll={noop}
      onHideAll={noop}
      groupByDimension={null}
      onGroupByDimensionChange={noop}
      availableDimensions={[]}
      labelDimensionMap={new Map()}
      isDark={isDark}
    />,
  );
  return Array.from(
    container.querySelectorAll<HTMLElement>(".rounded-sm.w-3"),
    (swatch) => swatch.style.backgroundColor,
  );
}

describe("SeriesLegend", () => {
  it("colours reference swatches like the reference line in each theme", () => {
    expect(swatchColors(false)).toEqual(["rgb(0, 0, 0)", "rgb(78, 121, 167)"]);
    expect(swatchColors(true)).toEqual([
      "rgb(255, 255, 255)",
      "rgb(78, 121, 167)",
    ]);
  });

  it("greys out hidden series", () => {
    expect(swatchColors(true, ["Reference"])[0]).toBe("rgb(156, 163, 175)");
  });
});
