import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HEALTH, HealthDot } from "./health";

describe("HealthDot", () => {
  it("shows the health colour", () => {
    render(<HealthDot health="failed" />);
    const dot = screen.getByRole("img", { name: "All failing" });
    expect(dot).toHaveClass(HEALTH.failed.colour);
    expect(dot).not.toHaveClass("motion-safe:animate-swell");
  });

  it("goes grey and swells while pending, hiding the stale health", () => {
    render(<HealthDot health="failed" pending />);
    const dot = screen.getByRole("img", { name: "Updating" });
    expect(dot).toHaveClass(HEALTH.not_run.colour, "motion-safe:animate-swell");
    expect(dot).not.toHaveClass(HEALTH.failed.colour);
  });
});
