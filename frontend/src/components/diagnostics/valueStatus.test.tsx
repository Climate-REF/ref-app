import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ValueStatus } from "./valueStatus";

describe("ValueStatus", () => {
  it("shows the flag once it has loaded", () => {
    render(<ValueStatus available={true} />);
    expect(screen.getByText("● Available")).toBeInTheDocument();
  });

  it("shows the flag is still loading", () => {
    render(<ValueStatus available={null} />);
    expect(screen.getByText("Checking...")).toBeInTheDocument();
  });

  it("stops claiming to check once the flags failed to load", () => {
    render(<ValueStatus available={null} failed />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.queryByText("Checking...")).not.toBeInTheDocument();
  });
});
