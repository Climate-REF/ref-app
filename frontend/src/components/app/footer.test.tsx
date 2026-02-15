import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "./footer";

describe("Footer", () => {
  it("renders without crashing", () => {
    render(<Footer />);
    expect(screen.getByText("Project Funders")).toBeInTheDocument();
    expect(screen.getByText("Development Partners")).toBeInTheDocument();
    expect(screen.getByText("Links")).toBeInTheDocument();
  });
});
