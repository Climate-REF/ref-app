import { describe, expect, it } from "vitest";
import {
  buildTooltipModel,
  formatDelta,
  formatXValue,
  formatYValue,
  ordinal,
  otherTooltipEntries,
} from "./canvasTooltip";
import type { NearestResult } from "./useSpatialIndex";

/** A point of series `seriesIndex` at x = 0 */
function entry(seriesIndex: number): NearestResult {
  return {
    point: {
      seriesIndex,
      dataIndex: 0,
      x: 0,
      y: seriesIndex,
      pixelX: 0,
      pixelY: seriesIndex,
    },
    metadata: {
      seriesIndex,
      label: `Series ${seriesIndex}`,
      color: "#4e79a7",
      isReference: false,
      dimensions: {},
    },
    distance: seriesIndex,
  };
}

/** `count` entries for series 0, 1, 2, ... */
function entries(count: number): NearestResult[] {
  return Array.from({ length: count }, (_, i) => entry(i));
}

describe("otherTooltipEntries", () => {
  it("lists every other series when they fit", () => {
    const allAtX = entries(5);
    const { others, remaining } = otherTooltipEntries(allAtX, allAtX[0]);
    expect(others.map((r) => r.metadata.seriesIndex)).toEqual([1, 2, 3, 4]);
    expect(remaining).toBe(0);
  });

  it("counts the series left out when the nearest is shown first", () => {
    const allAtX = entries(12);
    const { others, remaining } = otherTooltipEntries(allAtX, allAtX[0]);
    expect(others).toHaveLength(7);
    // 1 nearest + 7 others shown, 4 left out
    expect(remaining).toBe(4);
  });

  it("counts the series left out when the nearest is not among the first 8", () => {
    const allAtX = entries(12);
    const { others, remaining } = otherTooltipEntries(allAtX, allAtX[10]);
    expect(others.map((r) => r.metadata.seriesIndex)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
    expect(remaining).toBe(4);
  });

  it("counts every listed series as left out when the nearest is not in the list", () => {
    const { others, remaining } = otherTooltipEntries(entries(12), entry(20));
    expect(others).toHaveLength(7);
    expect(remaining).toBe(5);
  });
});

describe("buildTooltipModel", () => {
  /** A point of series `seriesIndex` with value `y` */
  function valued(seriesIndex: number, y: number, isReference = false) {
    const result = entry(seriesIndex);
    return {
      ...result,
      point: { ...result.point, y },
      metadata: { ...result.metadata, isReference },
    };
  }

  it("gives each series its difference from the reference", () => {
    const nearest = valued(0, 5);
    const reference = valued(1, 3, true);
    const other = valued(2, 1);
    const model = buildTooltipModel(nearest, [nearest, reference, other]);
    expect(model.delta).toBe(2);
    expect(
      model.others.map((other) => [
        other.entry.metadata.seriesIndex,
        other.delta,
      ]),
    ).toEqual([
      [1, null],
      [2, -2],
    ]);
  });

  it("gives no differences without a reference", () => {
    const allAtX = [valued(0, 5), valued(1, 3)];
    const model = buildTooltipModel(allAtX[0], allAtX);
    expect(model.delta).toBeNull();
    expect(model.others[0].delta).toBeNull();
  });

  it("gives the reference itself no difference", () => {
    const reference = valued(0, 3, true);
    const model = buildTooltipModel(reference, [reference, valued(1, 4)]);
    expect(model.delta).toBeNull();
    expect(model.others[0].delta).toBe(1);
  });

  it("ranks the nearest series by value, highest first", () => {
    const allAtX = [valued(0, 2), valued(1, 9), valued(2, 5)];
    expect(buildTooltipModel(allAtX[0], allAtX).rank).toBe(3);
    expect(buildTooltipModel(allAtX[1], allAtX).rank).toBe(1);
    expect(buildTooltipModel(allAtX[2], allAtX).rank).toBe(2);
  });

  it("counts the series left out of the list", () => {
    const allAtX = entries(10);
    const model = buildTooltipModel(allAtX[0], allAtX);
    expect(model.others).toHaveLength(7);
    expect(model.remaining).toBe(2);
  });
});

describe("formatXValue", () => {
  it("shows integer years without decimals", () => {
    expect(formatXValue(2021, "year")).toBe("2021");
    expect(formatXValue(1990, "Year")).toBe("1990");
  });

  it("shows integer months without decimals", () => {
    expect(formatXValue(6, "month")).toBe("6");
  });

  it("shows integer time values without decimals", () => {
    expect(formatXValue(42, "time")).toBe("42");
  });

  it("shows integer index values without decimals", () => {
    expect(formatXValue(0, "index")).toBe("0");
  });

  it("shows non-integer values with precision", () => {
    expect(formatXValue(2021.5, "year")).toBe("2021.50");
  });

  it("shows integer values for unknown axis names without decimals", () => {
    expect(formatXValue(100, "pressure_level")).toBe("100");
  });

  it("shows decimal values for unknown axes with precision", () => {
    expect(formatXValue(45.123, "latitude")).toBe("45.1230");
  });
});

describe("formatYValue", () => {
  it("formats normal values with 4 significant figures", () => {
    expect(formatYValue(1.234)).toBe("1.234");
    expect(formatYValue(42.56)).toBe("42.56");
    expect(formatYValue(0.5678)).toBe("0.5678");
  });

  it("formats very large values with scientific notation", () => {
    expect(formatYValue(1500000)).toBe("1.500e+6");
  });

  it("formats very small non-zero values with scientific notation", () => {
    expect(formatYValue(0.00012)).toBe("1.200e-4");
  });

  it("formats zero normally", () => {
    expect(formatYValue(0)).toBe("0.000");
  });

  it("formats negative values correctly", () => {
    expect(formatYValue(-2.345)).toBe("-2.345");
    expect(formatYValue(-0.00005)).toBe("-5.000e-5");
  });
});

describe("formatDelta", () => {
  it("shows positive deltas with + sign", () => {
    expect(formatDelta(0.5)).toBe("+0.500");
    expect(formatDelta(1.23)).toBe("+1.23");
  });

  it("shows negative deltas with - sign", () => {
    expect(formatDelta(-0.5)).toBe("-0.500");
    expect(formatDelta(-1.23)).toBe("-1.23");
  });

  it("shows zero delta with + sign", () => {
    expect(formatDelta(0)).toBe("+0.00");
  });

  it("uses scientific notation for large deltas", () => {
    expect(formatDelta(2500000)).toBe("+2.50e+6");
  });

  it("uses scientific notation for very small deltas", () => {
    expect(formatDelta(0.00005)).toBe("+5.00e-5");
    expect(formatDelta(-0.00003)).toBe("-3.00e-5");
  });
});

describe("ordinal", () => {
  it("formats 1st, 2nd, 3rd correctly", () => {
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(2)).toBe("2nd");
    expect(ordinal(3)).toBe("3rd");
  });

  it("formats 4th-20th with 'th'", () => {
    expect(ordinal(4)).toBe("4th");
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(12)).toBe("12th");
    expect(ordinal(13)).toBe("13th");
  });

  it("formats 21st, 22nd, 23rd correctly", () => {
    expect(ordinal(21)).toBe("21st");
    expect(ordinal(22)).toBe("22nd");
    expect(ordinal(23)).toBe("23rd");
  });

  it("formats 100th, 101st correctly", () => {
    expect(ordinal(100)).toBe("100th");
    expect(ordinal(101)).toBe("101st");
  });
});
