import { describe, expect, it } from "vitest";
import { STDDEV_MAX, taylorGeometry } from "./taylorGeometry";

const geometry = taylorGeometry({
  width: 500,
  height: 400,
  marginTop: 50,
  marginBottom: 50,
  marginLeft: 50,
  marginRight: 50,
});

describe("taylorGeometry", () => {
  it("puts the origin at the bottom left of the plot", () => {
    expect(geometry.center).toEqual({ x: 50, y: 350 });
  });

  it("fits the largest standard deviation into the smaller side of the plot", () => {
    expect(geometry.radius(0)).toBe(0);
    expect(geometry.radius(STDDEV_MAX)).toBe(300);
  });

  it("puts a perfect correlation on the x axis and none on the y axis", () => {
    const onX = geometry.point(1, 1);
    expect(onX.x).toBeCloseTo(50 + geometry.radius(1));
    expect(onX.y).toBeCloseTo(350);

    const onY = geometry.point(1, 0);
    expect(onY.x).toBeCloseTo(50);
    expect(onY.y).toBeCloseTo(350 - geometry.radius(1));
  });

  it("keeps a point at its standard deviation's distance from the origin", () => {
    const { x, y } = geometry.point(0.8, 0.6);
    expect(Math.hypot(x - 50, y - 350)).toBeCloseTo(geometry.radius(0.8));
  });
});
