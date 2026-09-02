import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Footer } from "./footer";

const renderFooter = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Footer />
    </QueryClientProvider>,
  );
};

describe("Footer", () => {
  it("renders without crashing", () => {
    renderFooter();
    expect(screen.getByText("Project Funders")).toBeInTheDocument();
    expect(screen.getByText("Development Partners")).toBeInTheDocument();
    expect(screen.getByText("Links")).toBeInTheDocument();
  });

  it("shows the frontend version even without the API", () => {
    renderFooter();
    expect(screen.getByText("Explorer")).toBeInTheDocument();
    expect(screen.getByText(__APP_VERSION__)).toBeInTheDocument();
  });
});
