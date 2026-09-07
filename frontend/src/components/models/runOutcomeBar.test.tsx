import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { RunCounts } from "@/client";
import { RunOutcomeBar } from "./runOutcomeBar";

const counts = (overrides: Partial<RunCounts> = {}): RunCounts => ({
  total: 10,
  successful: 7,
  failed: 2,
  running: 1,
  success_rate_percentage: 70,
  ...overrides,
});

describe("RunOutcomeBar", () => {
  it("shows successful against the total", () => {
    render(<RunOutcomeBar counts={counts()} />);
    expect(screen.getByText("7 / 10")).toBeInTheDocument();
  });

  it("draws a segment per outcome that occurred", () => {
    const { container } = render(<RunOutcomeBar counts={counts()} />);
    expect(container.querySelectorAll("[title]")).toHaveLength(3);
    expect(container.querySelector('[title="Failed: 2"]')).not.toBeNull();
  });

  it("leaves out an outcome that did not occur", () => {
    const { container } = render(
      <RunOutcomeBar
        counts={counts({ successful: 8, failed: 2, running: 0 })}
      />,
    );
    expect(container.querySelectorAll("[title]")).toHaveLength(2);
    expect(container.querySelector('[title="Running: 0"]')).toBeNull();
  });

  it("says so when the model has no runs", () => {
    render(
      <RunOutcomeBar
        counts={counts({
          total: 0,
          successful: 0,
          failed: 0,
          running: 0,
          success_rate_percentage: 0,
        })}
      />,
    );
    expect(screen.getByText("No runs")).toBeInTheDocument();
  });
  it("names every count for assistive technology", () => {
    render(<RunOutcomeBar counts={counts()} />);
    expect(
      screen.getByRole("img", {
        name: "10 execution groups: 7 successful, 2 failed, 1 running",
      }),
    ).toBeInTheDocument();
  });
});
