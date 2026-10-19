import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { utilsAboutOptions } from "@/client/@tanstack/react-query.gen";
import { Footer } from "./footer";

const renderFooter = (commit?: string | null) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (commit !== undefined) {
    queryClient.setQueryData(utilsAboutOptions().queryKey, {
      app_version: "0.0.0",
      commit,
      ref_version: "0.0.0",
      last_updated: null,
      environment: "staging",
    });
  }
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

  it("links the short commit the API was built from", () => {
    renderFooter("73fe8ce2eb575a04ea172d3b61c32fc82804a858");
    expect(screen.getByText("73fe8ce").closest("a")).toHaveAttribute(
      "href",
      "https://github.com/Climate-REF/ref-app/commit/73fe8ce2eb575a04ea172d3b61c32fc82804a858",
    );
  });

  it("hides the commit when the API has none", () => {
    renderFooter(null);
    expect(screen.queryByText("Commit")).not.toBeInTheDocument();
  });
});
