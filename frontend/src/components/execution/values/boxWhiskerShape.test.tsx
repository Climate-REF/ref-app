import { render } from "@testing-library/react";
import { scaleLinear } from "d3-scale";
import { describe, expect, it } from "vitest";
import { BoxWhiskerShape } from "./boxWhiskerShape";

describe("box whiskers", () => {
  it("extends outward to observations within the fences, leaving outliers as markers", () => {
    const values = [0, 10, 20, 30, 40, 50, 100];
    const scale = scaleLinear().domain([0, 100]).range([500, 0]);
    const { container } = render(
      <svg>
        <title>Box plot</title>
        <BoxWhiskerShape
          prefix="ensemble"
          scale={scale}
          x={20}
          width={40}
          fill="#8884d8"
          payload={{
            name: "one",
            groups: {
              ensemble: {
                min: 0,
                max: 100,
                lowerQuartile: 15,
                median: 30,
                upperQuartile: 45,
                values,
                points: values.map((value) => ({
                  id: value,
                  execution_id: 1,
                  execution_group_id: 1,
                  value,
                  dimensions: {},
                })),
              },
            },
          }}
        />
      </svg>,
    );
    const lines = container.querySelectorAll("line");
    // Q1=15 and Q3=45 give fences -30 and 90. Whiskers end at 0 and 50.
    expect(Number(lines[1].getAttribute("y1"))).toBe(scale(0));
    expect(Number(lines[1].getAttribute("y2"))).toBe(scale(15));
    expect(Number(lines[2].getAttribute("y1"))).toBe(scale(45));
    expect(Number(lines[2].getAttribute("y2"))).toBe(scale(50));
    expect(container.querySelectorAll("[data-box-point]")).toHaveLength(7);
  });
});
