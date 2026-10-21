import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCard } from "./statCard";

describe("StatCard", () => {
  it("shows the title, value and hint", () => {
    render(<StatCard title="Datasets" value="1,234" hint="56 files tracked" />);
    expect(screen.getByText("Datasets")).toBeInTheDocument();
    expect(screen.getByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("56 files tracked")).toBeInTheDocument();
  });

  it("shows a placeholder in place of the value while loading", () => {
    render(<StatCard title="Datasets" value="0" hint="Counted" loading />);
    expect(screen.getByText("...")).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    expect(screen.getByText("Counted")).toBeInTheDocument();
  });
});
