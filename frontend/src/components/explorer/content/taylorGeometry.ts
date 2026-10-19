import * as d3 from "d3";

/** The largest normalised standard deviation the diagram shows */
export const STDDEV_MAX = 1.6;
/** Normalised standard deviations drawn as quarter circles around the origin */
export const STDDEV_ARCS = [0.4, 0.8, 1.0, 1.2, 1.6];
/** Normalised standard deviations ticked on both axes */
export const STDDEV_TICKS = [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6];
/** Root mean square errors drawn as circles around the reference point */
export const RMSE_CONTOURS = [0.4, 0.8, 1.2, 1.6];
/** Correlations ticked on the outer arc */
export const CORRELATION_TICKS = [0.99, 0.95, 0.9, 0.8, 0.7, 0.6, 0.4];

export interface TaylorLayout {
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

interface Point {
  x: number;
  y: number;
}

/** Where things go on a Taylor diagram, with the origin at the bottom left */
export interface TaylorGeometry {
  center: Point;
  /** The pixel radius of a normalised standard deviation */
  radius: (stddev: number) => number;
  /** The pixel position of a standard deviation at a correlation, which is the angle from the x axis */
  point: (stddev: number, correlation: number) => Point;
}

export function taylorGeometry({
  width,
  height,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
}: TaylorLayout): TaylorGeometry {
  const plotRadius = Math.min(
    width - marginLeft - marginRight,
    height - marginTop - marginBottom,
  );
  const center = { x: marginLeft, y: height - marginBottom };
  const radius = d3
    .scaleLinear()
    .domain([0, STDDEV_MAX])
    .range([0, plotRadius]);
  return {
    center,
    radius,
    point: (stddev, correlation) => {
      // A correlation of 1 lies on the x axis and 0 on the y axis
      const angle = Math.acos(correlation);
      return {
        x: center.x + radius(stddev) * Math.cos(angle),
        y: center.y - radius(stddev) * Math.sin(angle),
      };
    },
  };
}
