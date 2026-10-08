import { act, fireEvent, render } from "@testing-library/react";
import { cloneElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { EnsembleChart } from "./ensembleChart";

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: ReactElement<{ width: number; height: number }>;
    }) => cloneElement(children, { width: 800, height: 500 }),
  };
});

let nextId = 0;
const point = (value: number, category: string, hue: string) => ({
  id: nextId++,
  execution_group_id: 1,
  execution_id: 1,
  value,
  dimensions: { category, hue },
});
function chart(data: ReturnType<typeof point>[], clipMax?: number) {
  return render(
    <EnsembleChart
      data={data}
      metricName="test"
      metricUnits="K"
      groupingConfig={{ groupBy: "category", hue: "hue" }}
      clipMax={clipMax}
    />,
  );
}
function markers(container: HTMLElement) {
  return [...container.querySelectorAll<SVGGElement>("[data-box-point]")];
}
// The chart wrapper sits at the page origin in jsdom, so page and chart coordinates match.
function position(marker: SVGGElement) {
  const x = Number(marker.dataset.x);
  const y = Number(marker.dataset.y);
  return { clientX: x, clientY: y, pageX: x, pageY: y };
}
function hover(container: HTMLElement, target: SVGGElement) {
  fireEvent.mouseMove(
    container.querySelector(".recharts-wrapper")!,
    position(target),
  );
}

describe("box plot selection", () => {
  it("selects the actual marker even when another subgroup median is closer", () => {
    const { container, getByText } = chart([
      point(10, "one", "A"),
      point(10, "one", "A"),
      point(90, "one", "A"),
      point(80, "one", "B"),
    ]);
    const target = markers(container).find(
      (m) => m.dataset.group === "A" && m.dataset.boxPoint === "2",
    )!;
    hover(container, target);
    expect(target.querySelector("path")).toHaveAttribute("stroke", "#EF4444");
    expect(getByText("Closest Data Point")).toBeInTheDocument();
    expect(container.querySelectorAll('[stroke="#EF4444"]')).toHaveLength(1);
    fireEvent.mouseLeave(container.querySelector(".recharts-wrapper")!);
    expect(container.querySelectorAll('[stroke="#EF4444"]')).toHaveLength(0);
  });
  it("only highlights the selected record across duplicate values and categories", () => {
    const { container } = chart([
      point(10, "one", "A"),
      point(10, "one", "A"),
      point(10, "two", "A"),
    ]);
    // Markers 0 and 1 share a position, so either may win, but only one may highlight.
    hover(container, markers(container)[1]);
    expect(container.querySelectorAll('[stroke="#EF4444"]')).toHaveLength(1);
    expect(
      markers(container)[2].querySelector('[stroke="#EF4444"]'),
    ).toBeNull();
  });
  it("updates selection after a throttled mouse move", () => {
    vi.useFakeTimers();
    try {
      const { container } = chart([
        point(10, "one", "A"),
        point(20, "one", "A"),
      ]);
      hover(container, markers(container)[0]);
      fireEvent.mouseMove(
        container.querySelector(".recharts-wrapper")!,
        position(markers(container)[1]),
      );
      act(() => vi.advanceTimersByTime(50));
      expect(markers(container)[1].querySelector("path")).toHaveAttribute(
        "stroke",
        "#EF4444",
      );
    } finally {
      vi.useRealTimers();
    }
  });
  it("selects a point during touch movement", () => {
    vi.useFakeTimers();
    try {
      const { container } = chart([
        point(10, "one", "A"),
        point(20, "one", "A"),
      ]);
      hover(container, markers(container)[0]);
      fireEvent.touchMove(container.querySelector(".recharts-wrapper")!, {
        changedTouches: [position(markers(container)[1])],
      });
      act(() => vi.advanceTimersByTime(50));
      expect(markers(container)[1].querySelector("path")).toHaveAttribute(
        "stroke",
        "#EF4444",
      );
    } finally {
      vi.useRealTimers();
    }
  });
  it("excludes clipped and non-finite records from selectable markers", () => {
    const { container } = chart(
      [
        point(50, "one", "A"),
        point(101, "one", "A"),
        point(Number.NaN, "one", "A"),
      ],
      100,
    );
    expect(markers(container)).toHaveLength(1);
    hover(container, markers(container)[0]);
    expect(container.querySelectorAll('[stroke="#EF4444"]')).toHaveLength(1);
    expect(container.textContent).not.toContain("101");
  });
});
