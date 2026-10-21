import * as d3 from "d3";
import { describe, expect, it } from "vitest";
import type { SeriesMetadata } from "../types";
import {
  orderSeriesForDraw,
  seriesLineColor,
  seriesStroke,
  xAxisTicks,
} from "./seriesCanvas";

function series(label: string, isReference = false): SeriesMetadata {
  return {
    seriesIndex: 0,
    label,
    color: "#4e79a7",
    isReference,
    dimensions: {},
  };
}

const labels = (metadata: SeriesMetadata[]) => metadata.map((m) => m.label);

describe("seriesLineColor", () => {
  it("uses the series colour for regular series", () => {
    expect(seriesLineColor(series("a"), false)).toBe("#4e79a7");
    expect(seriesLineColor(series("a"), true)).toBe("#4e79a7");
  });

  it("contrasts reference series with the background", () => {
    expect(seriesLineColor(series("ref", true), false)).toBe("#000000");
    expect(seriesLineColor(series("ref", true), true)).toBe("#FFFFFF");
  });
});

describe("orderSeriesForDraw", () => {
  it("draws hidden series first and the hovered series last", () => {
    const metadata = [series("hovered"), series("hidden"), series("plain")];
    const ordered = orderSeriesForDraw(
      metadata,
      new Set(["hidden"]),
      "hovered",
    );
    expect(labels(ordered)).toEqual(["hidden", "plain", "hovered"]);
  });

  it("draws reference series above regular ones", () => {
    const metadata = [series("ref", true), series("a"), series("b")];
    const ordered = orderSeriesForDraw(metadata, new Set(), null);
    expect(labels(ordered)).toEqual(["a", "b", "ref"]);
  });

  it("draws a hovered regular series above the reference", () => {
    const metadata = [series("a"), series("ref", true)];
    const ordered = orderSeriesForDraw(metadata, new Set(), "a");
    expect(labels(ordered)).toEqual(["ref", "a"]);
  });

  it("orders hidden series by hover and reference too", () => {
    const metadata = [
      series("hovered"),
      series("ref", true),
      series("a"),
      series("visible"),
    ];
    const hidden = new Set(["hovered", "ref", "a"]);
    const ordered = orderSeriesForDraw(metadata, hidden, "hovered");
    expect(labels(ordered)).toEqual(["a", "ref", "hovered", "visible"]);
  });

  it("keeps the given order otherwise and does not change it", () => {
    const metadata = [series("b"), series("a"), series("c")];
    expect(labels(orderSeriesForDraw(metadata, new Set(), null))).toEqual([
      "b",
      "a",
      "c",
    ]);
    expect(labels(metadata)).toEqual(["b", "a", "c"]);
  });
});

describe("seriesStroke", () => {
  const plain = { hidden: false, hovered: false };

  it("draws hidden series faint and grey, even when hovered", () => {
    const hidden = { hidden: true, hovered: true };
    expect(seriesStroke(series("a"), hidden, false)).toEqual({
      color: "#D1D5DB",
      width: 0.5,
      alpha: 0.15,
    });
    expect(seriesStroke(series("ref", true), hidden, true).color).toBe(
      "#4B5563",
    );
  });

  it("draws regular series thin and slightly transparent", () => {
    expect(seriesStroke(series("a"), plain, false)).toEqual({
      color: "#4e79a7",
      width: 1.5,
      alpha: 0.8,
    });
  });

  it("draws reference series bolder in the background's contrast colour", () => {
    expect(seriesStroke(series("ref", true), plain, true)).toEqual({
      color: "#FFFFFF",
      width: 3,
      alpha: 1,
    });
  });

  it("draws the hovered series thicker and opaque", () => {
    const hovered = { hidden: false, hovered: true };
    expect(seriesStroke(series("a"), hovered, false)).toEqual({
      color: "#4e79a7",
      width: 3.5,
      alpha: 1,
    });
    expect(seriesStroke(series("ref", true), hovered, false).width).toBe(5);
  });
});

describe("xAxisTicks", () => {
  it("leaves out fractional ticks on an integer axis", () => {
    const xScale = d3.scaleLinear().domain([2020, 2022]).range([0, 200]);
    expect(xAxisTicks(xScale, "year", false)).toEqual([
      { position: 0, label: "2020" },
      { position: 100, label: "2021" },
      { position: 200, label: "2022" },
    ]);
  });

  it("keeps fractional ticks on other axes", () => {
    const xScale = d3.scaleLinear().domain([0, 1]).range([0, 100]);
    const ticks = xAxisTicks(xScale, "latitude", false);
    expect(ticks).toHaveLength(11);
    expect(ticks[1]).toEqual({ position: 10, label: "0.100000" });
  });

  it("labels time ticks as dates", () => {
    // Built in local time, which the ticks are formatted in
    const xScale = d3
      .scaleTime()
      .domain([new Date(2020, 0, 1), new Date(2025, 0, 1)])
      .range([0, 500]);
    const ticks = xAxisTicks(xScale, "time", true);
    expect(ticks.map((t) => t.label)).toEqual([
      "2020",
      "2021",
      "2022",
      "2023",
      "2024",
      "2025",
    ]);
    expect(ticks[0].position).toBe(0);
    expect(ticks[5].position).toBe(500);
  });
});
