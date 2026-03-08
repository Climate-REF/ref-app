import { describe, expect, it } from "vitest";
import {
  formatDelta,
  formatXValue,
  formatYValue,
  ordinal,
} from "./canvasTooltip";

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
