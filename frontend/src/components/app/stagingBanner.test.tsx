import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { utilsAboutOptions } from "@/client/@tanstack/react-query.gen";
import { StagingBanner } from "./stagingBanner";

const renderBanner = (environment?: "production" | "staging") => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (environment) {
    queryClient.setQueryData(utilsAboutOptions().queryKey, {
      app_version: "0.0.0",
      ref_version: "0.0.0",
      last_updated: null,
      environment,
    });
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <StagingBanner />
    </QueryClientProvider>,
  );
};

describe("StagingBanner", () => {
  it("names a staging deployment", () => {
    renderBanner("staging");
    expect(screen.getByText(/Staging site/)).toBeInTheDocument();
  });

  it("stays out of the way in production", () => {
    renderBanner("production");
    expect(screen.queryByText(/Staging site/)).not.toBeInTheDocument();
  });

  it("stays out of the way before the API answers", () => {
    renderBanner();
    expect(screen.queryByText(/Staging site/)).not.toBeInTheDocument();
  });
});
