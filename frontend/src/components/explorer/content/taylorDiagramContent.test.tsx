import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TaylorDiagramContent } from "./taylorDiagramContent";
import { CORRELATION_TICKS, RMSE_CONTOURS } from "./taylorGeometry";

const models = [
  { name: "CanESM5", stddev: 0.9, correlation: 0.8, color: "#4e79a7" },
  { name: "MIROC6", stddev: 1.2, correlation: 0.6 },
];

describe("TaylorDiagramContent", () => {
  it("draws a point per model, the RMSE contours and the correlation ticks", () => {
    const { container } = render(<TaylorDiagramContent models={models} />);
    const circles = container.querySelectorAll("svg > circle");
    expect(circles).toHaveLength(models.length);
    expect(container.querySelectorAll("g circle")).toHaveLength(
      RMSE_CONTOURS.length,
    );
    for (const corr of CORRELATION_TICKS) {
      expect(screen.getAllByText(String(corr)).length).toBeGreaterThan(0);
    }
  });

  it("clips each diagram's contours to its own clip path", () => {
    const { container } = render(
      <>
        <TaylorDiagramContent models={models} />
        <TaylorDiagramContent models={models} />
      </>,
    );
    const ids = Array.from(container.querySelectorAll("clipPath"), (c) => c.id);
    expect(new Set(ids).size).toBe(2);
    for (const group of container.querySelectorAll("g[clip-path]")) {
      expect(ids).toContain(
        group.getAttribute("clip-path")?.match(/url\(#(.*)\)/)?.[1],
      );
    }
  });

  it("names the hovered model in the tooltip", () => {
    const { container } = render(<TaylorDiagramContent models={models} />);
    fireEvent.mouseEnter(container.querySelectorAll("svg > circle")[1]);
    expect(screen.getByText("MIROC6")).toBeInTheDocument();
    expect(screen.getByText("0.600")).toBeInTheDocument();
  });

  it("explains an empty diagram", () => {
    render(<TaylorDiagramContent models={[]} />);
    expect(screen.getByText("No model data available")).toBeInTheDocument();
  });
});
